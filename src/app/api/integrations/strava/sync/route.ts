export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  refreshAccessToken,
  getAthleteActivities,
  getActivityStreams,
  isCyclingActivity,
} from "@/lib/strava-client";
import { importStravaActivity } from "@/lib/activity-importer";

// Max new activities to import per sync call to avoid serverless timeout
const MAX_NEW_PER_SYNC = 5;

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (!user?.strava?.connected) {
    return NextResponse.json({ error: "Strava non collegato" }, { status: 400 });
  }

  // Refresh token if expired
  let accessToken: string = user.strava.accessToken;
  if (Date.now() / 1000 > user.strava.expiresAt - 60) {
    const newTokens = await refreshAccessToken(user.strava.refreshToken);
    accessToken = newTokens.accessToken;
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          "strava.accessToken": newTokens.accessToken,
          "strava.refreshToken": newTokens.refreshToken,
          "strava.expiresAt": newTokens.expiresAt,
        },
      }
    );
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let hasMore = false;
  let page = 1;

  outer: while (true) {
    let activities;
    try {
      activities = await getAthleteActivities(accessToken, page);
    } catch (err) {
      if (err instanceof Error && err.message.includes("429")) {
        return NextResponse.json(
          { error: "Strava ha limitato le richieste. Riprova tra qualche minuto." },
          { status: 429 }
        );
      }
      throw err;
    }

    if (activities.length === 0) break;

    for (const activity of activities) {
      if (imported >= MAX_NEW_PER_SYNC) {
        hasMore = true;
        break outer;
      }

      if (!isCyclingActivity(activity.sport_type)) {
        skipped++;
        continue;
      }

      const stravaActivityId = String(activity.id);
      const existing = await db
        .collection("activities")
        .findOne({ stravaActivityId });
      if (existing) {
        skipped++;
        continue;
      }

      try {
        const streams = await getActivityStreams(accessToken, activity.id);
        await importStravaActivity(activity, streams, { userId, stravaActivityId });
        imported++;
      } catch (err) {
        console.error(`[Strava sync] Failed to import activity ${stravaActivityId}:`, err);
        errors++;
      }
    }

    // Strava returns fewer than per_page items when there are no more pages
    if (activities.length < 30) break;
    page++;
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { "strava.lastSyncAt": new Date() } }
  );

  console.log(
    `[Strava sync] userId=${userId} imported=${imported} skipped=${skipped} errors=${errors} hasMore=${hasMore}`
  );
  return NextResponse.json({ imported, skipped, errors, hasMore });
}

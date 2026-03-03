import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  refreshAccessToken,
  getWorkouts,
  getWorkout,
  downloadFitFile,
} from "@/lib/wahoo-client";
import { importFitBuffer } from "@/lib/activity-importer";

// Max new workouts to import per sync call to avoid serverless timeout
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

  if (!user?.wahoo?.connected) {
    return NextResponse.json({ error: "Wahoo not connected" }, { status: 400 });
  }

  // Refresh token if expired
  let accessToken: string = user.wahoo.accessToken;
  if (Date.now() / 1000 > user.wahoo.expiresAt - 60) {
    const newTokens = await refreshAccessToken(user.wahoo.refreshToken);
    accessToken = newTokens.accessToken;
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          "wahoo.accessToken": newTokens.accessToken,
          "wahoo.refreshToken": newTokens.refreshToken,
          "wahoo.expiresAt": newTokens.expiresAt,
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
    let result;
    try {
      result = await getWorkouts(accessToken, page);
    } catch (err) {
      if (err instanceof Error && err.message.includes("429")) {
        return NextResponse.json(
          { error: "Wahoo ha limitato le richieste. Riprova tra qualche minuto." },
          { status: 429 }
        );
      }
      throw err;
    }
    const workouts = result.workouts ?? [];
    if (workouts.length === 0) break;

    for (const workout of workouts) {
      // Stop if we've imported enough for this call
      if (imported >= MAX_NEW_PER_SYNC) {
        hasMore = true;
        break outer;
      }

      const wahooWorkoutId = String(workout.id);

      const existing = await db
        .collection("activities")
        .findOne({ wahooWorkoutId });
      if (existing) {
        skipped++;
        continue;
      }

      let fitUrl: string | null =
        workout.file?.url ?? workout.workout_summary?.file?.url ?? null;
      if (!fitUrl) {
        try {
          const detail = await getWorkout(accessToken, wahooWorkoutId);
          fitUrl = detail.file?.url ?? detail.workout_summary?.file?.url ?? null;
          if (!fitUrl) {
            console.warn(
              `[Wahoo sync] No FIT URL for workout ${wahooWorkoutId}. Detail keys: ${Object.keys(detail).join(", ")}`
            );
          }
        } catch (err) {
          console.error(`[Wahoo sync] getWorkout(${wahooWorkoutId}) error:`, err);
          errors++;
          continue;
        }
      }

      if (!fitUrl) {
        skipped++;
        continue;
      }

      try {
        const buffer = await downloadFitFile(fitUrl);
        await importFitBuffer(buffer, {
          userId,
          name:
            workout.name ||
            `Wahoo ${new Date(workout.starts).toLocaleDateString("it-IT")}`,
          wahooWorkoutId,
        });
        imported++;
      } catch (err) {
        console.error(
          `[Wahoo sync] Failed to import workout ${wahooWorkoutId}:`,
          err
        );
        errors++;
      }
    }

    if (page >= result.page_count) break;
    page++;
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { "wahoo.lastSyncAt": new Date() } }
  );

  console.log(
    `[Wahoo sync] userId=${userId} imported=${imported} skipped=${skipped} errors=${errors} hasMore=${hasMore}`
  );
  return NextResponse.json({ imported, skipped, errors, hasMore });
}

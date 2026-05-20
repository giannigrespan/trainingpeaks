export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getActivities, downloadFitFile } from "@/lib/garmin-client";
import { importFitBuffer } from "@/lib/activity-importer";

// Limit per sync call to stay within serverless function timeout
const MAX_NEW_PER_SYNC = 10;

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

  if (!user?.garmin?.connected) {
    return NextResponse.json({ error: "Garmin non connesso" }, { status: 400 });
  }

  const tokens = {
    accessToken: user.garmin.accessToken as string,
    accessTokenSecret: user.garmin.accessTokenSecret as string,
  };

  // Use last sync timestamp or default to 30 days ago
  const startTs: number =
    user.garmin.lastSyncTimestamp ??
    Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000);
  const endTs = Math.floor(Date.now() / 1000);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const activities = await getActivities(tokens, startTs, endTs);

    if (activities.length === 0) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { "garmin.lastSyncAt": new Date(), "garmin.lastSyncTimestamp": endTs } }
      );
      return NextResponse.json({ imported: 0, skipped: 0, errors: 0, hasMore: false });
    }

    // Batch-check which activities are already imported
    const activityIds = activities.map((a) => String(a.activityId));
    const existingDocs = await db
      .collection("activities")
      .find({ garminActivityId: { $in: activityIds } })
      .project({ garminActivityId: 1 })
      .toArray();
    const alreadyImported = new Set(existingDocs.map((d) => d.garminActivityId as string));

    const toImport = activities.filter((a) => !alreadyImported.has(String(a.activityId)));
    skipped = activities.length - toImport.length;

    const hasMore = toImport.length > MAX_NEW_PER_SYNC;
    const batch = toImport.slice(0, MAX_NEW_PER_SYNC);

    for (const activity of batch) {
      try {
        const buffer = await downloadFitFile(tokens, activity.activityId);
        await importFitBuffer(buffer, {
          userId,
          name:
            activity.activityName ||
            `Garmin ${format(new Date(activity.startTimeInSeconds * 1000), "d MMM yyyy")}`,
          garminActivityId: String(activity.activityId),
        });
        imported++;
      } catch (err) {
        console.error(`[Garmin sync] Failed to import activity ${activity.activityId}:`, err);
        errors++;
      }
    }

    // Only advance the sync window once the entire current batch is consumed
    const update: Record<string, unknown> = { "garmin.lastSyncAt": new Date() };
    if (!hasMore) update["garmin.lastSyncTimestamp"] = endTs;

    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(userId) }, { $set: update });

    console.log(
      `[Garmin sync] userId=${userId} imported=${imported} skipped=${skipped} errors=${errors} hasMore=${hasMore}`
    );
    return NextResponse.json({ imported, skipped, errors, hasMore });
  } catch (err) {
    console.error("[Garmin sync] Error:", err);
    return NextResponse.json(
      { error: "Errore durante la sincronizzazione Garmin" },
      { status: 500 }
    );
  }
}

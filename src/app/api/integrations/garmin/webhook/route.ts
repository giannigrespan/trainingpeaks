export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getDb } from "@/lib/mongodb";
import { downloadFitFile } from "@/lib/garmin-client";
import { importFitBuffer } from "@/lib/activity-importer";

/**
 * Garmin Health API push webhook.
 * Garmin POSTs activity summaries here when a user syncs their device.
 * Each summary contains the user's access token, which we use to look up
 * the user in our DB and then download + import the FIT file.
 *
 * Register this URL in the Garmin developer portal:
 *   https://trainingpeaks.vercel.app/api/integrations/garmin/webhook
 */
export async function POST(req: NextRequest) {
  let body: { activities?: GarminWebhookActivity[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const activities = body.activities ?? [];
  if (activities.length === 0) {
    return NextResponse.json({ success: true });
  }

  const db = await getDb();

  for (const activity of activities) {
    const { userAccessToken, activityId, activityName, startTimeInSeconds } = activity;
    if (!userAccessToken || !activityId) continue;

    // Find the user who owns this access token
    const user = await db
      .collection("users")
      .findOne({ "garmin.accessToken": userAccessToken });

    if (!user) {
      console.warn(`[Garmin webhook] Unknown access token — activity ${activityId} skipped`);
      continue;
    }

    const garminActivityId = String(activityId);

    const existing = await db.collection("activities").findOne({ garminActivityId });
    if (existing) continue;

    const tokens = {
      accessToken: user.garmin.accessToken as string,
      accessTokenSecret: user.garmin.accessTokenSecret as string,
    };

    try {
      const buffer = await downloadFitFile(tokens, activityId);
      await importFitBuffer(buffer, {
        userId: user._id.toString(),
        name:
          activityName ||
          `Garmin ${format(new Date((startTimeInSeconds ?? 0) * 1000), "d MMM yyyy")}`,
        garminActivityId,
      });

      await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: { "garmin.lastSyncAt": new Date() } });

      console.log(
        `[Garmin webhook] Imported activity ${garminActivityId} for user ${user._id}`
      );
    } catch (err) {
      console.error(
        `[Garmin webhook] Failed to import activity ${garminActivityId}:`,
        err
      );
    }
  }

  return NextResponse.json({ success: true });
}

interface GarminWebhookActivity {
  userAccessToken?: string;
  activityId?: number;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
}

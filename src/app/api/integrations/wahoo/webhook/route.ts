import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  refreshAccessToken,
  getWorkout,
  downloadFitFile,
} from "@/lib/wahoo-client";
import { importFitBuffer } from "@/lib/activity-importer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.event_type !== "workout_summary") {
      return NextResponse.json({ success: true });
    }

    const workoutSummary = body.workout_summary;
    if (!workoutSummary) {
      return NextResponse.json({ success: true });
    }

    const wahooWorkoutId = String(workoutSummary.id);
    const wahooUserId = String(workoutSummary.user_id);

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ "wahoo.wahooUserId": wahooUserId });

    if (!user) {
      console.warn(`[Wahoo webhook] No user found for wahooUserId: ${wahooUserId}`);
      return NextResponse.json({ success: true });
    }

    // Duplicate check
    const existing = await db
      .collection("activities")
      .findOne({ wahooWorkoutId });
    if (existing) {
      return NextResponse.json({ success: true });
    }

    // Refresh token if expired
    let accessToken: string = user.wahoo.accessToken;
    if (Date.now() / 1000 > user.wahoo.expiresAt - 60) {
      const newTokens = await refreshAccessToken(user.wahoo.refreshToken);
      accessToken = newTokens.accessToken;
      await db.collection("users").updateOne(
        { "wahoo.wahooUserId": wahooUserId },
        {
          $set: {
            "wahoo.accessToken": newTokens.accessToken,
            "wahoo.refreshToken": newTokens.refreshToken,
            "wahoo.expiresAt": newTokens.expiresAt,
          },
        }
      );
    }

    // Get FIT file URL (from payload or by fetching workout)
    let fitUrl: string | null = workoutSummary.file?.url ?? null;
    if (!fitUrl) {
      const workout = await getWorkout(accessToken, wahooWorkoutId);
      fitUrl = workout.file?.url ?? null;
    }

    if (!fitUrl) {
      console.warn(`[Wahoo webhook] No FIT file for workout ${wahooWorkoutId}`);
      return NextResponse.json({ success: true });
    }

    const buffer = await downloadFitFile(fitUrl);
    const workoutName =
      workoutSummary.name ||
      `Wahoo ${new Date().toLocaleDateString("it-IT")}`;

    await importFitBuffer(buffer, {
      userId: user._id.toString(),
      name: workoutName,
      wahooWorkoutId,
    });

    await db.collection("users").updateOne(
      { "wahoo.wahooUserId": wahooUserId },
      { $set: { "wahoo.lastSyncAt": new Date() } }
    );

    console.log(
      `[Wahoo webhook] Imported workout ${wahooWorkoutId} for user ${user._id}`
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Wahoo webhook] Error:", err);
    // Return 200 to prevent Wahoo from retrying endlessly
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}

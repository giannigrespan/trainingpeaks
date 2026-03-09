export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

/**
 * POST /api/admin/migrate-power-curve
 *
 * One-time migration: for every activity whose powerCurve is missing 180s
 * (3 min) and/or 900s (15 min), recompute them from the raw power stream
 * and patch the activity document.
 *
 * Safe to run multiple times — skips activities that already have both points.
 */

const TARGET_DURATIONS = [180, 900];

function bestPowerAt(power: number[], targetSec: number, samplingRate: number): number {
  const windowSize = Math.round(targetSec / samplingRate);
  if (windowSize < 1 || windowSize > power.length) return 0;
  let sum = 0;
  for (let i = 0; i < windowSize; i++) sum += power[i];
  let maxSum = sum;
  for (let i = windowSize; i < power.length; i++) {
    sum += power[i] - power[i - windowSize];
    if (sum > maxSum) maxSum = sum;
  }
  return Math.round(maxSum / windowSize);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 403 });
  }

  const db = await getDb();

  // Find activities missing at least one of the target durations
  const activities = await db
    .collection("activities")
    .find(
      { "powerCurve.0": { $exists: true } },
      { projection: { _id: 1, powerCurve: 1 } }
    )
    .toArray();

  let updated = 0;
  let skipped = 0;

  for (const act of activities) {
    const existing = new Set<number>((act.powerCurve as { duration: number }[]).map((p) => p.duration));
    const missing = TARGET_DURATIONS.filter((d) => !existing.has(d));
    if (missing.length === 0) { skipped++; continue; }

    const stream = await db
      .collection("activity_streams")
      .findOne({ activityId: act._id.toString() }, { projection: { power: 1, samplingRate: 1 } });

    if (!stream?.power?.length) { skipped++; continue; }

    const samplingRate: number = stream.samplingRate ?? 1;
    const newPoints = missing
      .map((d) => ({ duration: d, power: bestPowerAt(stream.power as number[], d, samplingRate) }))
      .filter((p) => p.power > 0);

    if (newPoints.length === 0) { skipped++; continue; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.collection("activities").updateOne(
      { _id: act._id },
      { $push: { powerCurve: { $each: newPoints } } } as any
    );
    updated++;
  }

  return NextResponse.json({ success: true, data: { updated, skipped, total: activities.length } });
}

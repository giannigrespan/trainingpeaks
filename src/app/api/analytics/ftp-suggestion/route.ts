import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// Standard durations (seconds) to look for in the power curve
const TARGET_DURATIONS = [1200, 1800]; // 20 min, 30 min

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = await getDb();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const activities = await db
    .collection("activities")
    .find({
      userId,
      activityDate: { $gte: ninetyDaysAgo },
      "powerCurve.0": { $exists: true },
    })
    .project({ name: 1, activityDate: 1, powerCurve: 1 })
    .toArray();

  let bestPower = 0;
  let bestDuration = 0;
  let bestActivity: { name: string; activityDate: Date } | null = null;

  for (const act of activities) {
    if (!Array.isArray(act.powerCurve)) continue;
    for (const target of TARGET_DURATIONS) {
      // Find the closest point to target duration
      const point = (act.powerCurve as { duration: number; power: number }[]).reduce(
        (best, p) =>
          Math.abs(p.duration - target) < Math.abs(best.duration - target) ? p : best,
        act.powerCurve[0] as { duration: number; power: number }
      );
      if (point && point.power > bestPower) {
        bestPower = point.power;
        bestDuration = point.duration;
        bestActivity = { name: act.name, activityDate: act.activityDate };
      }
    }
  }

  if (!bestActivity || bestPower === 0) {
    return NextResponse.json({ success: true, data: null });
  }

  // FTP = 95% of best 20-min power (or 93% of best 30-min)
  const factor = bestDuration <= 1200 ? 0.95 : 0.93;
  const suggestedFtp = Math.round(bestPower * factor);

  return NextResponse.json({
    success: true,
    data: {
      suggestedFtp,
      bestPower: Math.round(bestPower),
      bestDurationMinutes: Math.round(bestDuration / 60),
      activityName: bestActivity.name,
      activityDate: bestActivity.activityDate,
    },
  });
}

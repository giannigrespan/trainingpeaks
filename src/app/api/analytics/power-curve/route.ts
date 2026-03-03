import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// Standard durations to sample (seconds)
const DURATIONS = [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600];

function bestPowerAt(
  activities: { powerCurve: { duration: number; power: number }[] }[],
  target: number
): number {
  let best = 0;
  for (const act of activities) {
    if (!Array.isArray(act.powerCurve) || act.powerCurve.length === 0) continue;
    const point = act.powerCurve.reduce((b, p) =>
      Math.abs(p.duration - target) < Math.abs(b.duration - target) ? p : b
    );
    if (point.power > best) best = point.power;
  }
  return Math.round(best);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = await getDb();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const recentActivities = await db
    .collection("activities")
    .find({ userId, activityDate: { $gte: ninetyDaysAgo }, "powerCurve.0": { $exists: true } })
    .project({ powerCurve: 1 })
    .toArray();

  type ActivityWithCurve = { powerCurve: { duration: number; power: number }[] };

  const recentTyped: ActivityWithCurve[] = recentActivities.map((a) => ({
    powerCurve: a.powerCurve ?? [],
  }));

  const points = DURATIONS.map((d) => ({
    duration: d,
    recent: bestPowerAt(recentTyped, d),
  })).filter((p) => p.recent > 0);

  return NextResponse.json({ success: true, data: points });
}

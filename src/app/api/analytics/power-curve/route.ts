export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// Standard durations for the power curve chart (seconds)
const DURATIONS = [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800, 3600];

// Durations for the best-powers table (1m, 3m, 5m, 10m, 15m, 20m, 60m)
const BEST_POWER_DURATIONS = [60, 180, 300, 600, 900, 1200, 3600];

function bestPowerAt(
  activities: { powerCurve: { duration: number; power: number }[] }[],
  target: number
): number {
  let best = 0;
  for (const act of activities) {
    if (!Array.isArray(act.powerCurve) || act.powerCurve.length === 0) continue;
    // Only use a point if its duration is within 20% of the target
    const point = act.powerCurve.find((p) => p.duration === target);
    if (point && point.power > best) best = point.power;
  }
  return Math.round(best);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = await getDb();

  const scope = req.nextUrl.searchParams.get("scope");
  const isYtd = scope === "ytd";

  const since = isYtd
    ? new Date(new Date().getFullYear(), 0, 1) // 1 gennaio anno corrente
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const activities = await db
    .collection("activities")
    .find({ userId, activityDate: { $gte: since }, "powerCurve.0": { $exists: true } })
    .project({ powerCurve: 1 })
    .toArray();

  type ActivityWithCurve = { powerCurve: { duration: number; power: number }[] };
  const typed: ActivityWithCurve[] = activities.map((a) => ({ powerCurve: a.powerCurve ?? [] }));

  const durations = isYtd ? BEST_POWER_DURATIONS : DURATIONS;

  const points = durations
    .map((d) => ({
      duration: d,
      recent: bestPowerAt(typed, d),
    }))
    .filter((p) => p.recent > 0);

  return NextResponse.json({ success: true, data: points });
}

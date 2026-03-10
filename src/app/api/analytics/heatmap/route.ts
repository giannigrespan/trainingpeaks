export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export interface HeatmapCell {
  lat: number;
  lng: number;
  count: number;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const db = await getDb();

  // Get the 50 most recent activities with GPS for this user
  const activities = await db
    .collection("activities")
    .find({ userId })
    .sort({ activityDate: -1 })
    .limit(50)
    .project({ _id: 1 })
    .toArray();

  if (activities.length === 0) {
    return NextResponse.json({ success: true, cells: [], maxCount: 0, totalActivities: 0, totalCells: 0 });
  }

  const activityIds = activities.map((a) => a._id.toString());

  // Fetch GPS streams for those activities
  const streams = await db
    .collection("activity_streams")
    .find(
      { activityId: { $in: activityIds } },
      { projection: { lat: 1, lng: 1, activityId: 1 } }
    )
    .toArray();

  // Build frequency grid: round to 4 decimal places ≈ 11m × 11m cell
  // Count distinct activities per cell (not raw points)
  const cellMap = new Map<string, Set<string>>();

  for (const stream of streams) {
    const lats: number[] = stream.lat ?? [];
    const lngs: number[] = stream.lng ?? [];
    const n = Math.min(lats.length, lngs.length);

    for (let i = 0; i < n; i++) {
      const la = lats[i];
      const lo = lngs[i];
      if (
        isNaN(la) || isNaN(lo) ||
        (la === 0 && lo === 0) ||
        la < -90 || la > 90 ||
        lo < -180 || lo > 180
      ) continue;

      const key = `${la.toFixed(4)}_${lo.toFixed(4)}`;
      if (!cellMap.has(key)) cellMap.set(key, new Set());
      cellMap.get(key)!.add(stream.activityId);
    }
  }

  // Sort by frequency, return top 2000 cells
  const cells: HeatmapCell[] = [];
  Array.from(cellMap.entries()).forEach(([key, actIds]) => {
    const [latStr, lngStr] = key.split("_");
    cells.push({ lat: parseFloat(latStr), lng: parseFloat(lngStr), count: actIds.size });
  });
  cells.sort((a, b) => b.count - a.count);
  const top = cells.slice(0, 2000);
  const maxCount = top[0]?.count ?? 1;

  return NextResponse.json({
    success: true,
    cells: top,
    maxCount,
    totalActivities: activityIds.length,
    totalCells: cells.length,
  });
}

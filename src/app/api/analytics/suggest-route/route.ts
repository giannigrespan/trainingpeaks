export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const workoutId = req.nextUrl.searchParams.get("workoutId");
  if (!workoutId) return NextResponse.json({ success: false, error: "workoutId required" }, { status: 400 });

  const db = await getDb();

  // Load the workout to get its duration
  const workout = await db
    .collection("workouts")
    .findOne({ _id: new ObjectId(workoutId), userId });
  if (!workout) return NextResponse.json({ success: false }, { status: 404 });

  const workoutDuration: number = workout.totalDurationSeconds ?? 3600;

  // Calculate user's average speed (m/s) from their last 20 GPS activities
  const recentActivities = await db
    .collection("activities")
    .find({ userId, avgSpeed: { $gt: 0 }, distance: { $gt: 0 } })
    .sort({ activityDate: -1 })
    .limit(20)
    .project({ avgSpeed: 1, distance: 1 })
    .toArray();

  let avgSpeed = 7; // fallback: 7 m/s ≈ 25 km/h
  if (recentActivities.length > 0) {
    const totalSpeed = recentActivities.reduce((s, a) => s + (a.avgSpeed as number), 0);
    avgSpeed = totalSpeed / recentActivities.length;
  }

  const estimatedMeters = Math.round(workoutDuration * avgSpeed);

  // Find the activity whose distance is closest to the estimated distance
  // Only consider activities with GPS data (distance > 0)
  const activities = await db
    .collection("activities")
    .find({ userId, distance: { $gt: 0 } })
    .project({ _id: 1, name: 1, distance: 1, activityDate: 1 })
    .toArray();

  if (activities.length === 0) {
    return NextResponse.json({ success: false, error: "Nessuna attività GPS trovata" });
  }

  // Sort by distance delta from estimated
  activities.sort((a, b) =>
    Math.abs((a.distance as number) - estimatedMeters) - Math.abs((b.distance as number) - estimatedMeters)
  );
  const best = activities[0];

  // Load the GPS stream for that activity
  const stream = await db
    .collection("activity_streams")
    .findOne(
      { activityId: best._id.toString() },
      { projection: { lat: 1, lng: 1, altitude: 1, distance: 1, timestamp: 1 } }
    );

  if (!stream || !stream.lat || stream.lat.length === 0) {
    return NextResponse.json({ success: false, error: "Nessun tracciato GPS disponibile" });
  }

  return NextResponse.json({
    success: true,
    route: {
      lat: stream.lat,
      lng: stream.lng,
      altitude: stream.altitude ?? [],
      distance: stream.distance ?? [],
      timestamp: stream.timestamp ?? [],
    },
    sourceActivity: {
      id: best._id.toString(),
      name: best.name,
      distance: best.distance,
      date: best.activityDate,
    },
    estimatedDistance: estimatedMeters,
    avgSpeedKmh: Math.round(avgSpeed * 3.6 * 10) / 10,
  });
}

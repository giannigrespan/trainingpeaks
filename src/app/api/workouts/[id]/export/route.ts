export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { exportZwo, exportMrc, exportToFitCourse } from "@/lib/workout-exporter";
import type { Workout } from "@/types/workout";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const format = req.nextUrl.searchParams.get("format") ?? "zwo";

  const db = await getDb();
  const raw = await db.collection("workouts").findOne({ _id: new ObjectId(params.id), userId });
  if (!raw) return NextResponse.json({ success: false }, { status: 404 });

  const workout = raw as unknown as Workout;
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  const ftp: number = user?.ftp ?? 200;

  const safeName = workout.name.replace(/[^a-z0-9]/gi, "_");

  // FIT course export: find the suggested GPS route and encode it as a .fit course file
  if (format === "fit") {
    // Estimate distance from workout duration × user's average speed
    const totalDuration: number = (workout as unknown as { totalDurationSeconds: number }).totalDurationSeconds ?? 3600;
    const recentActivities = await db
      .collection("activities")
      .find({ userId, avgSpeed: { $gt: 0 } })
      .sort({ activityDate: -1 })
      .limit(20)
      .project({ avgSpeed: 1 })
      .toArray();
    let avgSpeed = 7; // m/s fallback (~25 km/h)
    if (recentActivities.length > 0) {
      avgSpeed = recentActivities.reduce((s, a) => s + (a.avgSpeed as number), 0) / recentActivities.length;
    }
    const estimatedMeters = totalDuration * avgSpeed;

    // Find closest-distance activity with GPS
    const candidates = await db
      .collection("activities")
      .find({ userId, distance: { $gt: 0 } })
      .project({ _id: 1, distance: 1 })
      .toArray();
    if (candidates.length === 0) {
      return NextResponse.json({ success: false, error: "Nessuna attività GPS disponibile" }, { status: 404 });
    }
    candidates.sort((a, b) => Math.abs((a.distance as number) - estimatedMeters) - Math.abs((b.distance as number) - estimatedMeters));
    const bestId = candidates[0]._id.toString();

    const stream = await db
      .collection("activity_streams")
      .findOne({ activityId: bestId }, { projection: { lat: 1, lng: 1, altitude: 1, distance: 1, timestamp: 1 } });
    if (!stream?.lat?.length) {
      return NextResponse.json({ success: false, error: "Nessun tracciato GPS disponibile" }, { status: 404 });
    }

    try {
      const fitBuffer = exportToFitCourse(
        stream.lat, stream.lng, stream.altitude ?? [], stream.distance ?? [], stream.timestamp ?? [], workout.name
      );
      return new NextResponse(fitBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${safeName}.fit"`,
        },
      });
    } catch (err) {
      return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
  }

  let content: string;
  let contentType: string;
  let filename: string;

  if (format === "mrc") {
    content = exportMrc(workout, ftp);
    contentType = "text/plain";
    filename = `${safeName}.mrc`;
  } else {
    content = exportZwo(workout);
    contentType = "application/xml";
    filename = `${safeName}.zwo`;
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

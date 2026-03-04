import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { totalDuration, estimateTSS } from "@/lib/workout-utils";
import type { WorkoutStep } from "@/types/workout";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const db = await getDb();

  const workouts = await db
    .collection("workouts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    success: true,
    data: workouts.map((w) => ({ ...w, _id: w._id.toString() })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { name, description, steps, source } = await req.json();

  if (!name || !Array.isArray(steps)) {
    return NextResponse.json({ success: false, error: "Dati mancanti" }, { status: 400 });
  }

  const typedSteps = steps as WorkoutStep[];
  const db = await getDb();
  const now = new Date();

  const result = await db.collection("workouts").insertOne({
    userId,
    name,
    description: description ?? "",
    sport: "cycling",
    steps: typedSteps,
    totalDurationSeconds: totalDuration(typedSteps),
    estimatedTSS: estimateTSS(typedSteps),
    source: source ?? "builder",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
}

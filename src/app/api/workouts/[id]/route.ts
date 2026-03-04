export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { totalDuration, estimateTSS } from "@/lib/workout-utils";
import type { WorkoutStep } from "@/types/workout";

type Ctx = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const db = await getDb();
  const workout = await db.collection("workouts").findOne({
    _id: new ObjectId(params.id),
    userId,
  });

  if (!workout) return NextResponse.json({ success: false }, { status: 404 });
  return NextResponse.json({ success: true, data: { ...workout, _id: workout._id.toString() } });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { name, description, steps } = await req.json();
  const typedSteps = steps as WorkoutStep[];

  const db = await getDb();
  await db.collection("workouts").updateOne(
    { _id: new ObjectId(params.id), userId },
    {
      $set: {
        name,
        description: description ?? "",
        steps: typedSteps,
        totalDurationSeconds: totalDuration(typedSteps),
        estimatedTSS: estimateTSS(typedSteps),
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const db = await getDb();
  await db.collection("workouts").deleteOne({ _id: new ObjectId(params.id), userId });
  return NextResponse.json({ success: true });
}

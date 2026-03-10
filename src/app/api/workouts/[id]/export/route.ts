export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { exportZwo, exportMrc } from "@/lib/workout-exporter";
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

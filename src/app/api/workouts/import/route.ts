import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { parseZwo } from "@/lib/zwo-parser";
import { parseMrc, mrcStepsToFtpPercent } from "@/lib/mrc-parser";
import { totalDuration, estimateTSS } from "@/lib/workout-utils";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ success: false, error: "File mancante" }, { status: 400 });

  const text = await file.text();
  const name = file.name.toLowerCase();

  const db = await getDb();

  // Fetch user FTP for MRC watt-to-percent conversion
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  const ftp: number = user?.ftp ?? 200;

  let parsed: { name: string; description: string; steps: ReturnType<typeof parseZwo>["steps"] };
  let source: "zwo" | "mrc";

  if (name.endsWith(".zwo") || text.trim().startsWith("<?xml") || text.includes("<workout_file")) {
    parsed = parseZwo(text);
    source = "zwo";
  } else {
    const mrc = parseMrc(text);
    parsed = {
      ...mrc,
      steps: mrcStepsToFtpPercent(mrc.steps, ftp),
    };
    source = "mrc";
  }

  if (parsed.steps.length === 0) {
    return NextResponse.json({ success: false, error: "Nessun blocco trovato nel file" }, { status: 422 });
  }

  const now = new Date();
  const result = await db.collection("workouts").insertOne({
    userId,
    name: parsed.name,
    description: parsed.description,
    sport: "cycling",
    steps: parsed.steps,
    totalDurationSeconds: totalDuration(parsed.steps),
    estimatedTSS: estimateTSS(parsed.steps),
    source,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
}

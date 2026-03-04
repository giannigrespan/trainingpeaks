import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { calculateNormalizedPower, calculateIntensityFactor, calculateTSS } from "@/lib/cycling-metrics";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") || "activityDate";
    const order = searchParams.get("order") === "asc" ? 1 : -1;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const db = await getDb();
    const userId = (session.user as { id: string }).id;

    const query: Record<string, unknown> = { userId };
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      query.activityDate = dateFilter;
    }

    const [activities, total] = await Promise.all([
      db
        .collection("activities")
        .find(query)
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("activities").countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: activities,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get activities error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nel caricamento attività" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const body = await req.json();

    const {
      name,
      sport = "cycling",
      source = "virtual",
      workoutId,
      durationSeconds,
      powerStream = [],
      activityDate,
    } = body;

    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const ftp: number = user?.ftp ?? 200;

    const np = powerStream.length > 0 ? calculateNormalizedPower(powerStream) : 0;
    const intensityFactor = calculateIntensityFactor(np, ftp);
    const tss = calculateTSS(durationSeconds, np, intensityFactor, ftp);
    const avgPower = powerStream.length > 0
      ? Math.round(powerStream.reduce((a: number, b: number) => a + b, 0) / powerStream.length)
      : 0;

    const now = new Date();
    const result = await db.collection("activities").insertOne({
      userId,
      name,
      sport,
      source,
      workoutId,
      activityDate: activityDate ? new Date(activityDate) : now,
      duration: durationSeconds,
      normalizedPower: np,
      avgPower,
      intensityFactor,
      tss,
      // Minimal fields for PMC contribution (distance/elevation not available for virtual)
      distance: 0,
      elevationGain: 0,
      calories: 0,
      createdAt: now,
    });

    return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } });
  } catch (error) {
    console.error("Save virtual activity error:", error);
    return NextResponse.json({ success: false, error: "Errore nel salvataggio" }, { status: 500 });
  }
}

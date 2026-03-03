import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { calculateZoneDistribution } from "@/lib/cycling-metrics";

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
    const activityId = searchParams.get("activityId");

    if (!activityId) {
      return NextResponse.json(
        { success: false, error: "activityId richiesto" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = (session.user as { id: string }).id;

    // Get user FTP
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email }, { projection: { ftp: 1 } });

    const ftp: number = (user?.ftp as number) || 0;
    if (!ftp) {
      return NextResponse.json({ success: true, data: { zones: [] } });
    }

    // Verify activity belongs to this user, then load its streams
    const activity = await db
      .collection("activities")
      .findOne({ _id: new ObjectId(activityId), userId }, { projection: { _id: 1 } });

    if (!activity) {
      return NextResponse.json({ success: true, data: { zones: [] } });
    }

    const streams = await db
      .collection("activity_streams")
      .findOne({ activityId });

    if (!streams?.power || (streams.power as number[]).length === 0) {
      return NextResponse.json({ success: true, data: { zones: [] } });
    }

    const zones = calculateZoneDistribution(streams.power as number[], ftp);

    return NextResponse.json({ success: true, data: { zones } });
  } catch (error) {
    console.error("Zones error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nel calcolo zone" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { calculatePMC } from "@/lib/cycling-metrics";
import { format, subDays, eachDayOfInterval } from "date-fns";

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
    const days = parseInt(searchParams.get("days") || "90");
    const userId = (session.user as { id: string }).id;

    const db = await getDb();
    const startDate = subDays(new Date(), days);

    const activities = await db
      .collection("activities")
      .find({
        userId,
        activityDate: { $gte: startDate },
      })
      .sort({ activityDate: 1 })
      .toArray();

    // Build daily TSS map
    const tssMap = new Map<string, number>();
    for (const a of activities) {
      const dateKey = format(new Date(a.activityDate), "yyyy-MM-dd");
      tssMap.set(dateKey, (tssMap.get(dateKey) || 0) + (a.tss || 0));
    }

    // Fill all days in range
    const allDays = eachDayOfInterval({ start: startDate, end: new Date() });
    const dailyTSS = allDays.map((d) => ({
      date: format(d, "yyyy-MM-dd"),
      tss: tssMap.get(format(d, "yyyy-MM-dd")) || 0,
    }));

    const pmc = calculatePMC(dailyTSS);

    return NextResponse.json({
      success: true,
      data: pmc,
    });
  } catch (error) {
    console.error("PMC error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nel calcolo PMC" },
      { status: 500 }
    );
  }
}

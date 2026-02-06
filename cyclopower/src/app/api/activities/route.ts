import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

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

    const db = await getDb();
    const userId = (session.user as { id: string }).id;

    const [activities, total] = await Promise.all([
      db
        .collection("activities")
        .find({ userId })
        .sort({ [sort]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("activities").countDocuments({ userId }),
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

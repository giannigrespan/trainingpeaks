import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const db = await getDb();
    const userId = (session.user as { id: string }).id;

    const activity = await db.collection("activities").findOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (!activity) {
      return NextResponse.json(
        { success: false, error: "Attività non trovata" },
        { status: 404 }
      );
    }

    const streams = await db.collection("activity_streams").findOne({
      activityId: params.id,
    });

    return NextResponse.json({
      success: true,
      data: { activity, streams },
    });
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nel caricamento attività" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const db = await getDb();
    const userId = (session.user as { id: string }).id;

    const result = await db.collection("activities").deleteOne({
      _id: new ObjectId(params.id),
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Attività non trovata" },
        { status: 404 }
      );
    }

    await db
      .collection("activity_streams")
      .deleteOne({ activityId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete activity error:", error);
    return NextResponse.json(
      { success: false, error: "Errore nell'eliminazione" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Non autorizzato" },
      { status: 401 }
    );
  }

  const userId = (session.user as { id: string }).id;
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  const strava = user?.strava;
  return NextResponse.json({
    success: true,
    data: {
      connected: !!strava?.connected,
      connectedAt: strava?.connectedAt ?? null,
      lastSyncAt: strava?.lastSyncAt ?? null,
    },
  });
}

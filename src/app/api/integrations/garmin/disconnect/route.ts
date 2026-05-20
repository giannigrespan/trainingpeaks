export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
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

  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $unset: { garmin: "" } });

  return NextResponse.json({ success: true });
}

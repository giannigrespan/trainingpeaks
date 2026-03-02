import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { deleteWebhook } from "@/lib/wahoo-client";

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
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });

  if (user?.wahoo?.webhookId && user?.wahoo?.accessToken) {
    try {
      await deleteWebhook(user.wahoo.accessToken, user.wahoo.webhookId);
    } catch (err) {
      console.warn("[Wahoo disconnect] Failed to delete webhook:", err);
    }
  }

  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $unset: { wahoo: "" } });

  return NextResponse.json({ success: true });
}

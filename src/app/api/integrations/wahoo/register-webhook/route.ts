import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { registerWebhook, refreshAccessToken } from "@/lib/wahoo-client";

const WAHOO_APP_URL = "https://trainingpeaks.vercel.app";

export async function POST(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non autorizzato" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

  if (!user?.wahoo?.connected) {
    return NextResponse.json({ success: false, error: "Wahoo non connesso" }, { status: 400 });
  }

  let accessToken: string = user.wahoo.accessToken;
  if (Date.now() / 1000 > user.wahoo.expiresAt - 60) {
    const newTokens = await refreshAccessToken(user.wahoo.refreshToken);
    accessToken = newTokens.accessToken;
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          "wahoo.accessToken": newTokens.accessToken,
          "wahoo.refreshToken": newTokens.refreshToken,
          "wahoo.expiresAt": newTokens.expiresAt,
        },
      }
    );
  }

  const webhookUrl = `${WAHOO_APP_URL}/api/integrations/wahoo/webhook`;
  const webhook = await registerWebhook(accessToken, webhookUrl);

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { "wahoo.webhookId": webhook.id, "wahoo.webhookSecret": webhook.secret ?? null } }
  );

  console.log(`[Wahoo] Webhook registered: id=${webhook.id} for user ${userId}`);
  return NextResponse.json({ success: true, webhookId: webhook.id });
}

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  exchangeCodeForTokens,
  getWahooUserId,
  registerWebhook,
} from "@/lib/wahoo-client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const WAHOO_APP_URL =
    process.env.NEXTAUTH_URL ?? "https://trainingpeaks-gianni-grespans-projects.vercel.app";
  const redirectBase = `${WAHOO_APP_URL}/settings`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=missing_params`);
  }

  try {
    let stateData: { userId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=invalid_state`);
    }

    const storedNonce = req.cookies.get("wahoo_oauth_nonce")?.value;
    if (!storedNonce || storedNonce !== stateData.nonce) {
      return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=csrf`);
    }

    const tokens = await exchangeCodeForTokens(code);
    const wahooUserId = await getWahooUserId(tokens.accessToken);

    const webhookUrl = `${WAHOO_APP_URL}/api/integrations/wahoo/webhook`;
    let webhookId: string | null = null;
    let webhookSecret: string | null = null;
    try {
      const webhook = await registerWebhook(tokens.accessToken, webhookUrl);
      webhookId = webhook.id;
      webhookSecret = webhook.secret ?? null;
    } catch (err) {
      console.warn("[Wahoo] Webhook registration failed (non-fatal):", err);
    }

    const db = await getDb();
    await db.collection("users").updateOne(
      { _id: new ObjectId(stateData.userId) },
      {
        $set: {
          wahoo: {
            connected: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            wahooUserId,
            webhookId,
            webhookSecret,
            connectedAt: new Date(),
            lastSyncAt: null,
          },
        },
      }
    );

    const response = NextResponse.redirect(`${redirectBase}?wahoo=connected`);
    response.cookies.delete("wahoo_oauth_nonce");
    return response;
  } catch (err) {
    console.error("[Wahoo] Callback error:", err);
    return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=server_error`);
  }
}

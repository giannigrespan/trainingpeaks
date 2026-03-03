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

  const WAHOO_APP_URL = "https://trainingpeaks.vercel.app";
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

    // Validate nonce from DB (domain-agnostic, works across preview/production).
    const db = await getDb();
    const nonceDoc = await db.collection("oauth_nonces").findOneAndDelete({
      userId: stateData.userId,
      nonce: stateData.nonce,
      expiresAt: { $gt: new Date() },
    });
    if (!nonceDoc) {
      return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=csrf`);
    }

    const tokens = await exchangeCodeForTokens(code);
    const wahooUserId = await getWahooUserId(tokens.accessToken);

    // Register webhook with Wahoo so it notifies us on new workouts.
    const webhookToken = crypto.randomUUID();
    await registerWebhook(tokens.accessToken, webhookToken);

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
            webhookSecret: webhookToken,
            connectedAt: new Date(),
            lastSyncAt: null,
          },
        },
      }
    );

    return NextResponse.redirect(`${redirectBase}?wahoo=connected`);
  } catch (err) {
    console.error("[Wahoo] Callback error:", err);
    return NextResponse.redirect(`${redirectBase}?wahoo=error&reason=server_error`);
  }
}

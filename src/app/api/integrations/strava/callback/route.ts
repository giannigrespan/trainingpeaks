export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { exchangeCodeForTokens } from "@/lib/strava-client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?strava=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?strava=error&reason=missing_params`);
  }

  try {
    let stateData: { userId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(`${redirectBase}?strava=error&reason=invalid_state`);
    }

    const db = await getDb();
    const nonceDoc = await db.collection("oauth_nonces").findOneAndDelete({
      userId: stateData.userId,
      nonce: stateData.nonce,
      expiresAt: { $gt: new Date() },
    });
    if (!nonceDoc) {
      return NextResponse.redirect(`${redirectBase}?strava=error&reason=csrf`);
    }

    const { tokens, athlete } = await exchangeCodeForTokens(code);

    await db.collection("users").updateOne(
      { _id: new ObjectId(stateData.userId) },
      {
        $set: {
          strava: {
            connected: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            stravaAthleteId: String(athlete.id),
            connectedAt: new Date(),
            lastSyncAt: null,
          },
        },
      }
    );

    return NextResponse.redirect(`${redirectBase}?strava=connected`);
  } catch (err) {
    console.error("[Strava] Callback error:", err);
    return NextResponse.redirect(`${redirectBase}?strava=error&reason=server_error`);
  }
}

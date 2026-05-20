export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getAccessToken } from "@/lib/garmin-client";

const SETTINGS_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const oauthToken = searchParams.get("oauth_token");
  const oauthVerifier = searchParams.get("oauth_verifier");
  const denied = searchParams.get("denied");

  if (denied) {
    return NextResponse.redirect(`${SETTINGS_URL}?garmin=error&reason=denied`);
  }

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(`${SETTINGS_URL}?garmin=error&reason=missing_params`);
  }

  try {
    const db = await getDb();

    // Retrieve and atomically delete the stored request token record
    const tokenDoc = await db.collection("garmin_request_tokens").findOneAndDelete({
      requestToken: oauthToken,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return NextResponse.redirect(`${SETTINGS_URL}?garmin=error&reason=invalid_token`);
    }

    const doc = tokenDoc as unknown as { requestTokenSecret: string; userId: string };
    const { requestTokenSecret, userId } = doc;

    const tokens = await getAccessToken(oauthToken, requestTokenSecret, oauthVerifier);

    // Store access tokens and set initial sync window to 30 days ago
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          garmin: {
            connected: true,
            accessToken: tokens.accessToken,
            accessTokenSecret: tokens.accessTokenSecret,
            connectedAt: new Date(),
            lastSyncAt: null,
            lastSyncTimestamp: Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000),
          },
        },
      }
    );

    return NextResponse.redirect(`${SETTINGS_URL}?garmin=connected`);
  } catch (err) {
    console.error("[Garmin] Callback error:", err);
    return NextResponse.redirect(`${SETTINGS_URL}?garmin=error&reason=server_error`);
  }
}

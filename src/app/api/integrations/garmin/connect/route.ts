export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getRequestToken, getAuthorizationUrl } from "@/lib/garmin-client";

const SETTINGS_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = (session.user as { id: string }).id;

  try {
    const { token, tokenSecret } = await getRequestToken();

    // Store the request token secret so the callback can exchange it.
    // TTL of 10 minutes — enough for the user to complete the OAuth flow.
    const db = await getDb();
    await db.collection("garmin_request_tokens").insertOne({
      requestToken: token,
      requestTokenSecret: tokenSecret,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return NextResponse.redirect(getAuthorizationUrl(token));
  } catch (err) {
    console.error("[Garmin] Connect error:", err);
    return NextResponse.redirect(`${SETTINGS_URL}?garmin=error&reason=request_token_failed`);
  }
}

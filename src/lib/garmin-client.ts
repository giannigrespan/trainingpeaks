import crypto from "crypto";

const GARMIN_API_BASE = "https://apis.garmin.com";
const GARMIN_OAUTH_BASE = "https://connectapi.garmin.com/oauth-service/oauth";
const GARMIN_AUTH_URL = "https://connect.garmin.com/oauthConfirm";

export interface GarminTokens {
  accessToken: string;
  accessTokenSecret: string;
}

export interface GarminActivity {
  activityId: number;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
}

// ─── OAuth 1.0a helpers ───────────────────────────────────────────────────────

/** RFC 3986 percent-encoding (stricter than encodeURIComponent) */
function pEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A");
}

function makeOAuthBase(extra: Record<string, string> = {}): Record<string, string> {
  return {
    oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...extra,
  };
}

/**
 * Compute HMAC-SHA1 OAuth signature.
 * allParams = OAuth params + query/body params (merged before signing).
 */
function computeSignature(
  method: string,
  baseUrl: string,
  allParams: Record<string, string>,
  consumerSecret: string,
  tokenSecret = ""
): string {
  const paramString = Object.entries(allParams)
    .sort(([a], [b]) => {
      const ea = pEncode(a);
      const eb = pEncode(b);
      return ea < eb ? -1 : ea > eb ? 1 : 0;
    })
    .map(([k, v]) => `${pEncode(k)}=${pEncode(v)}`)
    .join("&");

  const base = [method.toUpperCase(), pEncode(baseUrl), pEncode(paramString)].join("&");
  const key = `${pEncode(consumerSecret)}&${pEncode(tokenSecret)}`;
  return crypto.createHmac("sha1", key).update(base).digest("base64");
}

function buildAuthHeader(oauthParams: Record<string, string>): string {
  return (
    "OAuth " +
    Object.entries(oauthParams)
      .map(([k, v]) => `${pEncode(k)}="${pEncode(v)}"`)
      .join(", ")
  );
}

// ─── OAuth token-exchange requests (no query params, POST only) ───────────────

async function tokenRequest(
  url: string,
  extra: Record<string, string>,
  tokenSecret = ""
): Promise<string> {
  const params = makeOAuthBase(extra);
  params.oauth_signature = computeSignature(
    "POST",
    url,
    params,
    process.env.GARMIN_CONSUMER_SECRET!,
    tokenSecret
  );

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: buildAuthHeader(params) },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Garmin token request failed ${res.status}: ${body}`);
  }
  return res.text();
}

// ─── Public OAuth flow ────────────────────────────────────────────────────────

export async function getRequestToken(): Promise<{
  token: string;
  tokenSecret: string;
}> {
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://trainingpeaks.vercel.app"}/api/integrations/garmin/callback`;
  const body = await tokenRequest(`${GARMIN_OAUTH_BASE}/request_token`, {
    oauth_callback: callbackUrl,
  });
  const p = new URLSearchParams(body);
  const token = p.get("oauth_token");
  const tokenSecret = p.get("oauth_token_secret");
  if (!token || !tokenSecret) throw new Error(`Invalid request token response: ${body}`);
  return { token, tokenSecret };
}

export function getAuthorizationUrl(requestToken: string): string {
  return `${GARMIN_AUTH_URL}?oauth_token=${requestToken}`;
}

export async function getAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<GarminTokens> {
  const body = await tokenRequest(
    `${GARMIN_OAUTH_BASE}/access_token`,
    { oauth_token: requestToken, oauth_verifier: verifier },
    requestTokenSecret
  );
  const p = new URLSearchParams(body);
  const accessToken = p.get("oauth_token");
  const accessTokenSecret = p.get("oauth_token_secret");
  if (!accessToken || !accessTokenSecret)
    throw new Error(`Invalid access token response: ${body}`);
  return { accessToken, accessTokenSecret };
}

// ─── Authenticated API requests ───────────────────────────────────────────────

/**
 * Sign and send a request to the Garmin Wellness API.
 * Query params are included in the OAuth signature AND appended to the URL.
 * Retries up to 3 times on 429 with exponential back-off.
 */
async function apiFetch(
  method: string,
  path: string,
  tokens: GarminTokens,
  query: Record<string, string> = {}
): Promise<Response> {
  const baseUrl = `${GARMIN_API_BASE}${path}`;
  const fullUrl = Object.keys(query).length
    ? `${baseUrl}?${new URLSearchParams(query)}`
    : baseUrl;

  const attempt = (): Promise<Response> => {
    const params = makeOAuthBase({ oauth_token: tokens.accessToken });
    // Query params MUST be included in signature computation
    const allParams = { ...params, ...query };
    params.oauth_signature = computeSignature(
      method,
      baseUrl,
      allParams,
      process.env.GARMIN_CONSUMER_SECRET!,
      tokens.accessTokenSecret
    );
    return fetch(fullUrl, {
      method,
      headers: { Authorization: buildAuthHeader(params) },
    });
  };

  const delays = [2000, 4000, 8000];
  for (let i = 0; i <= delays.length; i++) {
    const res = await attempt();
    if (res.status !== 429) return res;
    if (i === delays.length) return res;
    const wait = Number(res.headers.get("Retry-After") ?? 0) * 1000 || delays[i];
    await new Promise((r) => setTimeout(r, wait));
  }
  return attempt();
}

// ─── Activity API ─────────────────────────────────────────────────────────────

/**
 * Fetch activity summaries uploaded to Garmin Connect in [startTs, endTs].
 * Both timestamps are Unix seconds.
 */
export async function getActivities(
  tokens: GarminTokens,
  startTs: number,
  endTs: number,
  limit = 100
): Promise<GarminActivity[]> {
  const res = await apiFetch("GET", "/wellness-api/rest/activities", tokens, {
    uploadStartTimeInSeconds: String(startTs),
    uploadEndTimeInSeconds: String(endTs),
    limit: String(limit),
  });

  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`Garmin activities fetch failed: ${res.status}`);
  return res.json();
}

/** Download the original FIT file for an activity. */
export async function downloadFitFile(
  tokens: GarminTokens,
  activityId: number
): Promise<Buffer> {
  const res = await apiFetch(
    "GET",
    `/wellness-api/rest/activities/${activityId}/file`,
    tokens
  );
  if (!res.ok)
    throw new Error(
      `Garmin FIT download failed for ${activityId}: ${res.status}`
    );
  return Buffer.from(await res.arrayBuffer());
}

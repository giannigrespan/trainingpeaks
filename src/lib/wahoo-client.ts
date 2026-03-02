const WAHOO_BASE_URL = "https://api.wahooligan.com";
const WAHOO_APP_URL =
  process.env.NEXTAUTH_URL ?? "https://trainingpeaks-gianni-grespans-projects.vercel.app";

export interface WahooTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

export interface WahooWorkout {
  id: string;
  name: string;
  starts: string;
  minutes: number;
  file?: { url: string };
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.WAHOO_CLIENT_ID!,
    redirect_uri: `${WAHOO_APP_URL}/api/integrations/wahoo/callback`,
    response_type: "code",
    scope: "user_read workouts_read",
    state,
  });
  return `${WAHOO_BASE_URL}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<WahooTokens> {
  const res = await fetch(`${WAHOO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.WAHOO_CLIENT_ID!,
      client_secret: process.env.WAHOO_CLIENT_SECRET!,
      redirect_uri: `${WAHOO_APP_URL}/api/integrations/wahoo/callback`,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<WahooTokens> {
  const res = await fetch(`${WAHOO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.WAHOO_CLIENT_ID!,
      client_secret: process.env.WAHOO_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}

export async function getWahooUserId(accessToken: string): Promise<string> {
  const res = await fetch(`${WAHOO_BASE_URL}/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to get Wahoo user: ${res.status}`);
  const data = await res.json();
  return String(data.id ?? data.user?.id);
}

export async function getWorkout(
  accessToken: string,
  workoutId: string
): Promise<WahooWorkout> {
  const res = await fetch(`${WAHOO_BASE_URL}/v1/workouts/${workoutId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to get workout: ${res.status}`);
  return res.json();
}

export async function downloadFitFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download FIT file: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function registerWebhook(
  accessToken: string,
  webhookUrl: string
): Promise<{ id: string; secret?: string }> {
  const res = await fetch(`${WAHOO_BASE_URL}/v1/user/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook_url: webhookUrl,
      event_types: ["workout_summary"],
    }),
  });
  if (!res.ok) throw new Error(`Webhook registration failed: ${res.status}`);
  const data = await res.json();
  return { id: String(data.id), secret: data.webhook_secret };
}

export async function deleteWebhook(
  accessToken: string,
  webhookId: string
): Promise<void> {
  const res = await fetch(`${WAHOO_BASE_URL}/v1/user/webhooks/${webhookId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Webhook deletion failed: ${res.status}`);
  }
}

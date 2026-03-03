const WAHOO_BASE_URL = "https://api.wahooligan.com";
const WAHOO_APP_URL = "https://trainingpeaks.vercel.app";

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

export interface WahooWorkoutsPage {
  workouts: WahooWorkout[];
  total: number;
  page: number;
  per_page: number;
  page_count: number;
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.WAHOO_CLIENT_ID!,
    redirect_uri: `${WAHOO_APP_URL}/api/integrations/wahoo/callback`,
    response_type: "code",
    scope: "user_read workouts_read offline_data",
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

async function wahooFetch(url: string, options?: RequestInit): Promise<Response> {
  const delays = [2000, 4000, 8000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    if (attempt === delays.length) return res; // give up, return 429 to caller
    const retryAfter = res.headers.get("Retry-After");
    const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : delays[attempt];
    await new Promise((r) => setTimeout(r, wait));
  }
  // unreachable
  return fetch(url, options);
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
  const res = await wahooFetch(`${WAHOO_BASE_URL}/v1/workouts/${workoutId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to get workout: ${res.status}`);
  return res.json();
}

export async function getWorkouts(
  accessToken: string,
  page: number,
  perPage = 30
): Promise<WahooWorkoutsPage> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const res = await wahooFetch(`${WAHOO_BASE_URL}/v1/workouts?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to list workouts: ${res.status}`);
  return res.json();
}

export async function downloadFitFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download FIT file: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}


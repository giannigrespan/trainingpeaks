const STRAVA_BASE_URL = "https://www.strava.com/api/v3";

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_speed: number;
  max_speed: number;
  calories?: number;
  device_watts?: boolean;
}

export interface StravaStream {
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaLatlngStream {
  data: [number, number][];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaMovingStream {
  data: boolean[];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaStreams {
  time?: StravaStream;
  watts?: StravaStream;
  heartrate?: StravaStream;
  cadence?: StravaStream;
  velocity_smooth?: StravaStream;
  altitude?: StravaStream;
  distance?: StravaStream;
  latlng?: StravaLatlngStream;
  moving?: StravaMovingStream;
}

const CYCLING_SPORT_TYPES = new Set([
  "Ride",
  "MountainBikeRide",
  "GravelRide",
  "VirtualRide",
  "EMountainBikeRide",
  "EBikeRide",
  "Velomobile",
  "Handcycle",
]);

export function isCyclingActivity(sportType: string): boolean {
  return CYCLING_SPORT_TYPES.has(sportType);
}

export function getAuthorizationUrl(state: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/integrations/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ tokens: StravaTokens; athlete: StravaAthlete }> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    },
    athlete: data.athlete,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<StravaTokens> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: data.expires_at,
  };
}

async function stravaFetch(url: string, accessToken: string): Promise<Response> {
  const delays = [2000, 4000, 8000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 429) return res;
    if (attempt === delays.length) return res;
    const retryAfter = res.headers.get("Retry-After");
    const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : delays[attempt];
    await new Promise((r) => setTimeout(r, wait));
  }
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
}

export async function getAthleteActivities(
  accessToken: string,
  page: number,
  perPage = 30
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const res = await stravaFetch(
    `${STRAVA_BASE_URL}/athlete/activities?${params}`,
    accessToken
  );
  if (!res.ok) throw new Error(`Failed to list activities: ${res.status}`);
  return res.json();
}

export async function getActivityStreams(
  accessToken: string,
  activityId: number
): Promise<StravaStreams> {
  const keys =
    "time,watts,heartrate,cadence,velocity_smooth,altitude,distance,latlng,moving";
  const res = await stravaFetch(
    `${STRAVA_BASE_URL}/activities/${activityId}/streams?keys=${keys}&key_by_type=true&resolution=high`,
    accessToken
  );
  // 404 means the activity exists but has no streams (e.g. manual entry)
  if (res.status === 404) return {};
  if (!res.ok)
    throw new Error(`Failed to get streams for ${activityId}: ${res.status}`);
  return res.json();
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getCachedSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials in .env.local");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to get Spotify token. Response:", errorBody);
    throw new Error(`Failed to get Spotify token. Status: ${response.status}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresIn = data.expires_in;

  if (!token || !expiresIn) {
    throw new Error("Invalid token data received from Spotify");
  }

  cachedToken = token;
  tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

  return token;
}

import { createClient } from 'redis';

const redis = await createClient({
    url: process.env.REDIS_URL
}).connect();

redis.on('error', (err) => console.error('Redis Client Error', err));

const TOKEN_KEY = "spotify_access_token";

export async function getCachedSpotifyToken(): Promise<string> {

  try {
    const cachedToken = await redis.get(TOKEN_KEY);
    if (cachedToken) {

      return cachedToken;
    }
  } catch (error) {
    console.error("Redis cache read error:", error);
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
  
  try {
    await redis.set(TOKEN_KEY, token, {
      EX: expiresIn - 60,
    });
    console.log("New Spotify token fetched and cached successfully.");
  } catch (error) {
    console.error("Redis cache write error:", error);
  }

  return token;
}
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

/**
 * Get Spotify access token using client credentials flow
 * This mirrors the logic from lib/spotify-token.ts but simplified for script use
 */
async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials. Make sure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set in .env.local");
  }

  console.log("🔑 Getting Spotify access token...");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
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

  if (!token) {
    throw new Error("Invalid token data received from Spotify");
  }

  console.log("✅ Spotify token obtained successfully");
  return token;
}

/**
 * Search for an artist on Spotify and return their ID
 */
async function searchArtist(artistName: string, token: string): Promise<string | null> {
  const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to search for artist "${artistName}". Status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.artists && data.artists.items && data.artists.items.length > 0) {
      const artistId = data.artists.items[0].id;
      console.log(`✅ Found "${artistName}" with ID: ${artistId}`);
      return artistId;
    } else {
      console.log(`⚠️  No results found for "${artistName}"`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error searching for artist "${artistName}":`, error);
    return null;
  }
}

/**
 * Add a small delay between API requests to be respectful to the API
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function to process the lineup.json file and populate artist IDs
 */
async function populateArtistIds() {
  try {
    console.log("🚀 Starting artist ID population script...");

    // Read the lineup.json file
    const lineupPath = join(process.cwd(), 'lib', 'lineup.json');
    const lineupContent = readFileSync(lineupPath, 'utf-8');
    const lineup = JSON.parse(lineupContent);

    // Get Spotify access token
    const token = await getSpotifyToken();

    let updatedCount = 0;
    let totalArtists = 0;

    // Process each week, date, and stage in the lineup
    for (const [weekKey, week] of Object.entries(lineup)) {
      console.log(`\n📅 Processing ${weekKey}...`);
      
      for (const [dateKey, date] of Object.entries(week as any)) {
        console.log(`  📊 Processing date ${dateKey}...`);
        
        for (const [stageKey, performances] of Object.entries(date as any)) {
          console.log(`    🎪 Processing stage ${stageKey}...`);
          
          // Process each performance
          for (const performance of performances as any[]) {
            // Process each artist in the performance
            for (const artist of performance.artists) {
              totalArtists++;
              
              // Skip if artist already has an ID
              if (artist.artistId && artist.artistId.trim() !== "") {
                console.log(`    ⏭️  Skipping "${artist.name}" (already has ID: ${artist.artistId})`);
                continue;
              }

              console.log(`    🔍 Searching for "${artist.name}"...`);
              
              // Search for the artist and get their ID
              const artistId = await searchArtist(artist.name, token);
              
              if (artistId) {
                artist.artistId = artistId;
                updatedCount++;
                console.log(`    ✅ Updated "${artist.name}" with ID: ${artistId}`);
              } else {
                console.log(`    ❌ Could not find ID for "${artist.name}"`);
              }

              // Add a small delay to be respectful to the API
              await delay(100);
            }
          }
        }
      }
    }

    // Write the updated lineup back to the file
    const updatedLineupContent = JSON.stringify(lineup, null, 2);
    writeFileSync(lineupPath, updatedLineupContent, 'utf-8');

    console.log(`\n🎉 Script completed successfully!`);
    console.log(`📊 Total artists processed: ${totalArtists}`);
    console.log(`✅ Artist IDs updated: ${updatedCount}`);
    console.log(`📁 Updated lineup.json saved`);

  } catch (error) {
    console.error("💥 Error running script:", error);
    process.exit(1);
  }
}

// Run the script
populateArtistIds();
import { NextResponse } from "next/server";

async function getSpotifyToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Spotify credentials");
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        throw new Error("Failed to get Spotify token");
    }

    const data = await response.json();
    return data.access_token;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (!artistId) {
        return NextResponse.json({ error: "Missing artistId" }, { status: 400 });
    }

    try {
        const token = await getSpotifyToken();
        const apiUrl = `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`;

        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("Spotify API error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
} 
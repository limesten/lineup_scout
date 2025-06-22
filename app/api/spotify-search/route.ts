import { NextResponse } from "next/server";
import { getCachedSpotifyToken } from "@/lib/spotify-token";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (!artistId) {
        return NextResponse.json({ error: "Missing artistId" }, { status: 400 });
    }

    try {
        const token = await getCachedSpotifyToken();
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
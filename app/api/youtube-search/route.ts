import { NextResponse } from "next/server";
import { getCachedResults, setCachedResults } from "@/lib/youtube-cache";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get("artistName");

    if (!artistName) {
        return NextResponse.json({ error: "Missing artistName" }, { status: 400 });
    }

    const cached = getCachedResults(artistName);
    if (cached) {
        return NextResponse.json({ items: cached });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Missing Google API key" }, { status: 500 });
    }

    try {
        const query = encodeURIComponent(`${artistName} live set`);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=5&key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        const data = await response.json();
        const items = data.items || [];
        setCachedResults(artistName, items);
        return NextResponse.json({ items });
    } catch (err) {
        console.error("YouTube API error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

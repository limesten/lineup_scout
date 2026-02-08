import { NextResponse } from "next/server";
import { getCachedResults, setCachedResults } from "@/lib/youtube-cache";

const STOP_WORDS = new Set(["&", "and", "the", "of", "vs", "b2b"]);

function decodeHtml(s: string): string {
    return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripParentheses(s: string): string {
    return s.replace(/\s*\([^)]*\)/g, "").trim();
}

function tokenize(s: string): string[] {
    return s.toLowerCase().split(/\s+/).filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function matchRatio(artistName: string, title: string): number {
    const artistTokens = tokenize(stripParentheses(decodeHtml(artistName)));
    if (artistTokens.length === 0) return 0;
    const titleTokens = new Set(tokenize(decodeHtml(title)));
    const matched = artistTokens.filter((t) => titleTokens.has(t)).length;
    return matched / artistTokens.length;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get("artistName");

    if (!artistName) {
        return NextResponse.json({ error: "Missing artistName" }, { status: 400 });
    }

    const cached = await getCachedResults(artistName);
    if (cached) {
        return NextResponse.json({ items: cached });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Missing Google API key" }, { status: 500 });
    }

    try {
        const searchName = stripParentheses(artistName);
        const query = encodeURIComponent(`${searchName} live set`);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=15&key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json({ error: errorData }, { status: response.status });
        }

        const data = await response.json();
        const allItems = data.items || [];
        const items = allItems
            .filter((item: { snippet: { title: string } }) =>
                matchRatio(artistName, item.snippet.title) >= 0.5
            )
            .slice(0, 5);
        await setCachedResults(artistName, items);
        return NextResponse.json({ items });
    } catch (err) {
        console.error("YouTube API error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

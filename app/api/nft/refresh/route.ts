import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { refreshNftPrices } from "@/server/nft-ingest";

// Triggered by Vercel Cron (daily). Vercel sends `Authorization: Bearer $CRON_SECRET`
// automatically when CRON_SECRET is configured in the project env.
export async function GET(request: NextRequest) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await refreshNftPrices();
        revalidatePath("/nft");
        return NextResponse.json({ refreshed: true, ...result });
    } catch (error) {
        console.error("NFT refresh failed:", error);
        return NextResponse.json(
            { refreshed: false, error: String(error) },
            { status: 500 }
        );
    }
}

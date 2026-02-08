import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const secret = request.headers.get("x-revalidation-secret");

    if (secret !== process.env.REVALIDATION_SECRET) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    revalidatePath("/");

    return NextResponse.json({ revalidated: true });
}

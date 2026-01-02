import { NextResponse } from 'next/server';
import { deleteSessionCookie } from '@/lib/spotify-auth';

export async function POST() {
    await deleteSessionCookie();
    return NextResponse.json({ success: true });
}

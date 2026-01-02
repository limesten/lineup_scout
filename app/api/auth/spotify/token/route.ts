import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/spotify-auth';
import { getAccessToken } from '@/lib/spotify-session';

export async function GET() {
    const session = await getSessionFromCookie();

    if (!session) {
        return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
        );
    }

    const accessToken = await getAccessToken(session.userId);

    if (!accessToken) {
        return NextResponse.json(
            { error: 'Failed to get access token' },
            { status: 500 }
        );
    }

    return NextResponse.json({ accessToken });
}

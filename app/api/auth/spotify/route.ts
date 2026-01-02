import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SPOTIFY_SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
].join(' ');

export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!clientId || !baseUrl) {
        return NextResponse.json(
            { error: 'Missing Spotify configuration' },
            { status: 500 }
        );
    }

    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: SPOTIFY_SCOPES,
        redirect_uri: `${baseUrl}/api/auth/spotify/callback`,
        state,
    });

    const cookieStore = await cookies();
    cookieStore.set('spotify_auth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
        path: '/',
    });

    return NextResponse.redirect(
        `https://accounts.spotify.com/authorize?${params.toString()}`
    );
}

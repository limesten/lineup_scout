import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionCookie } from '@/lib/spotify-auth';
import { upsertSpotifyUser } from '@/lib/spotify-session';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

    // Handle Spotify authorization errors
    if (error) {
        return NextResponse.redirect(`${baseUrl}/auth/error?error=auth_failed`);
    }

    // Validate state to prevent CSRF
    const cookieStore = await cookies();
    const storedState = cookieStore.get('spotify_auth_state')?.value;
    cookieStore.delete('spotify_auth_state');

    if (!state || state !== storedState) {
        return NextResponse.redirect(`${baseUrl}/auth/error?error=auth_failed`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/auth/error?error=auth_failed`);
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${baseUrl}/api/auth/spotify/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', await tokenResponse.text());
            return NextResponse.redirect(`${baseUrl}/auth/error?error=auth_failed`);
        }

        const tokenData = await tokenResponse.json();

        // Fetch user profile
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!profileResponse.ok) {
            console.error('Profile fetch failed:', await profileResponse.text());
            return NextResponse.redirect(`${baseUrl}/auth/error?error=auth_failed`);
        }

        const profile = await profileResponse.json();

        // Check if user has Premium
        const isPremium = profile.product === 'premium';
        if (!isPremium) {
            return NextResponse.redirect(`${baseUrl}/auth/error?error=not_premium`);
        }

        // Store user in database
        await upsertSpotifyUser({
            id: profile.id,
            email: profile.email,
            displayName: profile.display_name,
            isPremium,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
        });

        // Create session cookie
        await createSessionCookie(profile.id);

        // Redirect to home
        return NextResponse.redirect(baseUrl);
    } catch (err) {
        console.error('Callback error:', err);
        return NextResponse.redirect(`${baseUrl}/auth/error?error=auth_failed`);
    }
}

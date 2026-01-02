import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { spotifyUsersTable } from '@/server/db/schema';
import { getSessionFromCookie } from './spotify-auth';

export interface SpotifyUser {
    id: string;
    email: string;
    displayName: string | null;
    isPremium: boolean;
}

export async function getSession(): Promise<SpotifyUser | null> {
    const session = await getSessionFromCookie();
    if (!session) {
        return null;
    }

    const user = await db.query.spotifyUsersTable.findFirst({
        where: eq(spotifyUsersTable.id, session.userId),
    });

    if (!user) {
        return null;
    }

    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isPremium: user.isPremium,
    };
}

export async function getAccessToken(userId: string): Promise<string | null> {
    const user = await db.query.spotifyUsersTable.findFirst({
        where: eq(spotifyUsersTable.id, userId),
    });

    if (!user) {
        return null;
    }

    // Check if token is still valid (with 5 min buffer)
    const now = new Date();
    const bufferMs = 5 * 60 * 1000;
    if (user.tokenExpiresAt.getTime() > now.getTime() + bufferMs) {
        return user.accessToken;
    }

    // Token expired or expiring soon, refresh it
    return refreshAccessToken(userId, user.refreshToken);
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error('Missing Spotify credentials');
        return null;
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            console.error('Failed to refresh token:', await response.text());
            return null;
        }

        const data = await response.json();

        // Update database with new tokens
        await db
            .update(spotifyUsersTable)
            .set({
                accessToken: data.access_token,
                refreshToken: data.refresh_token ?? refreshToken,
                tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
                updatedAt: new Date(),
            })
            .where(eq(spotifyUsersTable.id, userId));

        return data.access_token;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}

export async function upsertSpotifyUser(userData: {
    id: string;
    email: string;
    displayName: string | null;
    isPremium: boolean;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}): Promise<void> {
    const tokenExpiresAt = new Date(Date.now() + userData.expiresIn * 1000);

    await db
        .insert(spotifyUsersTable)
        .values({
            id: userData.id,
            email: userData.email,
            displayName: userData.displayName,
            isPremium: userData.isPremium,
            accessToken: userData.accessToken,
            refreshToken: userData.refreshToken,
            tokenExpiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: spotifyUsersTable.id,
            set: {
                email: userData.email,
                displayName: userData.displayName,
                isPremium: userData.isPremium,
                accessToken: userData.accessToken,
                refreshToken: userData.refreshToken,
                tokenExpiresAt,
                updatedAt: new Date(),
            },
        });
}

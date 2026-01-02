import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'spotify_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload extends JWTPayload {
    userId: string;
    expiresAt: number;
}

function getSecretKey(): Uint8Array {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error('SESSION_SECRET environment variable is not set');
    }
    return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(payload.expiresAt)
        .sign(getSecretKey());
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecretKey(), {
            algorithms: ['HS256'],
        });
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function createSessionCookie(userId: string): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
    const token = await encryptSession({ userId, expiresAt });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });
}

export async function getSessionFromCookie(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    return decryptSession(token);
}

export async function deleteSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/spotify-session';

export async function GET() {
    const user = await getSession();

    if (!user) {
        return NextResponse.json({
            authenticated: false,
            user: null,
        });
    }

    return NextResponse.json({
        authenticated: true,
        user: {
            displayName: user.displayName,
            email: user.email,
            isPremium: user.isPremium,
        },
    });
}

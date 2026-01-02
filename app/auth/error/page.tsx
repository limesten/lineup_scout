import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
    searchParams: Promise<{ error?: string }>;
}

const errorMessages: Record<string, { title: string; message: string }> = {
    not_premium: {
        title: 'Spotify Premium Required',
        message:
            'The Lineup Scout player requires a Spotify Premium subscription to play full tracks. Please upgrade your Spotify account to use this feature.',
    },
    auth_failed: {
        title: 'Authentication Failed',
        message:
            "We couldn't connect to your Spotify account. Please try again.",
    },
};

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
    const params = await searchParams;
    const errorType = params.error ?? 'auth_failed';
    const { title, message } = errorMessages[errorType] ?? errorMessages.auth_failed;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <div className="max-w-md text-center">
                <h1 className="text-2xl font-bold mb-4">{title}</h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <Button asChild>
                    <Link href="/">Return to Lineup</Link>
                </Button>
            </div>
        </div>
    );
}

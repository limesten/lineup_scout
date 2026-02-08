import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Tomorrowland 2025 Lineup Explorer',
    description: 'Find your vibe',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    forcedTheme="dark"
                    disableTransitionOnChange
                >
                    {children}
                    <a
                        href="https://ko-fi.com/B0B51TUT8Y"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fixed bottom-4 right-4 z-40 transition-opacity hover:opacity-80"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            className="h-6 sm:h-9 border-0"
                            src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
                            alt="Buy Me a Coffee at ko-fi.com"
                        />
                    </a>
                    <Analytics />
                </ThemeProvider>
            </body>
        </html>
    );
}

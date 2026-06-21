'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarDays, LineChart } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/', label: 'Lineup', icon: CalendarDays },
    { href: '/nft', label: 'NFT', icon: LineChart },
] as const;

export function Navbar() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
            <div className="container mx-auto flex h-14 items-center gap-6 px-2 md:px-4">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold tracking-tight"
                >
                    <Image
                        src="/magic-wand.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5"
                    />
                    Tomorrowland Wizard
                </Link>

                <nav className="flex items-center gap-1">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                        const active =
                            href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(href);

                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-secondary text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </header>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { YouTubeSearchResult } from '@/lib/youtube-types';

const decodeHtml = (s: string) =>
    s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

interface YouTubeTabProps {
    artistName: string;
}

export function YouTubeTab({ artistName }: YouTubeTabProps) {
    const [results, setResults] = useState<YouTubeSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    useEffect(() => {
        if (!artistName) return;

        setLoading(true);
        setError(null);
        setSelectedVideoId(null);

        fetch(
            `/api/youtube-search?artistName=${encodeURIComponent(artistName)}`,
        )
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setError('Failed to load videos');
                    setResults([]);
                } else {
                    setResults(data.items || []);
                    if (data.items?.length > 0) {
                        setSelectedVideoId(data.items[0].id.videoId);
                    }
                }
            })
            .catch(() => setError('Failed to load videos'))
            .finally(() => setLoading(false));
    }, [artistName]);

    if (loading) {
        return (
            <div className="flex flex-col sm:flex-row gap-4 p-4 h-[352px]">
                <Skeleton className="flex-1 rounded-lg" />
                <div className="w-full sm:w-72 space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-md" />
                    ))}
                </div>
            </div>
        );
    }

    if (error || results.length === 0) {
        return (
            <div className="flex items-center justify-center h-[352px] text-muted-foreground">
                {error || `No YouTube videos found for "${artistName}"`}
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2 p-2 h-[352px]">
            {/* Video player */}
            {selectedVideoId && (
                <div className="flex-1 min-w-0">
                    <iframe
                        className="w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}

            {/* Results list */}
            <ScrollArea className="w-full sm:w-72 h-[120px] sm:h-full">
                <div className="space-y-1 pr-2">
                    {results.map((result) => (
                        <button
                            key={result.id.videoId}
                            onClick={() =>
                                setSelectedVideoId(result.id.videoId)
                            }
                            className={`w-full flex gap-2 p-1.5 rounded-md text-left transition-colors hover:bg-accent cursor-pointer ${
                                selectedVideoId === result.id.videoId
                                    ? 'bg-accent border border-border'
                                    : ''
                            }`}
                        >
                            <Image
                                src={result.snippet.thumbnails.default.url}
                                alt={result.snippet.title}
                                width={80}
                                height={60}
                                className="rounded object-cover flex-shrink-0"
                                unoptimized
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium line-clamp-2">
                                    {decodeHtml(result.snippet.title)}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                    {decodeHtml(result.snippet.channelTitle)}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

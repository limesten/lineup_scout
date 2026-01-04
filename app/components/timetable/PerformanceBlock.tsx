"use client";

import type { TimeTablePerformance, Artist } from "@/lib/db-types";
import { formatMinutesToTime } from "@/lib/timetable-utils";

interface PerformanceBlockProps {
    performance: TimeTablePerformance;
    onArtistClick: (spotifyUrl: string | null, artistName: string) => void;
}

export function PerformanceBlock({ performance, onArtistClick }: PerformanceBlockProps) {
    const { artists, leftPercent, widthPercent, startMinutes, durationMinutes } = performance;

    function getSeparator(): string {
        if (performance.name.includes("b2b")) return " b2b ";
        if (performance.name.includes("&")) return " & ";
        if (performance.name.includes("ft.")) return " ft. ";
        return " b2b ";
    }

    const separator = getSeparator();
    const startTime = formatMinutesToTime(startMinutes);
    const endTime = formatMinutesToTime(startMinutes + durationMinutes);

    // Handle click on a specific artist within the performance
    function handleArtistClick(e: React.MouseEvent, artist: Artist) {
        e.stopPropagation();
        onArtistClick(artist.spotify, artist.name);
    }

    // For b2b/multi-artist performances, clicking the block itself does nothing
    // Users click individual artist names
    return (
        <div
            className="absolute top-1 bottom-1 rounded-md px-2 py-1
                       bg-card border border-border
                       hover:bg-accent hover:border-accent-foreground/50
                       transition-colors overflow-hidden
                       flex flex-col justify-center"
            style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                minWidth: "60px",
            }}
        >
            <div className="text-xs font-medium truncate">
                {artists.map((artist, index) => (
                    <span key={artist.id}>
                        <span
                            onClick={(e) => handleArtistClick(e, artist)}
                            className="cursor-pointer hover:text-primary transition-colors"
                        >
                            {artist.name}
                        </span>
                        {index < artists.length - 1 && (
                            <span className="text-muted-foreground">{separator}</span>
                        )}
                    </span>
                ))}
            </div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">
                {startTime} - {endTime}
            </div>
        </div>
    );
}

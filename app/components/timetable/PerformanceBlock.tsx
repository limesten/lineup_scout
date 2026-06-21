"use client";

import type { TimeTablePerformance, Artist } from "@/lib/db-types";
import { formatMinutesToTime } from "@/lib/timetable-utils";
import { getStageColor } from "@/lib/stage-colors";

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
    const stageColor = getStageColor(performance.stage.name);

    function handleArtistClick(e: React.MouseEvent, artist: Artist) {
        e.stopPropagation();
        e.preventDefault();
        onArtistClick(artist.spotify, artist.name);
    }

    // Render clickable artist names
    const renderArtistNames = (className: string) => (
        <>
            {artists.map((artist, index) => (
                <span key={artist.id}>
                    <span
                        onClick={(e) => handleArtistClick(e, artist)}
                        className={`cursor-pointer hover:text-primary hover:underline transition-colors ${className}`}
                    >
                        {artist.name}
                    </span>
                    {index < artists.length - 1 && (
                        <span className="text-muted-foreground">{separator}</span>
                    )}
                </span>
            ))}
        </>
    );

    return (
        <div
            className="group absolute top-1 bottom-1 z-10 rounded-md px-2 py-1
                       border bg-[var(--block-bg)] hover:bg-[var(--block-bg-solid)]
                       hover:z-20 hover:min-w-fit hover:brightness-125
                       transition-all overflow-hidden hover:overflow-visible
                       flex flex-col justify-center"
            style={{
                left: `${leftPercent}%`,
                width: `calc(${widthPercent}% - 3px)`,
                ["--block-bg" as string]: stageColor.background,
                ["--block-bg-solid" as string]: stageColor.backgroundSolid,
                borderColor: stageColor.border,
            } as React.CSSProperties}
        >
            <div className="text-xs font-medium truncate group-hover:overflow-visible group-hover:whitespace-nowrap">
                {renderArtistNames("")}
            </div>
            <div className="text-[10px] text-muted-foreground hidden sm:block truncate group-hover:overflow-visible group-hover:whitespace-nowrap">
                {startTime} - {endTime}
            </div>
        </div>
    );
}

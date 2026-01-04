"use client";

import type { TimeTableStage, TimeTableTimeRange } from "@/lib/db-types";
import { StageLabel } from "./StageLabel";
import { PerformanceBlock } from "./PerformanceBlock";

interface TimeTableStageRowProps {
    stage: TimeTableStage;
    timeRange: TimeTableTimeRange;
    onArtistClick: (spotifyUrl: string | null, artistName: string) => void;
}

export function TimeTableStageRow({ stage, timeRange, onArtistClick }: TimeTableStageRowProps) {
    const totalHours = timeRange.endHour - timeRange.startHour;

    return (
        <div className="flex h-14 md:h-16 border-b border-border">
            <StageLabel name={stage.name} />
            <div className="flex-1 relative">
                {/* Grid lines for hours */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: totalHours }).map((_, i) => (
                        <div
                            key={i}
                            className="border-l border-border/30 h-full"
                            style={{ width: `${100 / totalHours}%` }}
                        />
                    ))}
                </div>
                {/* Performance blocks */}
                {stage.performances.map((performance) => (
                    <PerformanceBlock
                        key={performance.id}
                        performance={performance}
                        onArtistClick={onArtistClick}
                    />
                ))}
            </div>
        </div>
    );
}

"use client";

import type { TimeTableData } from "@/lib/db-types";
import { TimeTableHeader } from "./TimeTableHeader";
import { TimeTableStageRow } from "./TimeTableStageRow";

interface TimeTableViewProps {
    data: TimeTableData;
    onArtistClick: (spotifyUrl: string | null, artistName: string) => void;
}

export function TimeTableView({ data, onArtistClick }: TimeTableViewProps) {
    const { timeRange, stages } = data;
    const totalHours = timeRange.endHour - timeRange.startHour;

    // Calculate minimum width to ensure horizontal scroll
    // Approximately 100px per hour minimum
    const minWidth = Math.max(1200, totalHours * 100);

    return (
        <div className="relative w-full overflow-x-auto rounded-lg border border-border">
            <div
                className="relative"
                style={{ minWidth: `${minWidth}px` }}
            >
                <TimeTableHeader timeRange={timeRange} />
                <div>
                    {stages.map((stage) => (
                        <TimeTableStageRow
                            key={stage.id}
                            stage={stage}
                            timeRange={timeRange}
                            onArtistClick={onArtistClick}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

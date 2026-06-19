"use client";

import type { TimeTableData } from "@/lib/db-types";
import { generateHourMarkers, formatHour } from "@/lib/timetable-utils";
import { VerticalPerformanceBlock } from "./VerticalPerformanceBlock";

interface VerticalTimeTableViewProps {
    data: TimeTableData;
    onArtistClick: (spotifyUrl: string | null, artistName: string) => void;
}

// Vertical pixels allotted to each hour of the schedule.
const PX_PER_HOUR = 90;

export function VerticalTimeTableView({ data, onArtistClick }: VerticalTimeTableViewProps) {
    const { timeRange, stages } = data;
    const hours = generateHourMarkers(timeRange);
    const totalHours = timeRange.endHour - timeRange.startHour;
    const gridHeight = totalHours * PX_PER_HOUR;

    return (
        <div className="relative w-full overflow-x-auto rounded-lg border border-border">
            <div className="flex w-fit min-w-full">
                {/* Time axis (sticky left) */}
                <div className="sticky left-0 z-30 w-12 shrink-0 bg-background border-r border-border">
                    {/* Header spacer aligns with stage name headers */}
                    <div className="sticky top-0 z-10 h-12 bg-background border-b border-border" />
                    <div className="relative" style={{ height: `${gridHeight}px` }}>
                        {hours.map((hour, i) => (
                            <div
                                key={hour}
                                className="absolute left-0 right-0 text-[10px] text-muted-foreground px-1"
                                style={{ top: `${(i / totalHours) * 100}%` }}
                            >
                                {formatHour(hour)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stage columns */}
                {stages.map((stage) => (
                    <div
                        key={stage.id}
                        className="w-32 md:w-36 shrink-0 border-r border-border last:border-r-0"
                    >
                        {/* Stage header (sticky top) */}
                        <div className="sticky top-0 z-20 h-12 bg-background border-b border-border flex flex-col justify-center px-2">
                            <span className="text-xs font-medium leading-tight line-clamp-1" title={stage.name}>
                                {stage.name}
                            </span>
                            {stage.stageHost && (
                                <span
                                    className="text-[10px] italic text-muted-foreground truncate"
                                    title={`Hosted by: ${stage.stageHost}`}
                                >
                                    {stage.stageHost}
                                </span>
                            )}
                        </div>

                        {/* Stage timeline */}
                        <div className="relative" style={{ height: `${gridHeight}px` }}>
                            {/* Hour grid lines */}
                            <div className="absolute inset-0 pointer-events-none">
                                {hours.map((hour, i) => (
                                    <div
                                        key={hour}
                                        className="absolute left-0 right-0 border-t border-border/30"
                                        style={{ top: `${(i / totalHours) * 100}%` }}
                                    />
                                ))}
                            </div>
                            {/* Performance blocks */}
                            {stage.performances.map((performance) => (
                                <VerticalPerformanceBlock
                                    key={performance.id}
                                    performance={performance}
                                    onArtistClick={onArtistClick}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

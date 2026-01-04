"use client";

import type { TimeTableTimeRange } from "@/lib/db-types";
import { generateHourMarkers, formatHour } from "@/lib/timetable-utils";

interface TimeTableHeaderProps {
    timeRange: TimeTableTimeRange;
}

export function TimeTableHeader({ timeRange }: TimeTableHeaderProps) {
    const hours = generateHourMarkers(timeRange);
    const totalHours = hours.length;

    return (
        <div className="sticky top-0 z-20 flex h-10 bg-background border-b border-border">
            {/* Sticky corner cell */}
            <div className="sticky left-0 w-36 md:w-44 shrink-0 bg-background z-30 border-r border-border" />
            {/* Hour markers */}
            <div className="flex-1 flex">
                {hours.map((hour) => (
                    <div
                        key={hour}
                        className="border-l border-border text-xs text-muted-foreground px-2 py-2 flex items-center"
                        style={{ width: `${100 / totalHours}%` }}
                    >
                        {formatHour(hour)}
                    </div>
                ))}
            </div>
        </div>
    );
}

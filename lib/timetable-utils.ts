import type { LineupPerformance, TimeTableData, TimeTablePerformance, TimeTableStage, TimeTableTimeRange } from "./db-types";

const FESTIVAL_CUTOFF_HOUR = 6; // Performances 00:00-05:59 CEST belong to previous festival day

/**
 * Convert ISO time string to minutes from midnight in CEST.
 * Hours 0-5 are treated as 24-29 (continuation of previous day).
 */
export function getMinutesFromMidnight(isoString: string): number {
    const date = new Date(isoString);

    // Get hour and minute in CEST (Europe/Stockholm)
    const hourStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Stockholm",
        hour: "2-digit",
        hour12: false,
    }).format(date);

    const minuteStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Stockholm",
        minute: "2-digit",
    }).format(date);

    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Treat early morning hours as continuation of previous day
    if (hour < FESTIVAL_CUTOFF_HOUR) {
        hour += 24;
    }

    return hour * 60 + minute;
}

/**
 * Check if a performance has placeholder times (12:00-12:01 CEST),
 * indicating that real set times have not been released yet.
 */
export function isPlaceholderTime(startTime: string, endTime: string): boolean {
    const fmt = (iso: string) =>
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Stockholm",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(iso));
    return fmt(startTime) === "12:00" && fmt(endTime) === "12:01";
}

/**
 * Format minutes from midnight to HH:MM string
 */
export function formatMinutesToTime(minutes: number): string {
    let hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    // Convert 24+ hours back to 00-05 for display
    if (hour >= 24) {
        hour -= 24;
    }

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

/**
 * Calculate the time range for a set of performances.
 * Returns start/end hours and total minutes.
 */
export function calculateTimeRange(performances: LineupPerformance[]): TimeTableTimeRange {
    if (performances.length === 0) {
        return { startHour: 12, endHour: 24, totalMinutes: 12 * 60 };
    }

    let minMinutes = Infinity;
    let maxMinutes = -Infinity;

    for (const perf of performances) {
        const startMinutes = getMinutesFromMidnight(perf.startTime);
        const endMinutes = getMinutesFromMidnight(perf.endTime);

        minMinutes = Math.min(minMinutes, startMinutes);
        maxMinutes = Math.max(maxMinutes, endMinutes);
    }

    // Round to nearest hour for cleaner display
    const startHour = Math.floor(minMinutes / 60);
    const endHour = Math.ceil(maxMinutes / 60);

    return {
        startHour,
        endHour,
        totalMinutes: (endHour - startHour) * 60,
    };
}

/**
 * Calculate the left position and width as percentages for a performance block.
 */
export function calculateBlockPosition(
    startMinutes: number,
    durationMinutes: number,
    timeRange: TimeTableTimeRange
): { leftPercent: number; widthPercent: number } {
    const rangeStartMinutes = timeRange.startHour * 60;

    const offsetMinutes = startMinutes - rangeStartMinutes;
    const leftPercent = (offsetMinutes / timeRange.totalMinutes) * 100;
    const widthPercent = (durationMinutes / timeRange.totalMinutes) * 100;

    return { leftPercent, widthPercent };
}

/**
 * Transform raw performances into time table format.
 * Groups by stage and calculates positioning percentages.
 */
export function transformToTimeTableData(
    performances: LineupPerformance[],
    stageOrder: string[]
): TimeTableData {
    const timeRange = calculateTimeRange(performances);

    // Group performances by stage
    const stageMap = new Map<string, { stage: { id: number; name: string }; performances: LineupPerformance[] }>();

    for (const perf of performances) {
        const stageName = perf.stage.name;
        if (!stageMap.has(stageName)) {
            stageMap.set(stageName, {
                stage: perf.stage,
                performances: [],
            });
        }
        stageMap.get(stageName)!.performances.push(perf);
    }

    // Sort stages according to stageOrder
    const sortedStageNames = Array.from(stageMap.keys()).sort((a, b) => {
        const indexA = stageOrder.indexOf(a);
        const indexB = stageOrder.indexOf(b);
        const priorityA = indexA === -1 ? 999 : indexA;
        const priorityB = indexB === -1 ? 999 : indexB;
        return priorityA - priorityB;
    });

    // Transform to TimeTableStage format
    const stages: TimeTableStage[] = sortedStageNames.map(stageName => {
        const stageData = stageMap.get(stageName)!;

        // Sort performances by start time
        const sortedPerformances = [...stageData.performances].sort((a, b) => {
            return getMinutesFromMidnight(a.startTime) - getMinutesFromMidnight(b.startTime);
        });

        // Calculate positioning for each performance
        const timeTablePerformances: TimeTablePerformance[] = sortedPerformances.map(perf => {
            const startMinutes = getMinutesFromMidnight(perf.startTime);
            const endMinutes = getMinutesFromMidnight(perf.endTime);
            const durationMinutes = endMinutes - startMinutes;

            const { leftPercent, widthPercent } = calculateBlockPosition(
                startMinutes,
                durationMinutes,
                timeRange
            );

            return {
                ...perf,
                leftPercent,
                widthPercent,
                startMinutes,
                durationMinutes,
            };
        });

        return {
            id: stageData.stage.id,
            name: stageName,
            performances: timeTablePerformances,
        };
    });

    return { timeRange, stages };
}

/**
 * Generate array of hour markers for the time header.
 */
export function generateHourMarkers(timeRange: TimeTableTimeRange): number[] {
    const hours: number[] = [];
    for (let h = timeRange.startHour; h < timeRange.endHour; h++) {
        hours.push(h);
    }
    return hours;
}

/**
 * Format hour number to display string (handles 24+ hours).
 */
export function formatHour(hour: number): string {
    const displayHour = hour >= 24 ? hour - 24 : hour;
    return `${displayHour.toString().padStart(2, "0")}:00`;
}

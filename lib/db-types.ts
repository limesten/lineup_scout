import type {
    stagesTable,
    artistsTable,
} from "@/server/db/schema";

export type Stage = typeof stagesTable.$inferSelect;
export type Artist = typeof artistsTable.$inferSelect;

export interface LineupPerformance {
    id: string;
    name: string;
    artists: Artist[];
    stage: Stage;
    date: string;
    day: string;
    startTime: string;
    endTime: string;
}

export interface CompleteLineup {
    WEEKEND_1: LineupPerformance[];
    WEEKEND_2: LineupPerformance[];
}

// Time table view types
export interface TimeTableTimeRange {
    startHour: number;  // e.g., 12 (noon)
    endHour: number;    // e.g., 30 (6am next day, represented as 24+6)
    totalMinutes: number;
}

export interface TimeTablePerformance extends LineupPerformance {
    leftPercent: number;
    widthPercent: number;
    startMinutes: number;
    durationMinutes: number;
}

export interface TimeTableStage {
    id: number;
    name: string;
    performances: TimeTablePerformance[];
}

export interface TimeTableData {
    timeRange: TimeTableTimeRange;
    stages: TimeTableStage[];
}
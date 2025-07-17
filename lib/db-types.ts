import type {
    stagesTable,
    artistsTable,
} from "@/server/db/schema";
import { compileFunction } from "vm";

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
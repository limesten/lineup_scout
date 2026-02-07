import "server-only";

import { db } from "./db";
import {
    artistsTable,
    stagesTable,
    performanceTable,
    performanceArtists,
    stageHostsTable,
} from "@/server/db/schema";
import { getAllDatesForYear, getLineupDates, Year } from "@/lib/lineup-settings";
import { eq, inArray, desc } from "drizzle-orm";
import type { Artist, CompleteLineup, LineupPerformance } from "@/lib/db-types";

export async function getCompleteLineup(year: Year = 2025): Promise<CompleteLineup> {
    const allDatesForYear = getAllDatesForYear(year);
    const lineupDates = getLineupDates(year);

    // If no dates for this year, return empty structure
    if (allDatesForYear.length === 0) {
        return { WEEKEND_1: [], WEEKEND_2: [] };
    }

    const performanceData = await db
        .select({
            performance: performanceTable,
            stage: stagesTable,
        })
        .from(performanceTable)
        .innerJoin(stagesTable, eq(performanceTable.stageId, stagesTable.id))
        .where(inArray(performanceTable.date, allDatesForYear))
        .orderBy(desc(performanceTable.startTime));

    const performanceIds = performanceData.map((p) => p.performance.id);

    // If no performances found, return empty structure
    if (performanceIds.length === 0) {
        return { WEEKEND_1: [], WEEKEND_2: [] };
    }

    const artistData = await db
        .select({
            performanceId: performanceArtists.performanceId,
            artist: artistsTable,
        })
        .from(performanceArtists)
        .innerJoin(artistsTable, eq(performanceArtists.artistId, artistsTable.id))
        .where(inArray(performanceArtists.performanceId, performanceIds));

    // Fetch stage hosts for the relevant dates
    const stageHostData = await db
        .select({
            stageId: stageHostsTable.stageId,
            date: stageHostsTable.date,
            stageHost: stageHostsTable.stageHost,
        })
        .from(stageHostsTable)
        .where(inArray(stageHostsTable.date, allDatesForYear));

    // Build lookup map: "stageId-date" → stageHost
    const stageHostMap = new Map<string, string>();
    stageHostData.forEach(({ stageId, date, stageHost }) => {
        stageHostMap.set(`${stageId}-${date}`, stageHost);
    });

    // Group the artists that belong to the same performance
    const artistsByPerformance = new Map<number, Artist[]>();
    artistData.forEach(({ performanceId, artist }) => {
        if (!artistsByPerformance.has(performanceId)) {
            artistsByPerformance.set(performanceId, []);
        }
        artistsByPerformance.get(performanceId)!.push(artist);
    });

    const result: CompleteLineup = {
        WEEKEND_1: [],
        WEEKEND_2: [],
    };

    // Helper to determine which weekend a date belongs to for this year
    function getWeekendForDate(date: string): "WEEKEND_1" | "WEEKEND_2" | null {
        if (lineupDates.WEEKEND_1.includes(date)) {
            return "WEEKEND_1";
        }
        if (lineupDates.WEEKEND_2.includes(date)) {
            return "WEEKEND_2";
        }
        return null;
    }

    performanceData.forEach(({ performance, stage }) => {
        const weekend = getWeekendForDate(performance.date);
        if (!weekend) return;

        const lineupPerformance: LineupPerformance = {
            id: performance.id.toString(),
            name: performance.name,
            artists: artistsByPerformance.get(performance.id) || [],
            stage: stage,
            stageHost: stageHostMap.get(`${stage.id}-${performance.date}`) ?? null,
            date: performance.date,
            day: performance.day,
            startTime: performance.startTime,
            endTime: performance.endTime,
        };

        result[weekend].push(lineupPerformance);
    });

    return result;
}

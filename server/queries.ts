import "server-only";

import { db } from "./db";
import {
    artistsTable,
    stagesTable,
    performanceTable,
    performanceArtists,
} from "@/server/db/schema";
import { ALL_DATES, getWeekendForData } from "@/lib/lineup-settings";
import { eq, inArray, desc } from "drizzle-orm";
import type { Artist, CompleteLineup, LineupPerformance } from "@/lib/db-types";

export async function getCompleteLineup(): Promise<CompleteLineup> {
    // TODO: implement relations and do it all in one query

    const performanceData = await db
        .select({
            performance: performanceTable,
            stage: stagesTable,
        })
        .from(performanceTable)
        .innerJoin(stagesTable, eq(performanceTable.stageId, stagesTable.id))
        .where(inArray(performanceTable.date, ALL_DATES))
        .orderBy(desc(performanceTable.startTime));

    const performanceIds = performanceData.map((p) => p.performance.id);

    const artistData = await db
        .select({
            performanceId: performanceArtists.performanceId,
            artist: artistsTable,
        })
        .from(performanceArtists)
        .innerJoin(artistsTable, eq(performanceArtists.artistId, artistsTable.id))
        .where(inArray(performanceArtists.performanceId, performanceIds));

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

    performanceData.forEach(({ performance, stage }) => {
        const weekend = getWeekendForData(performance.date);
        if (!weekend) return;

        const lineupPerformance: LineupPerformance = {
            id: performance.id.toString(),
            name: performance.name,
            artists: artistsByPerformance.get(performance.id) || [],
            stage: stage,
            date: performance.date,
            day: performance.day,
            startTime: performance.startTime,
            endTime: performance.endTime,
        };

        result[weekend].push(lineupPerformance);
    });

    return result;
}

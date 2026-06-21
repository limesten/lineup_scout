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
import { eq, inArray, desc, sql } from "drizzle-orm";
import type { Artist, CompleteLineup, LineupPerformance } from "@/lib/db-types";
import {
    CURRENCIES,
    TAKER_FEE,
    TOKEN_SYMBOLS,
    type Currency,
    type CurrentPrices,
    type PriceHistory,
    type PriceKey,
    type TokenSymbol,
} from "@/lib/nft";

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

// ---------------------------------------------------------------------------
// NFT price queries (read from the v_prices_per_date / v_combined_price_per_date
// views). Chart history is raw; current prices include the 2.5% taker fee.
// ---------------------------------------------------------------------------

interface HistoryRow {
    date: string;
    sol: number;
    eur: number;
    usd: number;
    gbp: number;
    sek: number;
}

function toPriceHistory(rows: HistoryRow[]): PriceHistory {
    const currencies = {} as Record<Currency, number[]>;
    for (const c of CURRENCIES) {
        const key = c.toLowerCase() as keyof HistoryRow;
        currencies[c] = rows.map((r) => Number(r[key]));
    }
    return { dates: rows.map((r) => r.date), currencies };
}

export async function getCombinedPriceHistory(): Promise<PriceHistory> {
    const { rows } = await db.execute(sql`
        select date::text as date, sol, eur, usd, gbp, sek
        from v_combined_price_per_date
        order by date
    `);
    return toPriceHistory(rows as unknown as HistoryRow[]);
}

export async function getPerTokenPriceHistory(): Promise<
    Record<TokenSymbol, PriceHistory>
> {
    const { rows } = await db.execute(sql`
        select date::text as date, token, sol, eur, usd, gbp, sek
        from v_prices_per_date
        order by date
    `);
    const typedRows = rows as unknown as (HistoryRow & {
        token: TokenSymbol;
    })[];

    const result = {} as Record<TokenSymbol, PriceHistory>;
    for (const token of TOKEN_SYMBOLS) {
        result[token] = toPriceHistory(
            typedRows.filter((r) => r.token === token)
        );
    }
    return result;
}

export async function getCurrentPrices(): Promise<
    Record<PriceKey, CurrentPrices>
> {
    const { rows: tokenRows } = await db.execute(sql`
        select distinct on (token) token, sol, eur, usd, gbp, sek
        from v_prices_per_date
        order by token, date desc
    `);
    const typedTokenRows = tokenRows as unknown as (HistoryRow & {
        token: TokenSymbol;
    })[];

    const { rows: combinedRows } = await db.execute(sql`
        select sol, eur, usd, gbp, sek
        from v_combined_price_per_date
        order by date desc
        limit 1
    `);
    const typedCombinedRows = combinedRows as unknown as HistoryRow[];

    const applyFee = (row: HistoryRow): CurrentPrices => {
        const prices = {} as CurrentPrices;
        for (const c of CURRENCIES) {
            const key = c.toLowerCase() as keyof HistoryRow;
            prices[c] = Math.round(Number(row[key]) * TAKER_FEE * 1000) / 1000;
        }
        return prices;
    };

    const result = {} as Record<PriceKey, CurrentPrices>;
    for (const row of typedTokenRows) {
        result[row.token] = applyFee(row);
    }
    if (typedCombinedRows[0]) {
        result.combined = applyFee(typedCombinedRows[0]);
    }
    return result;
}

import "server-only";

import { sql } from "drizzle-orm";
import { db } from "./db";
import { solRatesTable, exchangeRatesTable } from "./db/schema";
import { TOKEN_SYMBOLS, type TokenSymbol, type Currency } from "@/lib/nft";

const FIAT_CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "SEK"];
const LAMPORTS_PER_SOL = 1_000_000_000;

interface MagicEdenStats {
    symbol: string;
    floorPrice: number; // in lamports
}

interface FxRatesResponse {
    success?: boolean;
    rates?: Record<string, number>;
}

/** Fetch the floor price (in SOL, floored to 2 decimals) for each collection. */
async function fetchTokenFloors(): Promise<Record<TokenSymbol, number>> {
    const entries = await Promise.all(
        TOKEN_SYMBOLS.map(async (symbol) => {
            const res = await fetch(
                `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`,
                { headers: { accept: "application/json" } }
            );
            if (!res.ok) {
                throw new Error(`Magic Eden ${symbol} failed: ${res.status}`);
            }
            const stats = (await res.json()) as MagicEdenStats;
            const sol = stats.floorPrice / LAMPORTS_PER_SOL;
            const flooredSol = Math.floor(sol * 100) / 100;
            return [symbol, flooredSol] as const;
        })
    );

    return Object.fromEntries(entries) as Record<TokenSymbol, number>;
}

/** Fetch SOL -> fiat exchange rates (fiat per 1 SOL). */
async function fetchExchangeRates(): Promise<Record<Currency, number>> {
    const apiKey = process.env.FX_RATES_API_KEY;
    if (!apiKey) {
        throw new Error("FX_RATES_API_KEY is not set");
    }

    const url =
        `https://api.fxratesapi.com/latest?api_key=${apiKey}` +
        `&base=SOL&currencies=${FIAT_CURRENCIES.join(",")}` +
        `&resolution=1m&amount=1&places=6&format=json`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`FX Rates failed: ${res.status}`);
    }

    const data = (await res.json()) as FxRatesResponse;
    if (!data.rates) {
        throw new Error("FX Rates response missing rates");
    }

    return data.rates as Record<Currency, number>;
}

/** Today's date in UTC as YYYY-MM-DD (the snapshot key). */
function todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Fetch fresh token floors + exchange rates and upsert today's snapshot.
 * One row per (token, date) and (currency, date), replacing any existing row
 * for today so repeated runs within a day refresh rather than duplicate.
 */
export async function refreshNftPrices() {
    const [floors, rates] = await Promise.all([
        fetchTokenFloors(),
        fetchExchangeRates(),
    ]);

    const date = todayUtc();

    const solRows = TOKEN_SYMBOLS.map((token) => ({
        token,
        date,
        sol: floors[token],
    }));

    const rateRows = FIAT_CURRENCIES.map((currency) => ({
        currency,
        date,
        solExchangeRate: rates[currency],
    }));

    await db
        .insert(solRatesTable)
        .values(solRows)
        .onConflictDoUpdate({
            target: [solRatesTable.token, solRatesTable.date],
            set: { sol: sqlExcluded("sol") },
        });

    await db
        .insert(exchangeRatesTable)
        .values(rateRows)
        .onConflictDoUpdate({
            target: [exchangeRatesTable.currency, exchangeRatesTable.date],
            set: { solExchangeRate: sqlExcluded("sol_exchange_rate") },
        });

    return { date, floors, rates };
}

// Reference the proposed (incoming) row value in an upsert's SET clause.
function sqlExcluded(column: string) {
    return sql.raw(`excluded.${column}`);
}

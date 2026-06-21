import { text, date, bigint, timestamp, doublePrecision, pgTable, primaryKey, jsonb } from "drizzle-orm/pg-core";

export const stagesTable = pgTable("stages", {
    id: bigint({ mode: "number" }).primaryKey(),
    name: text().notNull(),
});

export const artistsTable = pgTable("artists", {
    id: bigint({ mode: "number" }).primaryKey(),
    name: text().notNull(),
    image: text(),
    spotify: text(),
    instagram: text(),
    facebook: text(),
    tiktok: text(),
    youtube: text(),
    website: text(),
});

export const performanceTable = pgTable("performances", {
    id: bigint({ mode: "number" }).primaryKey(),
    name: text().notNull(),
    type: text().notNull(),
    stageId: bigint({ mode: "number" })
        .notNull()
        .references(() => stagesTable.id),
    date: text().notNull(),
    day: text().notNull(),
    startTime: text().notNull(),
    endTime: text().notNull(),
});

export const performanceArtists = pgTable(
    "performance_artists",
    {
        performanceId: bigint({ mode: "number" })
            .notNull()
            .references(() => performanceTable.id),
        artistId: bigint({ mode: "number" })
            .notNull()
            .references(() => artistsTable.id),
    },
    (table) => [primaryKey({ columns: [table.performanceId, table.artistId] })]
);

export const stageHostsTable = pgTable(
    "stage_hosts",
    {
        stageId: bigint({ mode: "number" })
            .notNull()
            .references(() => stagesTable.id),
        date: text().notNull(),
        stageHost: text().notNull(),
    },
    (table) => [primaryKey({ columns: [table.stageId, table.date] })]
);

export const youtubeCacheTable = pgTable("youtube_cache", {
    artistName: text("artist_name").primaryKey(),
    results: jsonb("results").notNull(),
    cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

// NFT price tracking. One snapshot per (token, date) and (currency, date),
// matching the daily insert-or-replace semantics of the original Go app.
export const solRatesTable = pgTable(
    "sol_rates",
    {
        token: text().notNull(),
        date: date().notNull(),
        sol: doublePrecision().notNull(),
    },
    (table) => [primaryKey({ columns: [table.token, table.date] })]
);

export const exchangeRatesTable = pgTable(
    "exchange_rates",
    {
        currency: text().notNull(),
        date: date().notNull(),
        solExchangeRate: doublePrecision("sol_exchange_rate").notNull(),
    },
    (table) => [primaryKey({ columns: [table.currency, table.date] })]
);

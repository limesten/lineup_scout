import { text, date, bigint, timestamp, pgTable, primaryKey } from "drizzle-orm/pg-core";

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

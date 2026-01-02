import { text, date, bigint, timestamp, pgTable, primaryKey, boolean } from "drizzle-orm/pg-core";

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

export const spotifyUsersTable = pgTable("spotify_users", {
    id: text().primaryKey(),
    email: text().notNull(),
    displayName: text(),
    isPremium: boolean().notNull().default(false),
    accessToken: text().notNull(),
    refreshToken: text().notNull(),
    tokenExpiresAt: timestamp().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
});

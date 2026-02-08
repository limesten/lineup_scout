import type { YouTubeSearchResult } from './youtube-types';
import { db } from '@/server/db';
import { youtubeCacheTable } from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';

// --- L1: In-memory cache (fast, ephemeral) ---

interface CacheEntry {
    results: YouTubeSearchResult[];
    expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// --- Public API ---

export async function getCachedResults(
    artistName: string,
): Promise<YouTubeSearchResult[] | null> {
    const key = artistName.toLowerCase();

    // L1: Check in-memory cache first
    const memEntry = memoryCache.get(key);
    if (memEntry && Date.now() < memEntry.expiresAt) {
        console.log(`[YT Cache] HIT L1 (memory) for "${key}"`);
        return memEntry.results;
    }
    memoryCache.delete(key);

    // L2: Check database
    try {
        const rows = await db
            .select()
            .from(youtubeCacheTable)
            .where(eq(youtubeCacheTable.artistName, key))
            .limit(1);

        if (rows.length > 0) {
            const row = rows[0];
            const cachedAtMs = new Date(row.cachedAt).getTime();
            const expiresAt = cachedAtMs + CACHE_TTL_MS;

            if (Date.now() < expiresAt) {
                const results = row.results as YouTubeSearchResult[];
                console.log(
                    `[YT Cache] HIT L2 (database) for "${key}" — cached ${Math.round((Date.now() - cachedAtMs) / 3600000)}h ago`,
                );
                // Populate L1 for subsequent requests in this process
                memoryCache.set(key, { results, expiresAt });
                return results;
            }
        }
    } catch (err) {
        console.error('Failed to read YouTube cache from DB:', err);
    }

    console.log(`[YT Cache] MISS for "${key}" — calling YouTube API`);
    return null;
}

export async function setCachedResults(
    artistName: string,
    results: YouTubeSearchResult[],
): Promise<void> {
    const key = artistName.toLowerCase();
    const expiresAt = Date.now() + CACHE_TTL_MS;

    // L1: Update in-memory cache
    memoryCache.set(key, { results, expiresAt });

    // L2: Upsert into database
    try {
        await db
            .insert(youtubeCacheTable)
            .values({
                artistName: key,
                results: results,
                cachedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: youtubeCacheTable.artistName,
                set: {
                    results: sql`excluded.results`,
                    cachedAt: sql`excluded.cached_at`,
                },
            });
    } catch (err) {
        console.error('Failed to write YouTube cache to DB:', err);
    }
}

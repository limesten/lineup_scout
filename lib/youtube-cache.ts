import type { YouTubeSearchResult } from "./youtube-types";

interface CacheEntry {
  results: YouTubeSearchResult[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getCachedResults(
  artistName: string
): YouTubeSearchResult[] | null {
  const key = artistName.toLowerCase();
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.results;
  }
  cache.delete(key);
  return null;
}

export function setCachedResults(
  artistName: string,
  results: YouTubeSearchResult[]
): void {
  const key = artistName.toLowerCase();
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Available years for the lineup
export const AVAILABLE_YEARS = [2025, 2026] as const;
export type Year = (typeof AVAILABLE_YEARS)[number];

// Lineup dates organized by year
export const LINEUP_DATES_BY_YEAR: Record<
    Year,
    { WEEKEND_1: string[]; WEEKEND_2: string[] }
> = {
    2025: {
        WEEKEND_1: ['2025-07-18', '2025-07-19', '2025-07-20'],
        WEEKEND_2: ['2025-07-25', '2025-07-26', '2025-07-27'],
    },
    2026: {
        WEEKEND_1: ['2026-07-17', '2026-07-18', '2026-07-19'],
        WEEKEND_2: ['2026-07-24', '2026-07-25', '2026-07-26'],
    },
};

// Helper to get dates for a specific year
export function getLineupDates(year: Year) {
    return LINEUP_DATES_BY_YEAR[year];
}

// Helper to get all dates for a year as flat array
export function getAllDatesForYear(year: Year): string[] {
    const dates = LINEUP_DATES_BY_YEAR[year];
    return [...dates.WEEKEND_1, ...dates.WEEKEND_2];
}

// Backward compatibility - default to 2025
export const LINEUP_DATES = LINEUP_DATES_BY_YEAR[2025];
export const ALL_DATES = getAllDatesForYear(2025);

export type LineupDate = (typeof ALL_DATES)[number];
export type Weekend = 'WEEKEND_1' | 'WEEKEND_2';

export function getWeekendForData(date: string): Weekend | null {
    if (LINEUP_DATES.WEEKEND_1.includes(date as any)) {
        return 'WEEKEND_1';
    }
    if (LINEUP_DATES.WEEKEND_2.includes(date as any)) {
        return 'WEEKEND_2';
    }
    return null;
}

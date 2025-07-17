export const LINEUP_DATES = {
    WEEKEND_1: ["2025-07-18", "2025-07-19", "2025-07-20"],
    WEEKEND_2: ["2025-07-25", "2025-07-26", "2025-07-27"],
} as const;

export const ALL_DATES = [...LINEUP_DATES.WEEKEND_1, ...LINEUP_DATES.WEEKEND_2];

export type LineupDate = (typeof ALL_DATES)[number];
export type Weekend = keyof typeof LINEUP_DATES;

export function getWeekendForData(date: string): Weekend | null {
    if (LINEUP_DATES.WEEKEND_1.includes(date as any)) {
        return "WEEKEND_1";
    }
    if (LINEUP_DATES.WEEKEND_2.includes(date as any)) {
        return "WEEKEND_2";
    }
    return null;
}

import Lineup from './lineup';
import { getCompleteLineup } from '@/server/queries';
import { AVAILABLE_YEARS, Year } from '@/lib/lineup-settings';
import type { CompleteLineup } from '@/lib/db-types';

// Fetch all years' data in parallel for instant client-side switching
async function getAllLineupData(): Promise<Record<Year, CompleteLineup>> {
    const results = await Promise.all(
        AVAILABLE_YEARS.map(async (year) => ({
            year,
            data: await getCompleteLineup(year),
        }))
    );

    return results.reduce(
        (acc, { year, data }) => {
            acc[year] = data;
            return acc;
        },
        {} as Record<Year, CompleteLineup>
    );
}

export default async function Home() {
    const allLineupData = await getAllLineupData();

    return (
        <div className="container mx-auto px-4 flex flex-col items-center">
            <h1 className="text-2xl font-bold mt-4">
                Tomorrowland Lineup Explorer
            </h1>
            <p className="text-md text-muted-foreground mb-4 italic">
                Find your vibe
            </p>

            <Lineup allLineupData={allLineupData} />
        </div>
    );
}

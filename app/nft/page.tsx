import type { Metadata } from 'next';
import { PriceChart } from '@/app/components/nft/PriceChart';
import {
    getCombinedPriceHistory,
    getPerTokenPriceHistory,
    getCurrentPrices,
} from '@/server/queries';

export const metadata: Metadata = {
    title: 'NFT Price · Tomorrowland Wizard',
    description: 'Track the Tomorrowland NFT floor price over time',
};

export default async function NftPage() {
    const [combined, perToken, current] = await Promise.all([
        getCombinedPriceHistory(),
        getPerTokenPriceHistory(),
        getCurrentPrices(),
    ]);

    return (
        <div className="container mx-auto flex flex-col items-center px-2 md:px-4">
            <div className="w-full max-w-7xl">
                <h1 className="mt-4 text-2xl font-bold">
                    Tomorrowland NFT Price Chart
                </h1>
                <p className="text-md mb-4 italic text-muted-foreground">
                    Floor price of the 3 access tokens, tracked daily
                </p>

                <PriceChart
                    combined={combined}
                    perToken={perToken}
                    current={current}
                />
            </div>
        </div>
    );
}

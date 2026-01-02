import Lineup from "./lineup";
import { getCompleteLineup } from "@/server/queries";
import { SpotifyAuthButton } from "@/components/spotify-auth-button";

export default async function Home() {
    const lineupData = await getCompleteLineup();

    return (
        <div className="container mx-auto px-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mt-4">
                <h1 className="text-2xl font-bold">Tomorrowland 2025 Lineup Explorer</h1>
                <SpotifyAuthButton />
            </div>
            <p className="text-md text-muted-foreground mb-4 italic">Find your vibe</p>

            <Lineup lineupData={lineupData} />
        </div>
    );
}

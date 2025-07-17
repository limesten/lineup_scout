import Lineup from "./lineup";
import { getCompleteLineup } from "@/server/queries";

export default async function Home() {
    const lineupData = await getCompleteLineup();

    return (
        <div className="container mx-auto px-4 flex flex-col items-center">
            <h1 className="text-2xl font-bold mt-4">Tomorrowland 2025 Lineup Explorer</h1>
            <p className="text-md text-muted-foreground mb-4 italic">Find your vibe</p>

            <Lineup lineupData={lineupData} />
        </div>
    );
}

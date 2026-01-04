"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LINEUP_DATES, Weekend } from "@/lib/lineup-settings";
import { X, LayoutGrid, CalendarDays } from "lucide-react";

import type {
    SpotifyIframeApi,
    SpotifyEmbedController,
} from "@/lib/spotify-types";
import { CompleteLineup, LineupPerformance } from "@/lib/db-types";
import { TimeTableView } from "./components/timetable";
import { transformToTimeTableData } from "@/lib/timetable-utils";

interface LineupProps {
    lineupData: CompleteLineup;
}

type ViewMode = "timetable" | "grid";

const STAGE_ORDER = [
    "MAINSTAGE",
    "THE RAVE CAVE",
    "CORE",
    "HOUSE OF FORTUNE BY JBL",
    "FREEDOM BY BUD",
    "CAGE",
    "CRYSTAL GARDEN",
    "MELODIA BY CORONA",
    "THE ROSE GARDEN",
    "RISE BY COCA-COLA",
    "THE GREAT LIBRARY",
    "ELIXIR",
    "PLANAXIS",
    "ATMOSPHERE",
    "MOOSEBAR",
];

export default function Lineup({ lineupData }: LineupProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("timetable");
    const [selectedWeekend, setSelectedWeekend] = useState<Weekend>("WEEKEND_1");
    const [selectedDate, setSelectedDate] = useState<string | null>(LINEUP_DATES.WEEKEND_1[0]);
    const [selectedArtist, setSelectedArtist] = useState<{ name: string; spotifyId: string } | null>(null);

    const embedRef = useRef<HTMLDivElement>(null);
    const spotifyEmbedControllerRef = useRef<SpotifyEmbedController | null>(null);
    const [iFrameAPI, setIFrameAPI] = useState<SpotifyIframeApi | undefined>(undefined);
    const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);

    // Load Spotify iframe API script
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Set up global callback for Spotify iframe API
    useEffect(() => {
        if (iFrameAPI) {
            return;
        }

        window.onSpotifyIframeApiReady = (SpotifyIframeApi: SpotifyIframeApi) => {
            setIFrameAPI(SpotifyIframeApi);
        };
    }, [iFrameAPI]);

    // Initialize the Spotify player when API is ready and we have an artist selected
    useEffect(() => {
        if (!iFrameAPI || !embedRef.current || !selectedArtist) {
            return;
        }

        // If player already exists, just load the new URI
        if (spotifyEmbedControllerRef.current && playerLoaded) {
            const artistUri = `spotify:artist:${selectedArtist.spotifyId}`;
            spotifyEmbedControllerRef.current.loadUri(artistUri);
            return;
        }

        // Create new controller
        const artistUri = `spotify:artist:${selectedArtist.spotifyId}`;

        iFrameAPI.createController(
            embedRef.current,
            {
                width: "100%",
                height: "352",
                uri: artistUri,
            },
            (spotifyEmbedController: SpotifyEmbedController) => {
                spotifyEmbedController.addListener("ready", () => {
                    setPlayerLoaded(true);
                });

                spotifyEmbedControllerRef.current = spotifyEmbedController;
            }
        );

        return () => {
            if (spotifyEmbedControllerRef.current) {
                spotifyEmbedControllerRef.current.removeListener("ready");
            }
        };
    }, [iFrameAPI, selectedArtist, playerLoaded]);

    const handleWeekendChange = (newWeekend: Weekend) => {
        if (!newWeekend) {
            return;
        }
        setSelectedWeekend(newWeekend);
        const firstDate = LINEUP_DATES[newWeekend][0];
        setSelectedDate(firstDate);
    };

    function handleArtistClick(spotifyUrl: string | null, artistName: string) {
        if (!spotifyUrl || spotifyUrl.trim() === "") {
            return;
        }

        // Extract artist ID from Spotify URL
        const url = new URL(spotifyUrl);
        const pathSegments = url.pathname.split("/").filter(Boolean);
        const artistId = pathSegments[pathSegments.length - 1];

        setSelectedArtist({ name: artistName, spotifyId: artistId });
    }

    function handleClosePlayer() {
        if (spotifyEmbedControllerRef.current) {
            spotifyEmbedControllerRef.current.pause();
        }
        setSelectedArtist(null);
        setPlayerLoaded(false);
        spotifyEmbedControllerRef.current = null;
    }

    function formatDate(date: string) {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
            timeZone: "Europe/Berlin",
            weekday: "short",
            month: "short",
            day: "numeric",
        });

        return formattedDate;
    }

    function formatCESTTime(isoString: string) {
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Stockholm",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(isoString));
    }

    function Performance(performance: LineupPerformance) {
        const { artists } = performance;

        function getSeparator(): string {
            if (performance.name.includes("b2b")) return " b2b ";
            if (performance.name.includes("&")) return " & ";
            if (performance.name.includes("ft.")) return " ft. ";
            return " b2b ";
        }

        const separator = getSeparator();

        return (
            <div className="flex flex-col">
                <span>
                    {artists.map((artist, index) => (
                        <span key={`${performance.id}-${artist.id}`}>
                            <span
                                onClick={() => handleArtistClick(artist.spotify, artist.name)}
                                className="cursor-pointer hover:text-primary transition-colors font-semibold"
                            >
                                {artist.name}
                            </span>
                            {index < artists.length - 1 && separator}
                        </span>
                    ))}
                </span>
                <span className="text-xs">
                    {formatCESTTime(performance.startTime)} - {formatCESTTime(performance.endTime)}
                </span>
            </div>
        );
    }

    const getPerformancesByDate = useCallback((date: string): LineupPerformance[] => {
        if (!date) return [];

        return lineupData[selectedWeekend].filter((performance) => {
            // Convert UTC startTime to CEST to determine festival day
            const startTimeUTC = new Date(performance.startTime);
            const startTimeCEST = new Intl.DateTimeFormat("sv-SE", {
                timeZone: "Europe/Stockholm",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(startTimeUTC);

            // Get the hour in CEST to apply festival logic
            const hourCEST = new Intl.DateTimeFormat("en-GB", {
                timeZone: "Europe/Stockholm",
                hour: "2-digit",
                hour12: false,
            }).format(startTimeUTC);

            // Festival logic: performances between 00:00-05:59 CEST belong to the previous day
            const festivalCutoffHour = 6;
            const performanceHour = parseInt(hourCEST);

            let festivalDate: string;

            if (performanceHour < festivalCutoffHour) {
                const previousDay = new Date(startTimeCEST);
                previousDay.setDate(previousDay.getDate() - 1);
                festivalDate = previousDay.toISOString().split("T")[0];
            } else {
                festivalDate = startTimeCEST;
            }

            return festivalDate === date;
        });
    }, [lineupData, selectedWeekend]);

    function getStagesByDate(date: string) {
        const dayPerformances = getPerformancesByDate(date);
        if (dayPerformances.length === 0) return {};

        const groupedByStage: { [stageName: string]: LineupPerformance[] } = {};

        dayPerformances.forEach((performance) => {
            const stageName = performance.stage.name;
            if (!groupedByStage[stageName]) {
                groupedByStage[stageName] = [];
            }
            groupedByStage[stageName].push(performance);
        });

        const sortedStageNames = Object.keys(groupedByStage).sort((stageNameA, stageNameB) => {
            const priorityA = STAGE_ORDER.indexOf(stageNameA);
            const priorityB = STAGE_ORDER.indexOf(stageNameB);

            const finalPriorityA = priorityA === -1 ? 999 : priorityA;
            const finalPriorityB = priorityB === -1 ? 999 : priorityB;

            return finalPriorityA - finalPriorityB;
        });

        const orderedGroupedByStage: { [stageName: string]: LineupPerformance[] } = {};
        sortedStageNames.forEach((stageName) => {
            orderedGroupedByStage[stageName] = groupedByStage[stageName];
        });

        return orderedGroupedByStage;
    }

    // Memoized time table data transformation
    const timeTableData = useMemo(() => {
        if (!selectedDate) return null;
        const performances = getPerformancesByDate(selectedDate);
        if (performances.length === 0) return null;
        return transformToTimeTableData(performances, STAGE_ORDER);
    }, [selectedDate, getPerformancesByDate]);

    return (
        <div className="container mx-auto px-4 flex flex-col items-center">
            <div className="flex flex-wrap gap-4 items-center justify-center mb-2">
                {/* Weekend Toggle */}
                <ToggleGroup
                    type="single"
                    value={selectedWeekend}
                    onValueChange={handleWeekendChange}
                >
                    <ToggleGroupItem variant="outline" value="WEEKEND_1" className="cursor-pointer">
                        Weekend 1
                    </ToggleGroupItem>
                    <ToggleGroupItem variant="outline" value="WEEKEND_2" className="cursor-pointer">
                        Weekend 2
                    </ToggleGroupItem>
                </ToggleGroup>

                {/* View Mode Toggle */}
                <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(value) => value && setViewMode(value as ViewMode)}
                >
                    <ToggleGroupItem variant="outline" value="timetable" className="cursor-pointer">
                        <CalendarDays className="h-4 w-4 mr-1" />
                        Timetable
                    </ToggleGroupItem>
                    <ToggleGroupItem variant="outline" value="grid" className="cursor-pointer">
                        <LayoutGrid className="h-4 w-4 mr-1" />
                        Grid
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <ToggleGroup type="single" value={selectedDate || ""} onValueChange={setSelectedDate}>
                {LINEUP_DATES[selectedWeekend].map((date) => (
                    <ToggleGroupItem
                        key={date}
                        variant="outline"
                        value={date}
                        className="cursor-pointer"
                    >
                        <p suppressHydrationWarning>{formatDate(date)}</p>
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>

            {/* Main content with bottom padding when player is open */}
            <div className={`mt-5 w-full ${selectedArtist ? "pb-[400px]" : ""}`}>
                {/* Timetable View */}
                {viewMode === "timetable" && timeTableData && (
                    <TimeTableView
                        data={timeTableData}
                        onArtistClick={handleArtistClick}
                    />
                )}

                {/* Grid View */}
                {viewMode === "grid" && (
                    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 mx-auto w-[80%]">
                        {selectedDate &&
                            Object.entries(getStagesByDate(selectedDate)).map(
                                ([stageName, performances]) => (
                                    <Card key={stageName} className="mb-6 text-center break-inside-avoid">
                                        <CardHeader>
                                            <CardTitle>
                                                <span>{stageName}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1">
                                                {performances.map((performance) => (
                                                    <li key={performance.id} className="mt-2">
                                                        {Performance(performance)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )
                            )}
                    </div>
                )}
            </div>

            {/* Fixed bottom Spotify player */}
            {selectedArtist && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
                    <div className="relative">
                        {/* Close button */}
                        <button
                            onClick={handleClosePlayer}
                            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-accent transition-colors"
                            aria-label="Close player"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Spotify embed container */}
                        <div ref={embedRef} className="w-full" />
                    </div>
                </div>
            )}
        </div>
    );
}

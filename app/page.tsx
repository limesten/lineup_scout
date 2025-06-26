"use client";

import { useState, useEffect } from "react";
import lineupData from "@/lib/lineup.json";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

const LineupData: LineupData = lineupData;

interface Track {
    id: string;
    name: string;
    preview_url: string | null;
    external_urls: { spotify: string };
    album: {
        name: string;
        images: { url: string }[];
    };
    artists: { name: string }[];
}

interface Artist {
    name: string;
    artistId: string;
}

interface Performance {
    id: string;
    artists: Artist[];
}

interface StagePerformances {
    [stageName: string]: Performance[];
}

interface DatePerformances {
    [date: string]: StagePerformances;
}

interface LineupData {
    [weekKey: string]: DatePerformances;
}

export default function Home() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [selectedWeekend, setSelectedWeekend] = useState<string>("week_1");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
    const [popoverArtist, setPopoverArtist] = useState<string | null>(null);
    const [loadingIFrame, setLoadingIFrame] = useState<boolean>(false);

    function getFirstDateOfWeekend(weekend: string): string | null {
        const weekData = LineupData[weekend as keyof LineupData];
        if (!weekData) return null;

        const dates = Object.keys(weekData);
        return dates.length > 0 ? dates[0] : null;
    }

    useEffect(() => {
        const firstDate = getFirstDateOfWeekend(selectedWeekend);
        setSelectedDate(firstDate);
    }, []);

    useEffect(() => {
        const firstDate = getFirstDateOfWeekend(selectedWeekend);
        setSelectedDate(firstDate);
    }, [selectedWeekend]);

    async function searchTracks(artistId: string, artistName: string) {
        setSelectedArtist(artistName);
        setPopoverArtist(artistName);
        setIsPopoverOpen(true);

        try {
            const response = await fetch(`/api/spotify-search?artistId=${artistId}`);

            if (!response.ok) {
                console.log("Error fetching tracks");
                return;
            }

            const data = await response.json();
            setTracks((data.tracks || []).slice(0, 5));
            setPlayingTrack(null);
        } catch (err) {
            console.error("Error searching tracks:", err);
        }
    }

    function playTrack(track: Track) {
        setLoadingIFrame(true);
        setPlayingTrack(track);

        setTimeout(() => {
            setLoadingIFrame(false);
        }, 1000);
    }

    function handleIFrameLoad() {
        console.log("IFrame loaded");
        setLoadingIFrame(false);
    }

    function renderPerformance(performance: Performance) {
        const { artists } = performance;

        if (artists.length === 1) {
            // Single artist performance
            const artist = artists[0];
            return (
                <Popover
                    open={isPopoverOpen && popoverArtist === artist.name}
                    onOpenChange={setIsPopoverOpen}
                >
                    <PopoverTrigger>
                        <span
                            onClick={() => searchTracks(artist.artistId, artist.name)}
                            className="cursor-pointer"
                        >
                            {artist.name}
                        </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-sm">
                        {tracks.length > 0 && (
                            <ul className="space-y-2">
                                {tracks.map((track) => (
                                    <li
                                        key={`${track.id}test`}
                                        onClick={() => playTrack(track)}
                                        className="cursor-pointer"
                                    >
                                        {track.name} -{" "}
                                        {track.artists.map((artist) => artist.name).join(", ")}
                                    </li>
                                ))}
                                <div className="mt-3">
                                    {/* Spotify player inside popover */}
                                    {playingTrack ? (
                                        loadingIFrame ? (
                                            <Skeleton className="h-[80px] w-full rounded" />
                                        ) : (
                                            <iframe
                                                src={`https://open.spotify.com/embed/track/${playingTrack.id}?utm_source=generator&theme=0`}
                                                width="100%"
                                                height="80"
                                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                                loading="lazy"
                                                className="rounded"
                                                onLoad={() => handleIFrameLoad()}
                                                
                                            />
                                        )
                                    ) : (
                                        <Card className="h-[80px] py-0">
                                            <CardContent className="h-full flex items-center justify-center p-0">
                                                <p className="text-muted-foreground text-sm">
                                                    Click a song to play it
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </ul>
                        )}
                    </PopoverContent>
                </Popover>
            );
        } else {
            // B2B performance - multiple artists
            return (
                <span>
                    {artists.map((artist, index) => (
                        <span key={`${artist.artistId}`}>
                            <Popover
                                open={isPopoverOpen && popoverArtist === artist.name}
                                onOpenChange={setIsPopoverOpen}
                            >
                                <PopoverTrigger asChild>
                                    <span
                                        key={artist.artistId}
                                        onClick={() => searchTracks(artist.artistId, artist.name)}
                                        className="cursor-pointer"
                                    >
                                        {artist.name}
                                    </span>
                                </PopoverTrigger>
                                <PopoverContent className="w-sm">
                                    {tracks.length > 0 && (
                                        <ul className="space-y-2">
                                            {tracks.map((track) => (
                                                <li
                                                    key={`${track.id}test`}
                                                    onClick={() => playTrack(track)}
                                                    className="cursor-pointer"
                                                >
                                                    {track.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="mt-3">
                                        {/* Spotify player inside popover */}
                                        {playingTrack ? (
                                            <iframe
                                                src={`https://open.spotify.com/embed/track/${playingTrack.id}?utm_source=generator&theme=0`}
                                                width="100%"
                                                height="80"
                                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                                loading="lazy"
                                                className="rounded"
                                            />
                                        ) : (
                                            <Card className="h-[80px] py-0">
                                                <CardContent className="h-full flex items-center justify-center p-0">
                                                    <p className="text-muted-foreground text-sm">
                                                        Click a song to play it
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {index < artists.length - 1 && " b2b "}
                        </span>
                    ))}
                </span>
            );
        }
    }

    function getStagesByDate(date: string) {
        const dateData = LineupData[selectedWeekend][date];

        if (!dateData) {
            return null;
        }

        return (
            <>
                {Object.entries(dateData).map(([stageName, performances]) => (
                    <Card key={stageName} className="mb-6 text-center break-inside-avoid">
                        <CardHeader>
                            <CardTitle>{stageName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-1">
                                {performances.map((performance) => (
                                    <li key={performance.id} className="mt-2">
                                        {renderPerformance(performance)}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </>
        );
    }

    return (
        <div>
            <div className="container mx-auto px-4 flex flex-col items-center">
                <h1 className="text-2xl font-bold mb-4">Lineup Scout</h1>

                <ToggleGroup
                    type="single"
                    value={selectedWeekend}
                    onValueChange={setSelectedWeekend}
                >
                    <ToggleGroupItem variant="outline" value="week_1">
                        Weekend 1
                    </ToggleGroupItem>
                    <ToggleGroupItem variant="outline" value="week_2">
                        Weekend 2
                    </ToggleGroupItem>
                </ToggleGroup>

                <ToggleGroup
                    type="single"
                    value={selectedDate || ""}
                    onValueChange={setSelectedDate}
                >
                    {Object.keys(LineupData[selectedWeekend]).map((date) => (
                        <ToggleGroupItem key={date} variant="outline" value={date}>
                            {date}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>

                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 mt-4 w-[80%]">
                    {selectedDate && getStagesByDate(selectedDate)}
                </div>
            </div>
        </div>
    );
}

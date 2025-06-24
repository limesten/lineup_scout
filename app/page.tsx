"use client";

import { useState, useEffect } from "react";
import lineupData from "@/lib/lineup.json";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

        try {
            const response = await fetch(`/api/spotify-search?artistId=${artistId}`);

            if (!response.ok) {
                console.log("Error fetching tracks");
                return;
            }

            const data = await response.json();
            setTracks(data.tracks || []);
            setPlayingTrack(null);
        } catch (err) {
            console.error("Error searching tracks:", err);
        }
    }

    function playTrack(track: Track) {
        setPlayingTrack(track);
    }

    function renderPerformance(performance: Performance) {
        const { artists } = performance;

        if (artists.length === 1) {
            // Single artist performance
            const artist = artists[0];
            return (
                <span
                    onClick={() => searchTracks(artist.artistId, artist.name)}
                    className="cursor-pointer"
                >
                    {artist.name}
                </span>
            );
        } else {
            // B2B performance - multiple artists
            return (
                <span>
                    {artists.map((artist, index) => (
                        <span key={`${artist.artistId}`}>
                            <span
                                key={artist.artistId}
                                onClick={() => searchTracks(artist.artistId, artist.name)}
                                className="cursor-pointer"
                            >
                                {artist.name}
                            </span>
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
                                    <li key={performance.id} className="mt-2">{renderPerformance(performance)}</li>
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

                <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 mt-4 w-full">
                    {selectedDate && getStagesByDate(selectedDate)}
                </div>


                {/* Show currently selected artist */}
                {selectedArtist && (
                    <div className="mb-4">
                        <h3 className="text-lg font-medium">
                            Top tracks for: <span className="text-blue-600">{selectedArtist}</span>
                        </h3>
                    </div>
                )}

            </ div>

            {/* Track list */}
            <div>
                {tracks.length > 0 && (
                    <ul className="space-y-2">
                        {tracks.map((track) => (
                            <li
                                key={`${track.id}test`}
                                onClick={() => playTrack(track)}
                                className="cursor-pointer hover:underline text-green-600"
                            >
                                {track.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Spotify player */}
            {playingTrack && (
                <div style={{ marginTop: "2rem" }}>
                    <iframe
                        src={`https://open.spotify.com/embed/track/${playingTrack.id}?utm_source=generator&theme=0`}
                        width="320"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                    />
                </div>
            )}
        </div>
    );
}

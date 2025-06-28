"use client";

import { useState, useEffect, useRef } from "react";
import lineupData from "@/lib/lineup.json";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type {
    SpotifyIframeApi,
    SpotifyEmbedController,
    PlaybackUpdateData,
    PlaybackStartedData,
    SpotifyEvent,
} from "@/lib/spotify-types";

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
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [selectedWeekend, setSelectedWeekend] = useState<string>("week_1");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
    const [popoverArtist, setPopoverArtist] = useState<string | null>(null);
    const [loadingTracks, setLoadingTracks] = useState<boolean>(false);
    const embedRef = useRef<HTMLDivElement>(null);
    const spotifyEmbedControllerRef = useRef<SpotifyEmbedController | null>(null);
    const [iFrameAPI, setIFrameAPI] = useState<SpotifyIframeApi | undefined>(undefined);
    const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
    const [uri, setUri] = useState<string>("spotify:episode:7makk4oTQel546B0PZlDM5");
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://open.spotify.com/embed/iframe-api/v1";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (iFrameAPI) {
            return;
        }

        // Set up the global callback for when Spotify iframe API is ready
        window.onSpotifyIframeApiReady = (SpotifyIframeApi: SpotifyIframeApi) => {
            setIFrameAPI(SpotifyIframeApi);
        };
    }, [iFrameAPI]);

    useEffect(() => {
        if (playerLoaded || iFrameAPI === undefined) {
            return;
        }

        iFrameAPI.createController(
            embedRef.current,
            {
                width: "100%",
                height: "352",
                uri: uri,
            },
            (spotifyEmbedController: SpotifyEmbedController) => {
                spotifyEmbedController.addListener("ready", () => {
                    setPlayerLoaded(true);
                });

                const handlePlaybackUpdate = (e: SpotifyEvent<PlaybackUpdateData>) => {
                    const { position, duration, isBuffering, isPaused, playingURI } = e.data;
                    console.log(
                        `Playback State updates:
                position - ${position},
                duration - ${duration},
                isBuffering - ${isBuffering},
                isPaused - ${isPaused},
                playingURI - ${playingURI},
                duration - ${duration}`
                    );
                };

                spotifyEmbedController.addListener("playback_update", handlePlaybackUpdate);

                spotifyEmbedController.addListener(
                    "playback_started",
                    (e: SpotifyEvent<PlaybackStartedData>) => {
                        const { playingURI } = e.data;
                        console.log(`The playback has started for: ${playingURI}`);
                    }
                );

                spotifyEmbedControllerRef.current = spotifyEmbedController;
            }
        );

        return () => {
            if (spotifyEmbedControllerRef.current) {
                spotifyEmbedControllerRef.current.removeListener("playback_update");
            }
        };
    }, [playerLoaded, iFrameAPI, uri]);

    // Handle track changes
    useEffect(() => {
        if (spotifyEmbedControllerRef.current) {
            const spotifyUri = `spotify:track:${currentTrack?.id}`;
            setUri(spotifyUri);
            spotifyEmbedControllerRef.current.loadUri(spotifyUri);
            spotifyEmbedControllerRef.current.play();
            setIsPlaying(true);
        }
    }, [currentTrack]);

    const handlePlayPause = () => {
        if (!spotifyEmbedControllerRef.current) return;

        if (isPlaying) {
            spotifyEmbedControllerRef.current.pause();
            setIsPlaying(false);
        } else {
            spotifyEmbedControllerRef.current.play();
            setIsPlaying(true);
        }
    };

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
        setPopoverArtist(artistName);
        setIsPopoverOpen(true);
        setLoadingTracks(true);

        try {
            const response = await fetch(`/api/spotify-search?artistId=${artistId}`);

            if (!response.ok) {
                console.log("Error fetching tracks");
                return;
            }

            const data = await response.json();
            setTracks((data.tracks || []).slice(0, 5));
        } catch (err) {
            console.error("Error searching tracks:", err);
        } finally {
            setLoadingTracks(false);
        }
    }

    function playTrack(track: Track) {
        setCurrentTrack(track);
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
                            className="cursor-pointer hover:text-primary transition-colors"
                        >
                            {artist.name}
                        </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Top tracks by {artist.name}</h4>
                            {loadingTracks ? (
                                <div className="space-y-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))}
                                </div>
                            ) : tracks.length > 0 ? (
                                <ul className="space-y-1">
                                    {tracks.map((track) => (
                                        <li
                                            onClick={() => {
                                                playTrack(track);
                                                handlePlayPause();
                                            }}
                                            className="cursor-pointer p-2 rounded-md hover:bg-accent transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                {track.album.images.length > 0 && (
                                                    <img
                                                        src={
                                                            track.album.images[
                                                                track.album.images.length - 1
                                                            ].url
                                                        }
                                                        alt={track.album.name}
                                                        className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                                                    />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm truncate">
                                                        {track.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {track.artists
                                                            .map((artist) => artist.name)
                                                            .join(", ")}
                                                    </p>
                                                </div>

                                                {isPlaying && track.id === currentTrack?.id
                                                    ? "⏸️"
                                                    : "▶️"}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">No tracks found</p>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            );
        } else {
            // B2B performance - multiple artists
            return (
                <span>
                    {artists.map((artist, index) => (
                        <span key={artist.artistId}>
                            <Popover
                                open={isPopoverOpen && popoverArtist === artist.name}
                                onOpenChange={setIsPopoverOpen}
                            >
                                <PopoverTrigger asChild>
                                    <span
                                        onClick={() => searchTracks(artist.artistId, artist.name)}
                                        className="cursor-pointer hover:text-primary transition-colors"
                                    >
                                        {artist.name}
                                    </span>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">
                                            Top tracks by {artist.name}
                                        </h4>
                                        {loadingTracks ? (
                                            <div className="space-y-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <Skeleton key={i} className="h-10 w-full" />
                                                ))}
                                            </div>
                                        ) : tracks.length > 0 ? (
                                            <ul className="space-y-1">
                                                {tracks.map((track) => (
                                                    <li
                                                        key={track.id}
                                                        onClick={() => playTrack(track)}
                                                        className="cursor-pointer p-2 rounded-md hover:bg-accent transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {track.album.images.length > 0 && (
                                                                <img
                                                                    src={
                                                                        track.album.images[
                                                                            track.album.images
                                                                                .length - 1
                                                                        ].url
                                                                    }
                                                                    alt={track.album.name}
                                                                    className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                                                                />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-medium text-sm truncate">
                                                                    {track.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {track.artists
                                                                        .map(
                                                                            (artist) => artist.name
                                                                        )
                                                                        .join(", ")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No tracks found
                                            </p>
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
        <div className="container mx-auto px-4 flex flex-col items-center">
            <div>
                <div className="w-0 h-0 overflow-hidden">
                    <div ref={embedRef} />
                </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Lineup Scout</h1>

            <ToggleGroup type="single" value={selectedWeekend} onValueChange={setSelectedWeekend}>
                <ToggleGroupItem variant="outline" value="week_1">
                    Weekend 1
                </ToggleGroupItem>
                <ToggleGroupItem variant="outline" value="week_2">
                    Weekend 2
                </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup type="single" value={selectedDate || ""} onValueChange={setSelectedDate}>
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
    );
}

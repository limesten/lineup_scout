"use client";

import { useState, useEffect, useRef } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { LINEUP_DATES, Weekend } from "@/lib/lineup-settings";

import type {
    SpotifyIframeApi,
    SpotifyEmbedController,
    PlaybackStartedData,
    SpotifyEvent,
} from "@/lib/spotify-types";
import { CompleteLineup, LineupPerformance } from "@/lib/db-types";

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

/**
 * Utility function to detect iOS devices (including modern iPads)
 * Used to implement iOS-specific song playback behavior to work around
 * iOS autoplay restrictions (songs won't play if loading takes >1 second)
 */
function isIOSDevice(): boolean {
    if (typeof window === "undefined") return false;

    const userAgent = navigator.userAgent;

    // Traditional iOS detection
    if (/iPad|iPhone|iPod/.test(userAgent)) {
        return true;
    }

    // Modern iPad detection (iPadOS 13+ may identify as macOS)
    // Check for touch support + Safari on Mac (likely iPad)
    if (/Macintosh/.test(userAgent) && "ontouchend" in document) {
        return true;
    }

    return false;
}

interface LineupProps {
    lineupData: CompleteLineup;
}

export default function Lineup({ lineupData }: LineupProps) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [selectedWeekend, setSelectedWeekend] = useState<Weekend>("WEEKEND_1");
    const [selectedDate, setSelectedDate] = useState<string | null>(LINEUP_DATES.WEEKEND_1[0]);
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
    const [loadingTracks, setLoadingTracks] = useState<boolean>(false);

    const embedRef = useRef<HTMLDivElement>(null);
    const spotifyEmbedControllerRef = useRef<SpotifyEmbedController | null>(null);
    const [iFrameAPI, setIFrameAPI] = useState<SpotifyIframeApi | undefined>(undefined);
    const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
    const [uri, setUri] = useState<string>("spotify:track:7MIhUdNJtaOnDmC5nBC1fb");
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Common loading state for both iOS and non-iOS
    const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
    // iOS-specific ready state (still needed for manual play button)
    const [readyTrackId, setReadyTrackId] = useState<string | null>(null);

    const [isIOS, setIsIOS] = useState<boolean>(false);

    useEffect(() => {
        setIsIOS(isIOSDevice());
    }, []);

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

                spotifyEmbedController.addListener(
                    "playback_started",
                    (e: SpotifyEvent<PlaybackStartedData>) => {
                        const { playingURI } = e.data;

                        // Extract track ID from Spotify URI (format: "spotify:track:TRACK_ID")
                        const trackId = playingURI.split(":")[2];
                        if (trackId) {
                            // Clear loading state for both iOS and non-iOS
                            setLoadingTrackId(null);

                            if (isIOS) {
                                // On iOS, show manual play button (audio might not actually play due to restrictions)
                                setReadyTrackId(trackId);
                            } else {
                                // On non-iOS, track should already be playing automatically
                                setIsPlaying(true);
                            }
                        }
                    }
                );

                spotifyEmbedController.addListener("playback_update", (e) => {
                    if (e.data.position === e.data.duration) {
                        setIsPlaying(false);
                    }
                });

                spotifyEmbedControllerRef.current = spotifyEmbedController;
            }
        );

        return () => {
            if (spotifyEmbedControllerRef.current) {
                spotifyEmbedControllerRef.current.removeListener("playback_started");
                spotifyEmbedControllerRef.current.removeListener("ready");
            }
        };
    }, [playerLoaded, iFrameAPI, uri, isIOS, currentTrack]);

    // Handle track changes - show loading spinner for both platforms
    useEffect(() => {
        if (spotifyEmbedControllerRef.current && currentTrack) {
            const spotifyUri = `spotify:track:${currentTrack.id}`;
            setUri(spotifyUri);
            spotifyEmbedControllerRef.current.loadUri(spotifyUri);

            // Show loading state for both platforms
            setLoadingTrackId(currentTrack.id);
            setReadyTrackId(null); // Clear any previous iOS ready state
            setIsPlaying(false); // Reset playing state

            // Call play() to trigger the playback_started event
            // On iOS: This won't actually play audio if it takes >1sec, but events will fire
            // On non-iOS: This will auto-play and the playback_started event will confirm it
            spotifyEmbedControllerRef.current.play();
        }
    }, [currentTrack, isIOS]);

    const handleWeekendChange = (newWeekend: Weekend) => {
        if (!newWeekend) {
            return;
        }
        setSelectedWeekend(newWeekend);
        const firstDate = LINEUP_DATES[newWeekend][0];
        setSelectedDate(firstDate);
    };

    async function searchTracks(spotifyUrl: string | null, popoverId: string) {
        setOpenPopoverId(popoverId);
        setLoadingTracks(true);

        if (!spotifyUrl || spotifyUrl.trim() === "") {
            setTracks([]);
            setLoadingTracks(false);
            return;
        }

        // This is an iOS workaround to load the first song after page refresh
        if (isIOS) {
            spotifyEmbedControllerRef.current?.loadUri("spotify:track:7MIhUdNJtaOnDmC5nBC1fb");
        }

        const url = new URL(spotifyUrl);
        const pathSegments = url.pathname.split("/").filter(Boolean);
        const artistId = pathSegments[pathSegments.length - 1];

        try {
            const response = await fetch(`/api/spotify-search?artistId=${artistId}`);

            if (!response.ok) {
                console.log("Error fetching tracks");
                setTracks([]);
                return;
            }

            const data = await response.json();

            setTracks((data.tracks || []).slice(0, 5));
        } catch (err) {
            setTracks([]);
            console.error("Error searching tracks:", err);
        } finally {
            setLoadingTracks(false);
        }
    }

    function playTrack(track: Track) {
        setCurrentTrack(track);
    }

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

    // iOS-specific manual play function
    // This is called when user taps the green play button after track is ready
    const handleIOSManualPlay = () => {
        if (!spotifyEmbedControllerRef.current) return;

        // This play() call should work because it's triggered by user gesture
        spotifyEmbedControllerRef.current.play();
        setIsPlaying(true);
        setReadyTrackId(null); // Clear ready state as it's now playing
    };

    function handlePopoverChange(open: boolean, popoverId: string) {
        if (open) {
            setOpenPopoverId(popoverId);
        } else {
            setOpenPopoverId(null);
            if (isPlaying) {
                setCurrentTrack(null);
                spotifyEmbedControllerRef.current?.pause();
            }
        }
    }

    function handleTrackClick(track: Track) {
        // Don't allow clicking if track is currently loading
        if (loadingTrackId === track.id) {
            return;
        }

        if (currentTrack?.id === track.id) {
            // Same track clicked
            if (isIOS && readyTrackId === track.id) {
                // iOS: Track is ready to play manually
                handleIOSManualPlay();
            } else if (isPlaying || !isIOS) {
                // Both platforms: Toggle play/pause for playing tracks
                // Non-iOS: Always allow toggle since tracks auto-play
                handlePlayPause();
            }
        } else {
            // Different track clicked - load it
            playTrack(track);
        }
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

    function TrackList(tracks: Track[]) {
        return (
            <ul className="space-y-1">
                {tracks.map((track) => {
                    // Determine if this track is currently playing (for visualizer)
                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;

                    const getTrackIcon = () => {
                        if (loadingTrackId === track.id) {
                            return (
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                            );
                        }

                        if (isTrackPlaying) {
                            return <AudioVisualizer className="w-6 h-4" />;
                        }

                        return "";
                    };

                    // Track is clickable unless it's currently loading
                    const isClickable = loadingTrackId !== track.id;

                    return (
                        <li
                            key={track.id}
                            onClick={() => isClickable && handleTrackClick(track)}
                            className={`${
                                isClickable
                                    ? "cursor-pointer hover:bg-accent"
                                    : "cursor-not-allowed opacity-75"
                            } p-2 rounded-md transition-colors relative`}
                        >
                            {/* Semi-transparent visualizer background overlay when playing */}
                            {isTrackPlaying && (
                                <div className="absolute inset-0 bg-primary/5 rounded-md pointer-events-none">
                                    <div className="absolute inset-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-sm" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 relative z-10">
                                {/* Album image */}
                                {track.album.images.length > 0 && (
                                    <img
                                        src={track.album.images[track.album.images.length - 1].url}
                                        alt={track.album.name}
                                        className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                                    />
                                )}

                                {/* Track info - clickable area */}
                                <div className="min-w-0 flex-1">
                                    <p
                                        className={`font-medium text-sm truncate ${
                                            isTrackPlaying ? "text-primary" : ""
                                        }`}
                                    >
                                        {track.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {track.artists.map((artist) => artist.name).join(", ")}
                                    </p>
                                    {/* Loading message for both platforms */}
                                    {isIOS && loadingTrackId === track.id && (
                                        <p className="text-xs text-blue-500 mt-1">
                                            Loading track...
                                        </p>
                                    )}
                                    {/* iOS-specific ready message */}
                                    {isIOS && readyTrackId === track.id && (
                                        <p className="text-xs text-green-500 mt-1">
                                            Ready to play! Tap to start
                                        </p>
                                    )}
                                </div>

                                {getTrackIcon()}
                            </div>
                        </li>
                    );
                })}
            </ul>
        );
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
                    {artists.map((artist, index) => {
                        const popoverId = `${performance.id}-${artist.id}`;

                        return (
                            <span key={popoverId}>
                                <Popover
                                    open={openPopoverId === popoverId}
                                    onOpenChange={(open) => handlePopoverChange(open, popoverId)}
                                >
                                    <PopoverTrigger asChild>
                                        <span
                                            onClick={() => searchTracks(artist.spotify, popoverId)}
                                            className="cursor-pointer hover:text-primary transition-colors font-semibold"
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
                                                TrackList(tracks)
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No tracks found
                                                </p>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {index < artists.length - 1 && separator}
                            </span>
                        );
                    })}
                </span>
                <span className="text-xs">
                    {formatCESTTime(performance.startTime)} - {formatCESTTime(performance.endTime)}
                </span>
            </div>
        );
    }

    function getStagesByDate(date: string) {
        if (!date) return {};

        const dayPerformances = lineupData[selectedWeekend].filter((performance) => {
            // Convert UTC startTime to CEST to determine festival day
            const startTimeUTC = new Date(performance.startTime);
            const startTimeCEST = new Intl.DateTimeFormat("sv-SE", {
                timeZone: "Europe/Stockholm", // CEST timezone
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
            const festivalCutoffHour = 6; // 6:00 AM - adjust this as needed
            const performanceHour = parseInt(hourCEST);

            let festivalDate: string;

            if (performanceHour < festivalCutoffHour) {
                // Early morning performance (00:00-05:59) - belongs to previous day
                const previousDay = new Date(startTimeCEST);
                previousDay.setDate(previousDay.getDate() - 1);
                festivalDate = previousDay.toISOString().split("T")[0];
            } else {
                // Regular performance (06:00-23:59) - belongs to same day
                festivalDate = startTimeCEST;
            }

            return festivalDate === date;
        });

        const groupedByStage: { [stageName: string]: LineupPerformance[] } = {};

        dayPerformances.forEach((performance) => {
            const stageName = performance.stage.name;
            if (!groupedByStage[stageName]) {
                groupedByStage[stageName] = [];
            }
            groupedByStage[stageName].push(performance);
        });

        const stageOrder = [
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

        const sortedStageNames = Object.keys(groupedByStage).sort((stageNameA, stageNameB) => {
            const priorityA = stageOrder.indexOf(stageNameA);
            const priorityB = stageOrder.indexOf(stageNameB);

            // If stage not found in order, put it at the end
            const finalPriorityA = priorityA === -1 ? 999 : priorityA;
            const finalPriorityB = priorityB === -1 ? 999 : priorityB;

            return finalPriorityA - finalPriorityB;
        });

        // Create new ordered object
        const orderedGroupedByStage: { [stageName: string]: LineupPerformance[] } = {};
        sortedStageNames.forEach((stageName) => {
            orderedGroupedByStage[stageName] = groupedByStage[stageName];
        });

        return orderedGroupedByStage;
    }

    return (
        <div className="container mx-auto px-4 flex flex-col items-center">
            <div className="w-0 h-0 overflow-hidden">
                <div ref={embedRef} />
            </div>

            <ToggleGroup
                type="single"
                value={selectedWeekend}
                onValueChange={handleWeekendChange}
                className="mb-2"
            >
                <ToggleGroupItem variant="outline" value="WEEKEND_1" className="cursor-pointer">
                    Weekend 1
                </ToggleGroupItem>
                <ToggleGroupItem variant="outline" value="WEEKEND_2" className="cursor-pointer">
                    Weekend 2
                </ToggleGroupItem>
            </ToggleGroup>

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

            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 mt-5 w-[80%]">
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
        </div>
    );
}

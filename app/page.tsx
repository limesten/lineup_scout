"use client";

import { useState, useEffect, useRef } from "react";
import lineupData from "@/lib/lineup.json";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import type {
    SpotifyIframeApi,
    SpotifyEmbedController,
    PlaybackStartedData,
    SpotifyEvent,
} from "@/lib/spotify-types";

const LineupData: LineupData = lineupData;

/**
 * Utility function to detect iOS devices (including modern iPads)
 * Used to implement iOS-specific song playback behavior to work around
 * iOS autoplay restrictions (songs won't play if loading takes >1 second)
 */
function isIOSDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent;
    
    // Traditional iOS detection
    if (/iPad|iPhone|iPod/.test(userAgent)) {
        return true;
    }
    
    // Modern iPad detection (iPadOS 13+ may identify as macOS)
    // Check for touch support + Safari on Mac (likely iPad)
    if (/Macintosh/.test(userAgent) && 'ontouchend' in document) {
        return true;
    }
    
    // Additional iPad detection using platform API if available
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
        return true;
    }
    
    return false;
}

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

/**
 * AudioVisualizer component - displays animated bars when music is playing
 * Each bar has its own unique animation pattern for realistic audio visualization
 */
function AudioVisualizer({ className = "" }: { className?: string }) {
    const bars = [
        { height: 12, animationClass: 'visualizer-bar-1' },
        { height: 20, animationClass: 'visualizer-bar-2' },
        { height: 16, animationClass: 'visualizer-bar-3' },
        { height: 24, animationClass: 'visualizer-bar-4' },
        { height: 14, animationClass: 'visualizer-bar-5' }
    ];
    
    return (
        <div className={`inline-flex items-end gap-[1px] ${className}`}>
            {bars.map((bar, i) => (
                <div
                    key={i}
                    className={`w-[2px] bg-primary/80 rounded-full ${bar.animationClass}`}
                    style={{
                        height: `${bar.height}px`,
                        transformOrigin: 'bottom'
                    }}
                />
            ))}
        </div>
    );
}

export default function Home() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [selectedWeekend, setSelectedWeekend] = useState<string>("week_1");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
    const [loadingTracks, setLoadingTracks] = useState<boolean>(false);

    const embedRef = useRef<HTMLDivElement>(null);
    const spotifyEmbedControllerRef = useRef<SpotifyEmbedController | null>(null);
    const [iFrameAPI, setIFrameAPI] = useState<SpotifyIframeApi | undefined>(undefined);
    const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
    const [uri, setUri] = useState<string>("spotify:episode:7makk4oTQel546B0PZlDM5");
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
                    // Note: On iOS, we use the "playback_started" event instead of "ready" 
                    // to transition from loading to ready state
                });

                spotifyEmbedController.addListener(
                    "playback_started",
                    (e: SpotifyEvent<PlaybackStartedData>) => {
                        const { playingURI } = e.data;
                        
                        // Extract track ID from Spotify URI (format: "spotify:track:TRACK_ID")
                        const trackId = playingURI.split(':')[2];
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

    useEffect(() => {
        const firstDate = getFirstDateOfWeekend(selectedWeekend);
        setSelectedDate(firstDate);
    }, [selectedWeekend]);

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

    function getFirstDateOfWeekend(weekend: string): string | null {
        try {
            const weekData = LineupData[weekend as keyof LineupData];
            if (!weekData) return null;

            const dates = Object.keys(weekData);
            return dates.length > 0 ? dates[0] : null;
        } catch (error) {
            console.error("Error getting first date of weekend:", error);
            return null;
        }
    }

    async function searchTracks(artistId: string, popoverId: string) {
        setOpenPopoverId(popoverId);
        setLoadingTracks(true);

        if (!artistId || artistId.trim() === "") {
            setTracks([]);
            setLoadingTracks(false);
            return;
        }

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
            setCurrentTrack(null);
            spotifyEmbedControllerRef.current?.pause();
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
        const formattedDate = dateObj.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

        return formattedDate;
    }

    function TrackList(tracks: Track[]) {
        return (
            <ul className="space-y-1">
                {tracks.map((track) => {
                    // Determine if this track is currently playing (for visualizer)
                    const isTrackPlaying = currentTrack?.id === track.id && isPlaying;
                    
                    const getTrackIcon = () => {
                        // Show loading spinner for both iOS and non-iOS
                        if (loadingTrackId === track.id) {
                            return (
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                            );
                        }
                        
                        // Show audio visualizer when track is playing
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
                                isClickable ? "cursor-pointer hover:bg-accent" : "cursor-not-allowed opacity-75"
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
                                    <p className={`font-medium text-sm truncate ${isTrackPlaying ? 'text-primary' : ''}`}>
                                        {track.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {track.artists.map((artist) => artist.name).join(", ")}
                                    </p>
                                    {/* Loading message for both platforms */}
                                    {isIOS && loadingTrackId === track.id && (
                                        <p className="text-xs text-blue-500 mt-1">Loading track...</p>
                                    )}
                                    {/* iOS-specific ready message */}
                                    {isIOS && readyTrackId === track.id && (
                                        <p className="text-xs text-green-500 mt-1">Ready to play! Tap to start</p>
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

    function Performance(performance: Performance) {
        const { artists } = performance;

        return (
            <span>
                {artists.map((artist, index) => {
                    const popoverId = `${performance.id}-${artist.name}-${index}`;
                    
                    return (
                        <span key={popoverId}>
                            <Popover
                                open={openPopoverId === popoverId}
                                onOpenChange={(open) => handlePopoverChange(open, popoverId)}
                            >
                                <PopoverTrigger asChild>
                                    <span
                                        onClick={() => searchTracks(artist.artistId, popoverId)}
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
                                            TrackList(tracks)
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
                    );
                })}
            </span>
        );
    }

    function getStagesByDate(date: string) {
        if (!LineupData[selectedWeekend]) {
            return null;
        }

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
                                        {Performance(performance)}
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
            <h1 className="text-2xl font-bold mt-4">Tomorrowland 2025 Lineup Explorer</h1>
            <p className="text-md text-muted-foreground mb-4 italic">Find your vibe</p>

            <ToggleGroup
                type="single"
                value={selectedWeekend}
                onValueChange={setSelectedWeekend}
                className="mb-2"
            >
                <ToggleGroupItem variant="outline" value="week_1" className="cursor-pointer">
                    Weekend 1
                </ToggleGroupItem>
                <ToggleGroupItem variant="outline" value="week_2" className="cursor-pointer">
                    Weekend 2
                </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup type="single" value={selectedDate || ""} onValueChange={setSelectedDate}>
                {selectedWeekend ?
                    Object.keys(LineupData[selectedWeekend]).map((date) => (
                        <ToggleGroupItem key={date} variant="outline" value={date} className="cursor-pointer">
                            <p suppressHydrationWarning>{formatDate(date)}</p>
                        </ToggleGroupItem>
                    ))
                : null}
            </ToggleGroup>

            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 mt-5 w-[80%]">
                {selectedDate && getStagesByDate(selectedDate)}
            </div>
        </div>
    );
}

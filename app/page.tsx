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
    
    const [isIOS, setIsIOS] = useState<boolean>(false);
    const [iOSLoadingTrack, setIOSLoadingTrack] = useState<string | null>(null);
    const [iOSReadyTrack, setIOSReadyTrack] = useState<string | null>(null);

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
                        console.log(`The playback has started for: ${playingURI}`);
                        
                        // On iOS, use this event to stop loading and show manual play button
                        // (audio might not actually play due to iOS restrictions, but event still fires)
                        if (isIOS) {
                            // Extract track ID from Spotify URI (format: "spotify:track:TRACK_ID")
                            const trackId = playingURI.split(':')[2];
                            if (trackId) {
                                setIOSLoadingTrack(null);
                                setIOSReadyTrack(trackId); // Show manual play button
                            }
                        }
                    }
                );

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

    // Handle track changes - modified for iOS behavior
    useEffect(() => {
        if (spotifyEmbedControllerRef.current && currentTrack) {
            const spotifyUri = `spotify:track:${currentTrack.id}`;
            setUri(spotifyUri);
            spotifyEmbedControllerRef.current.loadUri(spotifyUri);
            
            // On iOS, show loading state but still call play() to trigger events
            if (isIOS) {
                setIOSLoadingTrack(currentTrack.id);
                setIOSReadyTrack(null);
                setIsPlaying(false); // UI shows as not playing even though we call play()
                
                // Still call play() to trigger the playback_started event
                // This won't actually play audio on iOS if it takes >1sec, but events will fire
                spotifyEmbedControllerRef.current.play();
            } else {
                // On non-iOS devices, auto-play as before
                spotifyEmbedControllerRef.current.play();
                setIsPlaying(true);
            }
        }
    }, [currentTrack, isIOS]);

    function getFirstDateOfWeekend(weekend: string): string | null {
        const weekData = LineupData[weekend as keyof LineupData];
        if (!weekData) return null;

        const dates = Object.keys(weekData);
        return dates.length > 0 ? dates[0] : null;
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
    const handleIOSManualPlay = (track: Track) => {
        if (!spotifyEmbedControllerRef.current) return;
        
        // This play() call should work because it's triggered by user gesture
        spotifyEmbedControllerRef.current.play();
        setIsPlaying(true);
        setIOSReadyTrack(null); // Clear ready state as it's now playing
    };

    function handleTrackClick(track: Track) {
        // Handle iOS different from other devices
        if (isIOS) {
            if (currentTrack?.id === track.id) {
                // Same track clicked on iOS
                if (iOSReadyTrack === track.id) {
                    // Track is ready to play manually
                    handleIOSManualPlay(track);
                } else if (isPlaying) {
                    // Track is playing, pause it
                    handlePlayPause();
                } else if (!iOSLoadingTrack) {
                    // Track is paused, resume
                    handlePlayPause();
                }
                // If track is loading, do nothing (user will wait for loading to complete)
            } else {
                // Different track clicked on iOS - load it
                playTrack(track);
            }
        } else {
            // Non-iOS behavior (existing logic)
            if (currentTrack?.id === track.id) {
                handlePlayPause();
            } else {
                playTrack(track);
            }
        }
    }

    function TrackList(tracks: Track[]) {
        return (
            <ul className="space-y-1">
                {tracks.map((track) => {
                    // Determine the icon/state to show for this track
                    const getTrackIcon = () => {
                        if (isIOS) {
                            // iOS-specific logic
                            if (iOSLoadingTrack === track.id) {
                                return (
                                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                );
                            }
                            if (iOSReadyTrack === track.id) {
                                return <span className="text-green-500">▶️</span>; // Green play button when ready
                            }
                            if (currentTrack?.id === track.id && isPlaying) {
                                return "⏸️";
                            }
                            return "▶️";
                        } else {
                            // Non-iOS behavior (existing logic)
                            return currentTrack?.id === track.id && isPlaying ? "⏸️" : "▶️";
                        }
                    };

                    const isClickable = !isIOS || iOSLoadingTrack !== track.id;

                    return (
                        <li
                            key={track.id}
                            onClick={() => isClickable && handleTrackClick(track)}
                            className={`${
                                isClickable ? "cursor-pointer hover:bg-accent" : "cursor-not-allowed opacity-75"
                            } p-2 rounded-md transition-colors`}
                        >
                            <div className="flex items-center gap-2">
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
                                    <p className="font-medium text-sm truncate">{track.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {track.artists.map((artist) => artist.name).join(", ")}
                                    </p>
                                    {/* iOS-specific loading message */}
                                    {isIOS && iOSLoadingTrack === track.id && (
                                        <p className="text-xs text-blue-500 mt-1">Loading track...</p>
                                    )}
                                    {/* iOS-specific ready message */}
                                    {isIOS && iOSReadyTrack === track.id && (
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
                                onOpenChange={(open) => {
                                    if (open) {
                                        setOpenPopoverId(popoverId);
                                    } else {
                                        setOpenPopoverId(null);
                                        spotifyEmbedControllerRef.current?.pause();
                                    }
                                }}
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
            <h1 className="text-2xl font-bold mb-4">Tomorrowland 2025 Lineup Explorer</h1>

            <ToggleGroup
                type="single"
                value={selectedWeekend}
                onValueChange={setSelectedWeekend}
                className="mb-2"
            >
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

            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 mt-5 w-[80%]">
                {selectedDate && getStagesByDate(selectedDate)}
            </div>
        </div>
    );
}

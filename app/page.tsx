"use client";

import { useState } from "react";
import lineupData from "@/lib/lineup.json";

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
    week: string;
    date: string;
    stage: string;
}

export default function Home() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);


    async function searchTracks(artistId: string, artistName: string) {
        setSelectedArtist(artistName);
             
        try {
            const response = await fetch(
                `/api/spotify-search?artistId=${artistId}`
            );
            
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
                    className="cursor-pointer hover:underline text-blue-600"
                >
                    {artist.name}
                </span>
            );
        } else {
            // B2B performance - multiple artists
            return (
                <span>
                    {artists.map((artist, index) => (
                        <span key={`${performance.week}-${performance.date}-${performance.stage}-${artist.artistId}`}>
                            <span
                                key={artist.artistId}
                                onClick={() => searchTracks(artist.artistId, artist.name)}
                                className="cursor-pointer hover:underline text-blue-600"
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

    // Get all performances from the lineup data
    function getAllPerformances(): Performance[] {
        const performances: Performance[] = [];
        
        try {
            // More robust way to handle the nested structure
            for (const weekKey in lineupData) {
                const week = lineupData[weekKey as keyof typeof lineupData];
                
                for (const dateKey in week) {
                    const date = week[dateKey as keyof typeof week];
                    
                    for (const stageKey in date) {
                        const stagePerformances = date[stageKey as keyof typeof date];
                        
                        if (Array.isArray(stagePerformances)) {
                            stagePerformances.forEach((performance: any, index: number) => {
                                // Create a unique key combining all context + index for extra safety
                                const uniqueKey = `${weekKey}-${dateKey}-${stageKey}-${performance.id || index}`;
                                
                                performances.push({
                                    ...performance,
                                    week: weekKey,
                                    date: dateKey,
                                    stage: stageKey,
                                    uniqueKey: uniqueKey
                                });
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error processing lineup data:", error);
        }
        
        return performances;
    }

    const allPerformances = getAllPerformances();

    return (
        <div>
            <div>
                <h1 className="text-2xl font-bold mb-4">Lineup Scout</h1>
                
                {/* Render all artists from lineup */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Artists:</h2>
                    <div className="space-y-2">
                        {allPerformances.map((performance) => (
                            <div key={`${performance.week}-${performance.date}-${performance.stage}-${performance.id}`} className="text-lg">
                                {renderPerformance(performance)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Show currently selected artist */}
                {selectedArtist && (
                    <div className="mb-4">
                        <h3 className="text-lg font-medium">
                            Top tracks for: <span className="text-blue-600">{selectedArtist}</span>
                        </h3>
                    </div>
                )}
            </div>

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

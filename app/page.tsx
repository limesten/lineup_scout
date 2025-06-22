"use client";

import { useState } from "react";

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

export default function Home() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [playingTrack, setPlayingTrack] = useState<Track | null>(null);

    // Search for tracks directly
    async function searchTracks(artistId: string) {
        const query = "charlotte de witte";
             
        try {
            const response = await fetch(
                `/api/spotify-search?query=${encodeURIComponent(query)}&type=tracks&artistId=${artistId}`
            );
            
            if (!response.ok) {
                console.log("Error fetching tracks");
                return;
            }
            
            const data = await response.json();
            setTracks((data.tracks || []).slice(0, 3));
            setPlayingTrack(null);
        } catch (err) {
            console.error("Error searching tracks:", err);
        }
    }

    // Play selected track
    function playTrack(track: Track) {
        setPlayingTrack(track);
    }

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <p onClick={() => searchTracks("1lJhME1ZpzsEa5M0wW6Mso")} key="1lJhME1ZpzsEa5M0wW6Mso">Charlotte de Witte</p>
            <ul>
                {tracks.map((track) => (
                    <li key={track.id} onClick={() => playTrack(track)}>
                        {track.name}
                    </li>
                ))}
            </ul>
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

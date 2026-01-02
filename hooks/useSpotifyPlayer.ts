'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpotifyPlayer, PlaybackState } from '@/lib/spotify-playback-types';

interface UseSpotifyPlayerReturn {
    player: SpotifyPlayer | null;
    deviceId: string | null;
    isReady: boolean;
    playbackState: PlaybackState | null;
    error: string | null;
    play: (spotifyUri: string) => Promise<void>;
}

export function useSpotifyPlayer(isAuthenticated: boolean): UseSpotifyPlayerReturn {
    const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scriptRef = useRef<HTMLScriptElement | null>(null);
    const playerRef = useRef<SpotifyPlayer | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        // Check if SDK script is already loaded
        if (document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        scriptRef.current = script;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const newPlayer = new window.Spotify.Player({
                name: 'Lineup Scout Player',
                getOAuthToken: async (cb) => {
                    try {
                        const res = await fetch('/api/auth/spotify/token');
                        if (res.ok) {
                            const { accessToken } = await res.json();
                            cb(accessToken);
                        } else {
                            setError('Failed to get access token');
                        }
                    } catch {
                        setError('Failed to get access token');
                    }
                },
                volume: 0.5,
            });

            newPlayer.addListener('ready', ({ device_id }) => {
                setDeviceId(device_id);
                setIsReady(true);
                setError(null);
            });

            newPlayer.addListener('not_ready', () => {
                setIsReady(false);
            });

            newPlayer.addListener('player_state_changed', (state) => {
                setPlaybackState(state);
            });

            newPlayer.addListener('initialization_error', ({ message }) => {
                setError(`Initialization error: ${message}`);
            });

            newPlayer.addListener('authentication_error', ({ message }) => {
                setError(`Authentication error: ${message}`);
            });

            newPlayer.addListener('account_error', ({ message }) => {
                setError(`Premium required: ${message}`);
            });

            newPlayer.addListener('playback_error', ({ message }) => {
                setError(`Playback error: ${message}`);
            });

            newPlayer.connect();
            setPlayer(newPlayer);
            playerRef.current = newPlayer;
        };

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
                playerRef.current = null;
            }
        };
    }, [isAuthenticated]);

    const play = useCallback(async (spotifyUri: string) => {
        if (!deviceId) {
            setError('Player not ready');
            return;
        }

        try {
            const tokenRes = await fetch('/api/auth/spotify/token');
            if (!tokenRes.ok) {
                setError('Failed to get access token');
                return;
            }
            const { accessToken } = await tokenRes.json();

            const response = await fetch(
                `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ uris: [spotifyUri] }),
                }
            );

            if (!response.ok && response.status !== 204) {
                const errorText = await response.text();
                console.error('Play error:', errorText);
                setError('Failed to play track');
            }
        } catch (err) {
            console.error('Play error:', err);
            setError('Failed to play track');
        }
    }, [deviceId]);

    return {
        player,
        deviceId,
        isReady,
        playbackState,
        error,
        play,
    };
}

export interface SpotifyPlayer {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'player_state_changed', callback: (state: PlaybackState | null) => void): void;
    addListener(event: 'initialization_error', callback: (data: { message: string }) => void): void;
    addListener(event: 'authentication_error', callback: (data: { message: string }) => void): void;
    addListener(event: 'account_error', callback: (data: { message: string }) => void): void;
    addListener(event: 'playback_error', callback: (data: { message: string }) => void): void;
    removeListener(event: string): void;
    getCurrentState(): Promise<PlaybackState | null>;
    setName(name: string): void;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
}

export interface PlaybackState {
    context: {
        uri: string | null;
        metadata: Record<string, unknown>;
    };
    disallows: {
        pausing: boolean;
        peeking_next: boolean;
        peeking_prev: boolean;
        resuming: boolean;
        seeking: boolean;
        skipping_next: boolean;
        skipping_prev: boolean;
    };
    paused: boolean;
    position: number;
    duration: number;
    repeat_mode: number;
    shuffle: boolean;
    track_window: {
        current_track: WebPlaybackTrack;
        previous_tracks: WebPlaybackTrack[];
        next_tracks: WebPlaybackTrack[];
    };
}

export interface WebPlaybackTrack {
    uri: string;
    id: string | null;
    type: string;
    media_type: string;
    name: string;
    is_playable: boolean;
    album: {
        uri: string;
        name: string;
        images: { url: string }[];
    };
    artists: { uri: string; name: string }[];
}

declare global {
    interface Window {
        Spotify: {
            Player: new (options: {
                name: string;
                getOAuthToken: (cb: (token: string) => void) => void;
                volume?: number;
            }) => SpotifyPlayer;
        };
        onSpotifyWebPlaybackSDKReady?: () => void;
    }
}

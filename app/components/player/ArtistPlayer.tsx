'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Music, Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YouTubeTab } from './YouTubeTab';
import type {
    SpotifyIframeApi,
    SpotifyEmbedController,
} from '@/lib/spotify-types';

interface ArtistPlayerProps {
    artistName: string;
    spotifyId: string;
    onClose: () => void;
}

export function ArtistPlayer({
    artistName,
    spotifyId,
    onClose,
}: ArtistPlayerProps) {
    const [activeTab, setActiveTab] = useState<string>('spotify');
    const embedRef = useRef<HTMLDivElement>(null);
    const spotifyControllerRef = useRef<SpotifyEmbedController | null>(null);
    const [iFrameAPI, setIFrameAPI] = useState<SpotifyIframeApi | undefined>(
        undefined,
    );
    const [playerLoaded, setPlayerLoaded] = useState(false);

    // Load Spotify iframe API script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://open.spotify.com/embed/iframe-api/v1';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Set up global callback for Spotify iframe API
    useEffect(() => {
        if (iFrameAPI) return;

        window.onSpotifyIframeApiReady = (api: SpotifyIframeApi) => {
            setIFrameAPI(api);
        };
    }, [iFrameAPI]);

    // Initialize/update Spotify player
    useEffect(() => {
        if (!iFrameAPI || !embedRef.current || !spotifyId) return;

        if (spotifyControllerRef.current && playerLoaded) {
            spotifyControllerRef.current.loadUri(
                `spotify:artist:${spotifyId}`,
            );
            return;
        }

        iFrameAPI.createController(
            embedRef.current,
            {
                width: '100%',
                height: '352',
                uri: `spotify:artist:${spotifyId}`,
            },
            (controller: SpotifyEmbedController) => {
                controller.addListener('ready', () => setPlayerLoaded(true));
                spotifyControllerRef.current = controller;
            },
        );

        return () => {
            if (spotifyControllerRef.current) {
                spotifyControllerRef.current.removeListener('ready');
            }
        };
    }, [iFrameAPI, spotifyId, playerLoaded]);

    // Pause Spotify when switching to YouTube tab
    useEffect(() => {
        if (activeTab === 'youtube' && spotifyControllerRef.current) {
            spotifyControllerRef.current.pause();
        }
    }, [activeTab]);

    function handleClose() {
        if (spotifyControllerRef.current) {
            spotifyControllerRef.current.pause();
        }
        spotifyControllerRef.current = null;
        onClose();
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
            <div className="relative">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-accent transition-colors"
                    aria-label="Close player"
                >
                    <X className="w-5 h-5" />
                </button>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="px-4 pt-2 flex items-center gap-3">
                        <p className="text-sm font-semibold truncate">
                            {artistName}
                        </p>
                        <TabsList>
                            <TabsTrigger
                                value="spotify"
                                className="gap-1.5 cursor-pointer"
                            >
                                <Music className="w-3.5 h-3.5" />
                                Spotify
                            </TabsTrigger>
                            <TabsTrigger
                                value="youtube"
                                className="gap-1.5 cursor-pointer"
                            >
                                <Video className="w-3.5 h-3.5" />
                                YouTube
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent
                        value="spotify"
                        className="mt-0"
                        forceMount
                        style={{
                            display:
                                activeTab === 'spotify' ? 'block' : 'none',
                        }}
                    >
                        <div ref={embedRef} className="w-full bg-[#121212] rounded-xl overflow-hidden" />
                    </TabsContent>

                    <TabsContent value="youtube" className="mt-0">
                        <YouTubeTab artistName={artistName} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

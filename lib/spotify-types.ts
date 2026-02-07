// TypeScript definitions for Spotify iframe API
// Based on the official Spotify Web Playback SDK documentation and iframe API usage


  
  /**
   * Event data structure for playback started events
   */
  export interface PlaybackStartedData {
    playingURI: string;
  }
  
  /**
   * Generic event structure for Spotify iframe API events
   */
  export interface SpotifyEvent<T = Record<string, unknown>> {
    data: T;
  }
  
  /**
   * Event listener types for different Spotify iframe API events
   */
  export type SpotifyEventListener<T = Record<string, unknown>> = (event: SpotifyEvent<T>) => void;
  
  /**
   * Configuration options for creating a Spotify iframe controller
   */
  export interface SpotifyControllerOptions {
    width: string | number;
    height: string | number;
    uri?: string;
    theme?: string;
  }
  
  /**
   * Spotify iframe controller interface with all available methods
   */
  export interface SpotifyEmbedController {
    /**
     * Add an event listener for specific Spotify iframe API events
     */
    addListener(event: "ready", listener: () => void): void;
    addListener(event: "playback_started", listener: SpotifyEventListener<PlaybackStartedData>): void;
    addListener(event: string, listener: SpotifyEventListener): void;
  
    /**
     * Remove an event listener for specific events
     */
    removeListener(event: string, listener?: SpotifyEventListener): void;
  
    /**
     * Control playback methods
     */
    play(): void;
    pause(): void;
    
    /**
     * Load a new URI (track, playlist, album, etc.)
     */
    loadUri(uri: string): void;
  }
  
  /**
   * Callback function type for when the Spotify iframe controller is created
   */
  export type SpotifyControllerCallback = (controller: SpotifyEmbedController) => void;
  
  /**
   * Main Spotify iframe API interface
   */
  export interface SpotifyIframeApi {
    /**
     * Create a new Spotify iframe controller
     */
    createController(
      element: HTMLElement | null,
      options: SpotifyControllerOptions,
      callback: SpotifyControllerCallback
    ): void;
  }
  
  /**
   * Global window interface extension for Spotify iframe API
   */
  declare global {
    interface Window {
      onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
    }
  }
  
  export {}; 
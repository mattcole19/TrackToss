export interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: Array<{
    url: string;
    height: number | null;
    width: number | null;
  }> | null;
  tracks: {
    total: number;
  };
  type: 'playlist' | 'liked';
  collaborative: boolean;
  owner: {
    external_urls: {
      spotify: string;
    };
    href: string;
    id: string;
    type: string;
    uri: string;
    display_name: string;
  };
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifyLikedSongsResponse {
  items: Array<{
    added_at: string;
    track: {
      id: string;
      name: string;
      artists: Array<{
        id: string;
        name: string;
      }>;
      album: {
        images: Array<{
          url: string;
          height: number | null;
          width: number | null;
        }>;
      };
    };
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    images: Array<{
      url: string;
      height: number | null;
      width: number | null;
    }>;
  };
  duration_ms?: number;
  uri?: string;
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
}

export interface SpotifyPlaylistTracksResponse {
  items: SpotifyPlaylistTrack[];
  total: number;
}

// Spotify Web Playback SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
  }
}

export interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(eventName: string, callback: (event: any) => void): void;
  removeListener(eventName: string, callback: (event: any) => void): void;
  getCurrentState(): Promise<{
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        id: string;
        uri: string;
        name: string;
        duration_ms: number;
      };
    };
  } | null>;
  resume(): Promise<void>;
  pause(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
}
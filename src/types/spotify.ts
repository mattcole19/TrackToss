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
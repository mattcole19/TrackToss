import type { SpotifyPlaylistsResponse, SpotifyLikedSongsResponse, SpotifyPlaylist } from '../types/spotify';
import { getAccessToken } from './spotifyAuth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Makes request to Spotify API with auth token
  console.log('fetching', endpoint);
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error('Spotify API error', response);
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  // Return null for empty responses (like DELETE requests)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  return response.json();
}

export async function getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylist[]> {
  // Liked Songs isn't considered a playlist, so we need to fetch it separately, then convert it into a Playlist-like object
  const [playlistsResponse, likedSongsResponse] = await Promise.all([
    fetchWithAuth(`/me/playlists?limit=${limit}&offset=${offset}`) as Promise<SpotifyPlaylistsResponse>,
    fetchWithAuth(`/me/tracks?limit=1`) as Promise<SpotifyLikedSongsResponse>
  ]);

  // Create a virtual "Liked Songs" playlist
  const likedSongsPlaylist: SpotifyPlaylist = {
    id: 'liked-songs',
    name: 'Liked Songs',
    description: null,
    images: likedSongsResponse.items[0]?.track.album.images || null,
    tracks: {
      total: likedSongsResponse.total
    },
    type: 'liked'
  };

  // Add type to regular playlists
  const typedPlaylists = playlistsResponse.items.map(playlist => ({
    ...playlist,
    type: 'playlist' as const
  }));

  // Combine both lists, putting Liked Songs first
  return [likedSongsPlaylist, ...typedPlaylists];
}

export async function getLikedSongs(limit = 50, offset = 0): Promise<SpotifyLikedSongsResponse> {
  return fetchWithAuth(`/me/tracks?limit=${limit}&offset=${offset}`);
}

export async function removeFromLikedSongs(trackId: string) {
  return fetchWithAuth(`/me/tracks`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: [trackId] }),
  });
}

export async function removeFromPlaylist(playlistId: string, trackId: string) {
  return fetchWithAuth(`/playlists/${playlistId}/tracks`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids: [trackId] }),
  });
}
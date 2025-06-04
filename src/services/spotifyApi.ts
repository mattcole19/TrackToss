import type { SpotifyPlaylistsResponse } from '../types/spotify';
import { getAccessToken } from './spotifyAuth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
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
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylistsResponse> {
  return fetchWithAuth(`/me/playlists?limit=${limit}&offset=${offset}`);
}

export async function getLikedSongs(limit = 50, offset = 0) {
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
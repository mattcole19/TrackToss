import type { 
  SpotifyPlaylistsResponse, 
  SpotifyLikedSongsResponse, 
  SpotifyPlaylist,
  SpotifyPlaylistTracksResponse,
  SpotifyTrack,
  SpotifyError,
  SpotifyErrorResponse
} from '../types/spotify';
import { getAccessToken } from './spotifyAuth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_LIKED_SONGS_PLAYLIST_ID = 'liked-songs';

/**
 * Parses Spotify API error responses and returns structured error information
 */
function parseSpotifyError(response: Response, responseText?: string): SpotifyError {
  const status = response.status;
  const retryAfter = response.headers.get('Retry-After');
  
  // Try to parse error response
  let errorMessage = 'Unknown error occurred';
  try {
    if (responseText) {
      const errorData: SpotifyErrorResponse = JSON.parse(responseText);
      errorMessage = errorData.error?.message || errorMessage;
    }
  } catch {
    // If parsing fails, use status text
    errorMessage = response.statusText || errorMessage;
  }

  // Categorize errors based on status codes
  switch (status) {
    case 429:
      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded. Please wait before trying again.',
        retryAfter: retryAfter ? parseInt(retryAfter) : 60,
        status
      };
    case 401:
      return {
        type: 'authentication',
        message: 'Authentication failed. Please log in again.',
        status
      };
    case 403:
      return {
        type: 'permission',
        message: 'You don\'t have permission to perform this action.',
        status
      };
    case 404:
      return {
        type: 'unknown',
        message: 'Resource not found.',
        status
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: 'network',
        message: 'Spotify service is temporarily unavailable. Please try again later.',
        status
      };
    default:
      return {
        type: 'unknown',
        message: errorMessage,
        status
      };
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // Makes request to Spotify API with auth token
  console.log('fetching', endpoint);
  const token = await getAccessToken();
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
    const responseText = await response.text();
    const error = parseSpotifyError(response, responseText);
    throw error;
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
    id: SPOTIFY_LIKED_SONGS_PLAYLIST_ID,
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

/**
 * Fetches tracks from either Liked Songs or a playlist
 * @param playlistId - The ID of the playlist or 'liked-songs'
 * @param limit - Number of tracks to fetch
 * @param offset - Offset for pagination
 * @param reverse - If true, fetch tracks in reverse order (oldest first)
 */
export async function getTracks(
  playlistId: string, 
  limit = 50, 
  offset = 0, 
  reverse = true
): Promise<{ items: SpotifyTrack[], total: number }> {
  if (playlistId === SPOTIFY_LIKED_SONGS_PLAYLIST_ID) {
    // For Liked Songs, we need to calculate the reverse offset
    let actualOffset = offset;
    if (reverse) {
      // First get the total count to calculate reverse offset
      const totalResponse = await fetchWithAuth(`/me/tracks?limit=1`) as SpotifyLikedSongsResponse;
      const total = totalResponse.total;
      actualOffset = Math.max(0, total - limit - offset);
    }
    
    const response = await fetchWithAuth(`/me/tracks?limit=${limit}&offset=${actualOffset}`) as SpotifyLikedSongsResponse;
    const items = response.items.map(item => item.track);
    
    // If reverse is true, reverse the order of items
    return {
      items: reverse ? items.reverse() : items,
      total: response.total
    };
  } else {
    // For regular playlists, we need to calculate the reverse offset
    let actualOffset = offset;
    if (reverse) {
      // First get the total count to calculate reverse offset
      const totalResponse = await fetchWithAuth(`/playlists/${playlistId}/tracks?limit=1`) as SpotifyPlaylistTracksResponse;
      const total = totalResponse.total;
      actualOffset = Math.max(0, total - limit - offset);
    }
    
    const response = await fetchWithAuth(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${actualOffset}`) as SpotifyPlaylistTracksResponse;
    const items = response.items.map(item => item.track);
    
    // If reverse is true, reverse the order of items
    return {
      items: reverse ? items.reverse() : items,
      total: response.total
    };
  }
}

/**
 * Removes a track from either Liked Songs or a playlist
 * @param playlistId - The ID of the playlist or 'liked-songs'
 * @param trackId - The ID of the track to remove
 */
export async function removeTrack(playlistId: string, trackId: string) {
  if (playlistId === SPOTIFY_LIKED_SONGS_PLAYLIST_ID) {
    return fetchWithAuth(`/me/tracks`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [trackId] }),
    });
  } else {
    return fetchWithAuth(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: [{ uri: `spotify:track:${trackId}` }] }),
    });
  }
}

export async function playTrack(trackId: string, deviceId: string) {
  return fetchWithAuth(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: [`spotify:track:${trackId}`]
    }),
  });
}
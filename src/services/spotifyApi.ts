import type { 
  SpotifyPlaylistsResponse, 
  SpotifyLikedSongsResponse, 
  SpotifyPlaylist,
  SpotifyPlaylistTracksResponse,
  SpotifyTrack
} from '../types/spotify';
import { getAccessToken } from './spotifyAuth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_LIKED_SONGS_PLAYLIST_ID = 'liked-songs';

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
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  // Return null for empty responses (like DELETE requests)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  return response.json();
}

/**
 * Fetches the user's playlists from Spotify
 * @param limit - Number of playlists to fetch
 * @param offset - Offset for pagination
 */
async function fetchUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylistsResponse> {
  const response = await fetchWithAuth(`/me/playlists?limit=${limit}&offset=${offset}`) as SpotifyPlaylistsResponse;
  
  // Log playlist details
  response.items.forEach(playlist => {
    console.log('Playlist:', {
      name: playlist.name,
      isCollaborative: playlist.collaborative,
      owner: {
        id: playlist.owner.id,
        displayName: playlist.owner.display_name,
        type: playlist.owner.type
      }
    });
  });
  
  return response;
}

export async function getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPlaylist[]> {
  // Liked Songs isn't considered a playlist, so we need to fetch it separately, then convert it into a Playlist-like object
  const [playlistsResponse, likedSongsResponse] = await Promise.all([
    fetchUserPlaylists(limit, offset),
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
    type: 'liked',
    collaborative: false,
    owner: {
      external_urls: {
        spotify: ''
      },
      href: '',
      id: 'user',
      type: 'user',
      uri: '',
      display_name: 'You'
    }
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
 */
export async function getTracks(playlistId: string, limit = 50, offset = 0): Promise<{ items: SpotifyTrack[], total: number }> {
  if (playlistId === SPOTIFY_LIKED_SONGS_PLAYLIST_ID) {
    const response = await fetchWithAuth(`/me/tracks?limit=${limit}&offset=${offset}`) as SpotifyLikedSongsResponse;
    return {
      items: response.items.map(item => item.track),
      total: response.total
    };
  } else {
    const response = await fetchWithAuth(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`) as SpotifyPlaylistTracksResponse;
    return {
      items: response.items.map(item => item.track),
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
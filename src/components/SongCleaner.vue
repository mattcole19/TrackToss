<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { SpotifyTrack } from '../types/spotify';
import { getLikedSongs, removeFromLikedSongs } from '../services/spotifyApi';
import SpotifyPlayer from './SpotifyPlayer.vue';

const props = defineProps<{
  playlistId: string;
  playlistName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const tracks = ref<SpotifyTrack[]>([]); // queue of tracks to review
const keptTracks = ref<SpotifyTrack[]>([]); // tracks that have been kept
const discardedTracks = ref<SpotifyTrack[]>([]); // tracks that have been discarded
const loading = ref(false);
const error = ref<string | null>(null);
const bufferSize = 5;
const minTracksThreshold = 4 // Load more when we have fewer than this many tracks

// Load initial batch of tracks
onMounted(async () => {
  await loadInitialTracks();
});

/**
 * Loads the initial batch of tracks when the component mounts.
 * Shows a loading state while fetching the first set of tracks.
 */
async function loadInitialTracks() {
  try {
    loading.value = true;
    const response = await getLikedSongs(bufferSize, 0);
    tracks.value = response.items.map(item => item.track);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tracks';
  } finally {
    loading.value = false;
  }
}

/**
 * Loads additional tracks in the background when the queue is getting low
 * @param offset - The number of tracks to skip (based on total tracks processed)
 */
async function loadMoreTracks(offset: number) {
  try {
    const response = await getLikedSongs(bufferSize, offset);
    tracks.value = [...tracks.value, ...response.items.map(item => item.track)];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load more tracks';
  }
}

/**
 * Advances to the next track in the queue.
 * If we're running low on tracks, triggers a background load of more tracks.
 */
async function nextTrack() {
  // Remove the current track from the queue
  const currentTrack = tracks.value.shift();
  if (!currentTrack) return;

  // If we're running low on tracks, load more in the background
  if (tracks.value.length < minTracksThreshold) {
    const num_tracks_checked = tracks.value.length + keptTracks.value.length + discardedTracks.value.length;
    await loadMoreTracks(num_tracks_checked);
  }
}

/**
 * Handles keeping the current track.
 * Adds the track to keptTracks and advances to the next track.
 */
async function handleKeep() {
  const currentTrack = tracks.value[0];
  if (!currentTrack) return;
  
  keptTracks.value.push(currentTrack);
  await nextTrack();
}

/**
 * Handles discarding the current track.
 * Removes the track from Spotify's Liked Songs, adds it to discardedTracks,
 * and advances to the next track.
 */
async function handleDiscard() {
  try {
    const currentTrack = tracks.value[0];
    if (!currentTrack) return;

    await removeFromLikedSongs(currentTrack.id);
    discardedTracks.value.push(currentTrack);
    await nextTrack();
  } catch (err) {
    console.error('error removing track', err);
    error.value = err instanceof Error ? err.message : 'Failed to remove track';
  }
}
</script>

<template>
  <div class="song-cleaner">
    <div class="header">
      <h2>Cleaning: {{ playlistName }}</h2>
      <div class="stats">
        <span>Kept: {{ keptTracks.length }}</span>
        <span>Discarded: {{ discardedTracks.length }}</span>
      </div>
      <button @click="emit('close')" class="close-button">×</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="tracks.length === 0" class="no-tracks">
      No more tracks to review
    </div>
    <div v-else class="track-container">
      <div class="track-card">
        <img 
          v-if="tracks[0].album.images[0]" 
          :src="tracks[0].album.images[0].url" 
          :alt="tracks[0].name"
          class="track-image"
        >
        <div class="track-info">
          <h3>{{ tracks[0].name }}</h3>
          <p>{{ tracks[0].artists.map(a => a.name).join(', ') }}</p>
        </div>
        <SpotifyPlayer :track-id="tracks[0].id" />
      </div>

      <div class="actions">
        <button @click="handleDiscard" class="discard-button">Discard</button>
        <button @click="handleKeep" class="keep-button">Keep</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.song-cleaner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #121212;  /* Spotify's dark background color */
  z-index: 1000;
  padding: 2rem;
  color: white;  /* Making text white for better contrast */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.5rem;
}

.track-container {
  max-width: 600px;
  margin: 0 auto;
}

.track-card {
  background: #282828;  /* Slightly lighter than background */
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.track-image {
  width: 300px;
  height: 300px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.track-info h3 {
  margin: 0;
  font-size: 1.5rem;
}

.track-info p {
  margin: 0.5rem 0 0;
  color: #b3b3b3;  /* Spotify's secondary text color */
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.keep-button, .discard-button {
  padding: 1rem 2rem;
  border: none;
  border-radius: 25px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.keep-button {
  background-color: #1DB954;
  color: white;
}

.discard-button {
  background-color: #ff4444;
  color: white;
}

.keep-button:hover {
  background-color: #1ed760;
}

.discard-button:hover {
  background-color: #ff6666;
}

.loading, .error, .no-tracks {
  text-align: center;
  margin: 2rem 0;
}

.error {
  color: #ff4444;
}

.stats {
  display: flex;
  gap: 1rem;
  color: #b3b3b3;
}

.stats span {
  padding: 0.5rem 1rem;
  background: #282828;
}
</style> 
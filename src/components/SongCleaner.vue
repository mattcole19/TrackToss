<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { SpotifyTrack } from '../types/spotify';
import { getTracks, removeTrack } from '../services/spotifyApi';
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
    const response = await getTracks(props.playlistId, bufferSize, 0);
    tracks.value = response.items;
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
    const response = await getTracks(props.playlistId, bufferSize, offset);
    tracks.value = [...tracks.value, ...response.items];
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
 * Removes the track from the playlist/Liked Songs, adds it to discardedTracks,
 * and advances to the next track.
 */
async function handleDiscard() {
  try {
    const currentTrack = tracks.value[0];
    if (!currentTrack) return;

    await removeTrack(props.playlistId, currentTrack.id);
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
  background: #121212;
  z-index: 1000;
  padding: 1rem;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent scrolling */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
  flex-shrink: 0; /* Prevent header from shrinking */
}

.header h2 {
  font-size: 1.2rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.5rem;
  color: white;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  padding: 0 0.5rem;
  overflow: hidden; /* Prevent scrolling */
}

.track-card {
  background: #282828;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  text-align: center;
  flex-shrink: 0; /* Prevent card from shrinking */
}

.track-image {
  width: 100%;
  max-width: 300px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.track-info {
  flex-shrink: 0; /* Prevent info from shrinking */
}

.track-info h3 {
  margin: 0;
  font-size: 1.2rem;
  padding: 0 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-info p {
  margin: 0.25rem 0 0;
  color: #b3b3b3;
  font-size: 0.9rem;
  padding: 0 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: auto;
  padding: 0.5rem 0;
  flex-shrink: 0; /* Prevent actions from shrinking */
}

.keep-button, .discard-button {
  padding: 1rem;
  border: none;
  border-radius: 25px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
  max-width: 150px;
  min-height: 44px;
}

.keep-button {
  background-color: #1DB954;
  color: white;
}

.discard-button {
  background-color: #ff4444;
  color: white;
}

.keep-button:active {
  background-color: #1ed760;
}

.discard-button:active {
  background-color: #ff6666;
}

.loading, .error, .no-tracks {
  text-align: center;
  margin: 2rem 0;
  padding: 0 1rem;
}

.error {
  color: #ff4444;
}

.stats {
  display: flex;
  gap: 0.5rem;
  color: #b3b3b3;
  font-size: 0.9rem;
}

.stats span {
  padding: 0.25rem 0.5rem;
  background: #282828;
  border-radius: 4px;
}

@media (min-width: 768px) {
  .song-cleaner {
    padding: 2rem;
  }

  .header h2 {
    font-size: 1.5rem;
  }

  .track-card {
    padding: 2rem;
  }

  .track-info h3 {
    font-size: 1.5rem;
  }

  .keep-button, .discard-button {
    padding: 1rem 2rem;
  }
}
</style> 
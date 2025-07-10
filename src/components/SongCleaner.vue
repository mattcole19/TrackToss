<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { SpotifyTrack, SpotifyError } from '../types/spotify';
import type { CleaningState } from '../types/cleaning';
import { getTracks, removeTrack } from '../services/spotifyApi';
import SpotifyPlayer from './SpotifyPlayer.vue';
import TrackList from './TrackList.vue';
import ErrorHandler from './ErrorHandler.vue';

const props = defineProps<{
  playlistId: string;
  playlistName: string;
  initialState?: CleaningState | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'state-update', state: CleaningState): void;
}>();

const tracks = ref<SpotifyTrack[]>([]); // queue of tracks to review
const keptTracks = ref<SpotifyTrack[]>([]); // tracks that have been kept
const discardedTracks = ref<SpotifyTrack[]>([]); // tracks that have been discarded
const loading = ref(false);
const error = ref<SpotifyError | string | null>(null);
const bufferSize = 30
const minTracksThreshold = 10 // Loadmore when we have fewer than this many tracks
const lastProcessedOffset = ref(0);
const totalTracks = ref(0);

// Load initial batch of tracks
onMounted(async () => {
  if (props.initialState) {
    // Restore state from persistence
    keptTracks.value = props.initialState.keptTracks;
    discardedTracks.value = props.initialState.discardedTracks;
    tracks.value = props.initialState.queueTracks;
    lastProcessedOffset.value = props.initialState.lastProcessedOffset;
    totalTracks.value = props.initialState.totalTracks;
    
    // If we don't have enough tracks in the queue, load more
    if (tracks.value.length < minTracksThreshold) {
      await loadMoreTracks(lastProcessedOffset.value);
    }
  } else {
    // Start fresh
    await loadInitialTracks();
  }
});

// Watch for state changes and emit updates
watch([tracks, keptTracks, discardedTracks, lastProcessedOffset, totalTracks], () => {
  emit('state-update', {
    keptTracks: keptTracks.value,
    discardedTracks: discardedTracks.value,
    queueTracks: tracks.value,
    lastProcessedOffset: lastProcessedOffset.value,
    totalTracks: totalTracks.value
  });
}, { deep: true });

/**
 * Loads the initial batch of tracks when the component mounts.
 * Shows a loading state while fetching the first set of tracks.
 */
async function loadInitialTracks() {
  try {
    loading.value = true;
    error.value = null;
    const response = await getTracks(props.playlistId, bufferSize, 0, true);
    tracks.value = response.items;
    totalTracks.value = response.total;
    lastProcessedOffset.value = 0;
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
    const response = await getTracks(props.playlistId, bufferSize, offset, true);
    tracks.value = [...tracks.value, ...response.items];
    if (totalTracks.value === 0) {
      totalTracks.value = response.total;
    }
  } catch (err) {
    // Don't show error for background loading, just log it
    console.error('Failed to load more tracks:', err);
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

  // Update the offset to track our progress
  lastProcessedOffset.value = keptTracks.value.length + discardedTracks.value.length;

  // If we're running low on tracks, load more in the background
  if (tracks.value.length < minTracksThreshold) {
    await loadMoreTracks(lastProcessedOffset.value);
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

    error.value = null; // Clear any previous errors
    await removeTrack(props.playlistId, currentTrack.id);
    discardedTracks.value.push(currentTrack);
    await nextTrack();
  } catch (err) {
    console.error('error removing track', err);
    error.value = err instanceof Error ? err.message : err as SpotifyError;
    // Don't advance to next track on error - let user retry
  }
}

/**
 * Retries the last failed operation
 */
async function handleRetry() {
  error.value = null;
  // The error was likely from handleDiscard, so we can retry that
  if (tracks.value.length > 0) {
    await handleDiscard();
  }
}

/**
 * Dismisses the current error
 */
function handleDismissError() {
  error.value = null;
}

/**
 * Resets the cleaning progress for this playlist
 */
function handleResetProgress() {
  // Clear all state
  tracks.value = [];
  keptTracks.value = [];
  discardedTracks.value = [];
  lastProcessedOffset.value = 0;
  totalTracks.value = 0;
  
  // Reload initial tracks
  loadInitialTracks();
}
</script>

<template>
  <div class="song-cleaner">
    <div class="header">
      <h2>Cleaning: {{ playlistName }}</h2>
      <div class="stats">
        <TrackList 
          :tracks="discardedTracks" 
          title="Discarded" 
          empty-message="No tracks discarded yet"
        />
        <TrackList 
          :tracks="keptTracks" 
          title="Kept" 
          empty-message="No tracks kept yet"
        />
      </div>
      <div class="header-actions">
        <button @click="handleResetProgress" class="reset-button" title="Reset progress">
          ↺
        </button>
        <button @click="emit('close')" class="close-button">×</button>
      </div>
    </div>

    <ErrorHandler 
      :error="error"
      :on-retry="handleRetry"
      :on-dismiss="handleDismissError"
    />

    <div v-if="loading" class="loading">Loading...</div>
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header h2 {
  font-size: 1.2rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}

.reset-button, .close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  color: white;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.reset-button:hover, .close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.close-button {
  font-size: 2rem;
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
  align-items: center;
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
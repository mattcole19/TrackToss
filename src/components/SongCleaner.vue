<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { SpotifyTrack } from '../types/spotify';
import { getLikedSongs, removeFromLikedSongs } from '../services/spotifyApi';

const props = defineProps<{
  playlistId: string;
  playlistName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const tracks = ref<SpotifyTrack[]>([]);
const currentIndex = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const bufferSize = 5; // Number of tracks to load ahead

// Load initial batch of tracks
onMounted(async () => {
  await loadTracks();
});

// TODO: this should be able to handle playlist OR liked songs
async function loadTracks(offset = 0) {
  try {
    loading.value = true;
    const response = await getLikedSongs(bufferSize, offset);
    tracks.value = response.items.map(item => item.track);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load tracks';
  } finally {
    loading.value = false;
  }
}

async function handleKeep() {
  // Move to next track
  currentIndex.value++;
  
  // If we're running low on tracks, load more
  if (tracks.value.length - currentIndex.value < 2) {
    await loadTracks(tracks.value.length);
  }
}

async function handleDiscard() {
  try {
    const currentTrack = tracks.value[currentIndex.value];
    await removeFromLikedSongs(currentTrack.id);
    await handleKeep();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to remove track';
  }
}
</script>

<template>
  <div class="song-cleaner">
    <div class="header">
      <h2>Cleaning: {{ playlistName }}</h2>
      <button @click="emit('close')" class="close-button">×</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="tracks.length === 0" class="no-tracks">
      No tracks found in this playlist
    </div>
    <div v-else class="track-container">
      <div class="track-card">
        <img 
          v-if="tracks[currentIndex].album.images[0]" 
          :src="tracks[currentIndex].album.images[0].url" 
          :alt="tracks[currentIndex].name"
          class="track-image"
        >
        <div class="track-info">
          <h3>{{ tracks[currentIndex].name }}</h3>
          <p>{{ tracks[currentIndex].artists.map(a => a.name).join(', ') }}</p>
        </div>
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
</style> 
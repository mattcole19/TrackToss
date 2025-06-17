<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { getAccessToken } from '../services/spotifyAuth';
import { playTrack } from '../services/spotifyApi';
import type { SpotifyPlayer } from '../types/spotify';

interface SpotifyErrorEvent {
  message: string;
}

interface SpotifyReadyEvent {
  device_id: string;
}

const props = defineProps<{
  trackId: string;
}>();

const isPlaying = ref(false);
const error = ref<string | null>(null);
const player = ref<SpotifyPlayer | null>(null);
const deviceId = ref<string | null>(null);

// Watch for track changes
watch(() => props.trackId, async (newTrackId, oldTrackId) => {
  if (newTrackId !== oldTrackId) {
    // Stop current playback
    if (player.value && isPlaying.value) {
      await player.value.pause();
    }
    isPlaying.value = false;
    error.value = null;

    // If we have a device ID, start playing the new track
    if (deviceId.value) {
      try {
        await playTrack(newTrackId, deviceId.value);
        isPlaying.value = true;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to play track';
        isPlaying.value = false;
      }
    }
  }
});

// Initialize the Spotify Web Playback SDK
onMounted(async () => {
  try {
    // Load Spotify Web Playback SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    // Initialize the player when the SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      player.value = new window.Spotify.Player({
        name: 'TrackToss Web Player',
        getOAuthToken: async (cb: (token: string) => void) => {
          const token = await getAccessToken();
          if (token) {
            cb(token);
          } else {
            error.value = 'Failed to get access token';
          }
        },
        volume: 0.5
      });

      // Error handling
      player.value?.addListener('initialization_error', (event: SpotifyErrorEvent) => {
        error.value = `Failed to initialize: ${event.message}`;
      });

      player.value?.addListener('authentication_error', (event: SpotifyErrorEvent) => {
        error.value = `Failed to authenticate: ${event.message}`;
      });

      player.value?.addListener('account_error', (event: SpotifyErrorEvent) => {
        error.value = `Account error: ${event.message}`;
      });

      player.value?.addListener('playback_error', (event: SpotifyErrorEvent) => {
        error.value = `Playback error: ${event.message}`;
      });

      // Ready handling
      player.value?.addListener('ready', (event: SpotifyReadyEvent) => {
        deviceId.value = event.device_id;
      });

      // Connect to the player
      player.value?.connect();
    };
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initialize player';
  }
});

// Clean up on component unmount
onUnmounted(() => {
  if (player.value) {
    player.value.disconnect();
  }
});

// Toggle play/pause
async function togglePlay() {
  if (!player.value || !deviceId.value) return;

  try {
    const state = await player.value.getCurrentState();
    
    if (!state) {
      // Start playing the track
      await playTrack(props.trackId, deviceId.value);
      isPlaying.value = true;
    } else {
      if (state.paused) {
        await player.value.resume();
        isPlaying.value = true;
      } else {
        await player.value.pause();
        isPlaying.value = false;
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to toggle playback';
  }
}
</script>

<template>
  <div class="player-container">
    <button 
      @click="togglePlay"
      class="play-button"
      :disabled="!!error"
    >
      {{ isPlaying ? '⏸' : '▶' }}
    </button>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<style scoped>
.player-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.play-button {
  background: #1DB954;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.play-button:hover:not(:disabled) {
  background: #1ed760;
}

.play-button:disabled {
  background: #666;
  cursor: not-allowed;
}

.error {
  color: #ff4444;
  font-size: 0.9rem;
  text-align: center;
}
</style> 
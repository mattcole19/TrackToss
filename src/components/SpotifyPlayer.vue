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
const debugInfo = ref<string[]>([]);

// Debug function
function addDebug(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  debugInfo.value.push(`${timestamp}: ${message}`);
  // Keep only last 10 messages
  if (debugInfo.value.length > 10) {
    debugInfo.value = debugInfo.value.slice(-10);
  }
}

// Watch for track changes
watch(() => props.trackId, async (newTrackId, oldTrackId) => {
  if (newTrackId !== oldTrackId) {
    addDebug(`Track changed: ${oldTrackId} -> ${newTrackId}`);
    
    // Stop current playback
    if (player.value && isPlaying.value) {
      addDebug('Stopping current playback');
      await player.value.pause();
    }
    isPlaying.value = false;
    error.value = null;

    // If we have a device ID, start playing the new track
    if (deviceId.value) {
      try {
        addDebug(`Auto-playing new track: ${newTrackId}`);
        await playTrack(newTrackId, deviceId.value);
        addDebug('Auto-play call completed');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to play track';
        addDebug(`Auto-play error: ${errorMsg}`);
        error.value = errorMsg;
        isPlaying.value = false;
      }
    } else {
      addDebug('No device ID for auto-play');
    }
  }
});

// Initialize the Spotify Web Playback SDK
onMounted(async () => {
  addDebug('Component mounted, initializing player');
  
  try {
    // Load Spotify Web Playback SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
    addDebug('SDK script loaded');

    // Initialize the player when the SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
      addDebug('SDK ready, creating player');
      
      player.value = new window.Spotify.Player({
        name: 'TrackToss Web Player',
        getOAuthToken: async (cb: (token: string) => void) => {
          const token = await getAccessToken();
          if (token) {
            addDebug('Token obtained for player');
            cb(token);
          } else {
            addDebug('Failed to get token for player');
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
        addDebug(`Player ready, device ID: ${event.device_id}`);
      });

      // Player state change handling
      player.value?.addListener('player_state_changed', (state) => {
        if (state) {
          const wasPlaying = isPlaying.value;
          isPlaying.value = !state.paused;
          addDebug(`State changed: ${state.paused ? 'paused' : 'playing'} (was ${wasPlaying ? 'playing' : 'paused'})`);
        } else {
          addDebug('State changed: null state');
        }
      });

      // Connect to the player
      addDebug('Connecting to player');
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
  addDebug(`Toggle play clicked - player: ${!!player.value}, deviceId: ${!!deviceId.value}`);
  
  if (!player.value || !deviceId.value) {
    addDebug('No player or device ID available');
    return;
  }

  try {
    const state = await player.value.getCurrentState();
    addDebug(`Current state: ${state ? (state.paused ? 'paused' : 'playing') : 'null'}`);
    
        if (!state) {
      addDebug(`Starting track: ${props.trackId}`);
      // Activate the player element to prevent autoplay blocking on mobile
      try {
        player.value.activateElement();
        addDebug('Player element activated');
      } catch (activateErr) {
        addDebug('Player activation failed');
      }
      await playTrack(props.trackId, deviceId.value);
      addDebug('playTrack call completed');
    } else {
      if (state.paused) {
        addDebug('Resuming playback');
        await player.value.resume();
        addDebug('Resume completed');
      } else {
        addDebug('Pausing playback');
        await player.value.pause();
        addDebug('Pause completed');
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to toggle playback';
    addDebug(`Error: ${errorMsg}`);
    error.value = errorMsg;
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
    <div class="debug-info">
      <div v-for="(info, index) in debugInfo" :key="index" class="debug-line">
        {{ info }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.play-button {
  background: #1DB954;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  font-size: 1.2rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  touch-action: manipulation;
}

.play-button:active:not(:disabled) {
  background: #1ed760;
  transform: scale(0.95);
}

.play-button:disabled {
  background: #666;
  cursor: not-allowed;
}

.error {
  color: #ff4444;
  font-size: 0.9rem;
  text-align: center;
  padding: 0 1rem;
}

.debug-info {
  margin-top: 1rem;
  max-width: 100%;
  overflow-x: auto;
}

.debug-line {
  color: #b3b3b3;
  font-size: 0.7rem;
  text-align: left;
  padding: 0.1rem 0.5rem;
  border-bottom: 1px solid #333;
  font-family: monospace;
  white-space: nowrap;
}
</style> 
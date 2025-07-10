<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { isAuthenticated, initiateSpotifyLogin, handleCallback, logout } from './services/spotifyAuth';
import { getUserPlaylists } from './services/spotifyApi';
import type { SpotifyPlaylist } from './types/spotify';
import type { CleaningState } from './types/cleaning';
import SongCleaner from './components/SongCleaner.vue';

// Persistent state management for songs kept/discarded per playlist
const cleaningStates = ref<Record<string, CleaningState>>({});
const isLoggedIn = ref(false);
const playlists = ref<SpotifyPlaylist[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedPlaylist = ref<SpotifyPlaylist | null>(null);
const searchTerm = ref('');

// Computed property to filter playlists based on search term
const filteredPlaylists = computed(() => {
  if (!searchTerm.value.trim()) {
    return playlists.value;
  }
  
  const term = searchTerm.value.toLowerCase().trim();
  return playlists.value.filter(playlist => 
    playlist.name.toLowerCase().includes(term)
  );
});

/**
 * Loads cleaning states from localStorage
 */
function loadCleaningStates() {
  try {
    const stored = localStorage.getItem('tracktoss_cleaning_states');
    if (stored) {
      cleaningStates.value = JSON.parse(stored);
    }
  } catch (err) {
    console.error('Failed to load cleaning states:', err);
  }
}

/**
 * Saves cleaning states to localStorage
 */
function saveCleaningStates() {
  try {
    localStorage.setItem('tracktoss_cleaning_states', JSON.stringify(cleaningStates.value));
  } catch (err) {
    console.error('Failed to save cleaning states:', err);
  }
}

/**
 * Gets the cleaning state for a specific playlist
 * @param playlistId - The ID of the playlist
 * @returns The cleaning state or null if not found
 */
function getCleaningState(playlistId: string): CleaningState | null {
  return cleaningStates.value[playlistId] || null;
}

/**
 * Updates the cleaning state for a specific playlist
 * @param playlistId - The ID of the playlist
 * @param state - The new cleaning state
 */
function updateCleaningState(playlistId: string, state: CleaningState) {
  cleaningStates.value[playlistId] = state;
  saveCleaningStates();
}

/**
 * Resets the cleaning progress for a specific playlist
 * @param playlistId - The ID of the playlist
 */
function resetCleaningProgress(playlistId: string) {
  delete cleaningStates.value[playlistId];
  saveCleaningStates();
}

/**
 * Gets the progress percentage for a playlist
 * @param playlistId - The ID of the playlist
 * @returns The progress percentage (0-100) or null if no progress
 */
function getProgressPercentage(playlistId: string): number | null {
  const state = getCleaningState(playlistId);
  if (!state || state.totalTracks === 0) return null;
  
  const processed = state.keptTracks.length + state.discardedTracks.length;
  return Math.round((processed / state.totalTracks) * 100);
}

/**
 * Initializes the app by checking for OAuth callback and loading playlists if authenticated.
 * Handles the Spotify OAuth callback if present in the URL.
 */
onMounted(async () => {
  // Load persistent cleaning states
  loadCleaningStates();
  
  // Check if we're in the callback route
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (code) {
    try {
      loading.value = true;
      await handleCallback(code);
      // Remove the code from the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadPlaylists();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to authenticate';
    } finally {
      loading.value = false;
    }
  } else {
    isLoggedIn.value = isAuthenticated();
    if (isLoggedIn.value) {
      await loadPlaylists();
    }
  }
});

/**
 * Fetches the user's playlists from Spotify, including Liked Songs.
 * Updates the playlists state with the fetched data.
 */
async function loadPlaylists() {
  try {
    loading.value = true;
    const response = await getUserPlaylists();
    playlists.value = response;
    isLoggedIn.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load playlists';
  } finally {
    loading.value = false;
  }
}

/**
 * Initiates the Spotify OAuth login flow.
 * Redirects the user to Spotify's login page.
 */
function handleLogin() {
  initiateSpotifyLogin();
}

/**
 * Logs the user out by clearing auth state and playlists.
 */
function handleLogout() {
  logout();
  isLoggedIn.value = false;
  playlists.value = [];
}

/**
 * Sets the selected playlist for cleaning.
 * @param playlist - The playlist to clean
 */
function handlePlaylistSelect(playlist: SpotifyPlaylist) {
  selectedPlaylist.value = playlist;
}

/**
 * Closes the song cleaner interface.
 * The cleaning state is automatically saved by the SongCleaner component.
 */
function handleCloseCleaner() {
  selectedPlaylist.value = null;
}

/**
 * Resets the cleaning progress for the currently selected playlist.
 */
function handleResetProgress() {
  if (selectedPlaylist.value) {
    resetCleaningProgress(selectedPlaylist.value.id);
  }
}
</script>

<template>
  <div class="container">
    <header>
      <h1>TrackToss</h1>
      <div v-if="error" class="error">{{ error }}</div>
    </header>

    <main v-if="!selectedPlaylist">
      <div v-if="loading" class="loading">Loading...</div>
      
      <div v-else-if="!isLoggedIn" class="login-container">
        <div class="app-description">
          <p>Pick a playlist and quickly delete songs from it while listening to snippets. Perfect for cleaning up your music library!</p>
        </div>
        <button @click="handleLogin" class="login-button">
          Login with Spotify
        </button>
      </div>

      <div v-else>
        <div class="header-actions">
          <button @click="handleLogout" class="logout-button">
            Logout
          </button>
        </div>

        <div class="playlists">
          <h2>Your Playlists</h2>
          <div class="search-container">
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search playlists..."
              class="search-input"
            >
          </div>
          <div v-if="playlists.length === 0" class="no-playlists">
            No playlists found
          </div>
          <div v-else-if="filteredPlaylists.length === 0" class="no-playlists">
            No playlists match your search
          </div>
          <ul v-else class="playlist-list">
            <li 
              v-for="playlist in filteredPlaylists" 
              :key="playlist.id" 
              class="playlist-item"
              @click="handlePlaylistSelect(playlist)"
            >
              <img 
                v-if="playlist.images && playlist.images.length > 0" 
                :src="playlist.images[0].url" 
                :alt="playlist.name"
                class="playlist-image"
              >
              <div class="playlist-info">
                <h3>
                  {{ playlist.name }}
                  <span v-if="playlist.type === 'liked'" class="liked-badge">❤️</span>
                </h3>
                <p>{{ playlist.tracks.total }} tracks</p>
                <div v-if="getProgressPercentage(playlist.id)" class="progress-info">
                  <div class="progress-bar">
                    <div 
                      class="progress-fill" 
                      :style="{ width: getProgressPercentage(playlist.id) + '%' }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ getProgressPercentage(playlist.id) }}% complete</span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </main>

    <SongCleaner
      v-if="selectedPlaylist"
      :playlist-id="selectedPlaylist.id"
      :playlist-name="selectedPlaylist.name"
      :initial-state="getCleaningState(selectedPlaylist.id)"
      @close="handleCloseCleaner"
      @state-update="(state: CleaningState) => selectedPlaylist && updateCleaningState(selectedPlaylist.id, state)"
    />
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

header h1 {
  font-size: 1.8rem;
  margin: 0;
}

.error {
  color: #ff4444;
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: #ffebee;
  border-radius: 4px;
}

.loading {
  text-align: center;
  margin: 2rem 0;
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
  gap: 1.5rem;
}

.app-description {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
  padding: 0 1rem;
}

.app-description p {
  font-size: 1.1rem;
  line-height: 1.5;
  color: #666;
  margin: 0;
}

.login-button {
  background-color: #1DB954;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 25px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
  max-width: 300px;
}

.login-button:hover {
  background-color: #1ed760;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
  padding: 0 1rem;
}

.logout-button {
  background-color: #ff4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.playlists {
  margin-top: 1rem;
  padding: 0 1rem;
}

.playlists h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.search-container {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #444;
  border-radius: 8px;
  background: #282828;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: #888;
}

.search-input:focus {
  border-color: #1DB954;
}

.playlist-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  background: #282828;
}

.playlist-item:active {
  background-color: #383838;
}

.playlist-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  margin-right: 1rem;
  border-radius: 4px;
}

.playlist-info {
  flex: 1;
  text-align: left;
}

.playlist-info h3 {
  margin: 0;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-info p {
  margin: 0.25rem 0 0;
  color: #b3b3b3;
  font-size: 0.9rem;
}

.progress-info {
  margin-top: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: #444;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  background-color: #1DB954;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #1DB954;
}

.no-playlists {
  text-align: center;
  color: #666;
  margin: 2rem 0;
}

.liked-badge {
  font-size: 0.9em;
  margin-left: 0.5rem;
  vertical-align: middle;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }

  header h1 {
    font-size: 2.5rem;
  }

  .playlist-item {
    padding: 1.5rem;
  }

  .playlist-image {
    width: 60px;
    height: 60px;
  }

  .playlist-info h3 {
    font-size: 1.1rem;
  }
}
</style>

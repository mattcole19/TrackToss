<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { isAuthenticated, initiateSpotifyLogin, handleCallback, logout } from './services/spotifyAuth';
import { getUserPlaylists } from './services/spotifyApi';
import type { SpotifyPlaylist } from './types/spotify';
import SongCleaner from './components/SongCleaner.vue';

const isLoggedIn = ref(false);
const playlists = ref<SpotifyPlaylist[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedPlaylist = ref<SpotifyPlaylist | null>(null);

/**
 * Initializes the app by checking for OAuth callback and loading playlists if authenticated.
 * Handles the Spotify OAuth callback if present in the URL.
 */
onMounted(async () => {
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
 */
function handleCloseCleaner() {
  selectedPlaylist.value = null;
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
          <div v-if="playlists.length === 0" class="no-playlists">
            No playlists found
          </div>
          <ul v-else class="playlist-list">
            <li 
              v-for="playlist in playlists" 
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
      @close="handleCloseCleaner"
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
  justify-content: center;
  margin: 2rem 0;
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

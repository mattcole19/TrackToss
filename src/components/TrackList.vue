<!-- This component is used to display a list of tracks in a dropdown menu that have been kept or discarded. -->

<script setup lang="ts">
import type { SpotifyTrack } from '../types/spotify';

interface Props {
  tracks: SpotifyTrack[];
  title: string;
  emptyMessage: string;
}

defineProps<Props>();
</script>

<template>
  <div class="track-list-container">
    <div class="track-list-trigger">
      {{ title }}
      <span class="track-count">({{ tracks.length }})</span>
    </div>
    
    <div class="track-list-dropdown">
      <div v-if="tracks.length === 0" class="empty-message">
        {{ emptyMessage }}
      </div>
              <div v-else class="track-items">
          <div 
            v-for="track in [...tracks].reverse()" 
            :key="track.id" 
            class="track-item"
          >
          <img 
            v-if="track.album.images[0]" 
            :src="track.album.images[0].url" 
            :alt="track.name"
            class="track-thumbnail"
          >
          <div class="track-details">
            <div class="track-name">{{ track.name }}</div>
            <div class="track-artist">{{ track.artists.map(a => a.name).join(', ') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-list-container {
  position: relative;
  display: inline-block;
}

.track-list-trigger {
  cursor: pointer;
  padding: 0.5rem 1rem;
  background: #282828;
  border-radius: 4px;
  transition: background-color 0.2s;
  user-select: none;
}

.track-list-trigger:hover {
  background: #383838;
}

.track-count {
  color: #888;
  font-size: 0.9rem;
}

.track-list-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  min-width: 300px;
  max-width: 400px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s ease;
  max-height: 400px;
  overflow-y: auto;
}

.track-list-container:hover .track-list-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.empty-message {
  padding: 1rem;
  text-align: center;
  color: #888;
  font-style: italic;
}

.track-items {
  max-height: 350px;
  overflow-y: auto;
}

.track-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #333;
  transition: background-color 0.2s;
}

.track-item:last-child {
  border-bottom: none;
}

.track-item:hover {
  background: #282828;
}

.track-thumbnail {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.track-details {
  flex: 1;
  min-width: 0;
}

.track-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.85rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Scrollbar styling */
.track-items::-webkit-scrollbar {
  width: 6px;
}

.track-items::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.track-items::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 3px;
}

.track-items::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style> 
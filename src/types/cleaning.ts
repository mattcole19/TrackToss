import type { SpotifyTrack } from './spotify';

/**
 * Represents the cleaning progress state for a playlist
 * This includes tracks that have been kept, discarded, and are still in the queue
 */
export interface CleaningState {
  /** Tracks that have been kept (not removed from playlist) */
  keptTracks: SpotifyTrack[];
  /** Tracks that have been discarded (removed from playlist) */
  discardedTracks: SpotifyTrack[];
  /** Tracks still in the queue waiting to be reviewed */
  queueTracks: SpotifyTrack[];
  /** The offset of the last processed track (for pagination) */
  lastProcessedOffset: number;
  /** Total number of tracks in the playlist */
  totalTracks: number;
} 
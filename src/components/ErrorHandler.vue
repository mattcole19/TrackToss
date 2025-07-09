<script setup lang="ts">
import { computed, ref, onUnmounted, watch } from 'vue';
import type { SpotifyError } from '../types/spotify';

interface Props {
  error: SpotifyError | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const props = defineProps<Props>();

// Countdown timer state
const countdown = ref<number>(0);
const countdownInterval = ref<number | null>(null);

// Convert string errors to SpotifyError format
const normalizedError = computed(() => {
  if (!props.error) return null;
  if (typeof props.error === 'string') {
    return {
      type: 'unknown' as const,
      message: props.error
    };
  }
  return props.error;
});

// Start countdown when rate limit error appears
const startCountdown = (retryAfter: number) => {
  countdown.value = retryAfter;
  
  countdownInterval.value = window.setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      stopCountdown();
    }
  }, 1000);
};

// Stop countdown
const stopCountdown = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value);
    countdownInterval.value = null;
  }
  countdown.value = 0;
};

// Watch for rate limit errors and start countdown
watch(() => normalizedError.value, (error) => {
  if (error?.type === 'rate_limit' && error.retryAfter) {
    startCountdown(error.retryAfter);
  } else {
    stopCountdown();
  }
});

// Clean up on unmount
onUnmounted(() => {
  stopCountdown();
});

// Format retry after time
const formatRetryTime = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
};

// Get appropriate action text based on error type
const getActionText = (error: SpotifyError) => {
  switch (error.type) {
    case 'rate_limit':
      if (countdown.value > 0) {
        return `Retry in ${formatRetryTime(countdown.value)}`;
      }
      return 'Retry';
    case 'authentication':
      return 'Log in again';
    case 'permission':
      return 'Go back';
    case 'network':
      return 'Retry';
    default:
      return 'Retry';
  }
};

// Check if retry button should be disabled
const isRetryDisabled = computed(() => {
  if (!normalizedError.value) return true;
  return normalizedError.value.type === 'rate_limit' && countdown.value > 0;
});

// Handle retry action
const handleRetry = () => {
  if (props.onRetry) {
    props.onRetry();
  }
};

// Handle dismiss action
const handleDismiss = () => {
  if (props.onDismiss) {
    props.onDismiss();
  }
};
</script>

<template>
  <div v-if="normalizedError" class="error-handler">
    <div class="error-header">
      <div class="error-icon">
        {{ normalizedError.type === 'rate_limit' ? '⏰' : '⚠️' }}
      </div>
      <button 
        v-if="onDismiss"
        @click="handleDismiss"
        class="error-close-button"
        title="Dismiss error"
      >
        ×
      </button>
    </div>
    
    <div class="error-content">
      <div class="error-message">
        <h3>{{ normalizedError.message }}</h3>
        <p v-if="normalizedError.type === 'rate_limit' && countdown > 0" class="retry-info">
          You can retry in {{ formatRetryTime(countdown) }}
        </p>
      </div>
    </div>
    
    <div class="error-actions">
      <button 
        v-if="normalizedError.type !== 'permission' && onRetry"
        @click="handleRetry"
        class="retry-button"
        :disabled="isRetryDisabled"
      >
        {{ getActionText(normalizedError) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.error-handler {
  background: #2d1b1b;
  border: 2px solid #ff4444;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  color: white;
  box-shadow: 0 2px 8px rgba(255, 68, 68, 0.2);
  position: relative;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.error-close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #ccc;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.error-close-button:hover {
  background: #444;
  color: white;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.error-message h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #ff6666;
}

.error-message p {
  margin: 0;
  color: #ccc;
  font-size: 0.9rem;
}

.retry-info {
  font-style: italic;
  color: #ffaa44 !important;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.retry-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
  background: #1DB954;
  color: white;
}

.retry-button:hover:not(:disabled) {
  background: #1ed760;
}

.retry-button:disabled {
  background: #666;
  cursor: not-allowed;
}
</style> 
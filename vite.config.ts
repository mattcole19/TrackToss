import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true, // needed for ngrok
    allowedHosts: true // TODO: remove this once we have a proper domain
  }
})

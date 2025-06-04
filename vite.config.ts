import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true, // needed for ngrok
    allowedHosts: [
      'd058-2600-4040-7407-4000-557-1865-3aeb-eb99.ngrok-free.app'
    ]
  }
})

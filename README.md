# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Limitations

### Playlist Modification Permissions
Due to limitations in the Spotify Web API, the application cannot reliably determine which playlists a user has permission to modify. The API's `collaborative` field does not accurately reflect playlist permissions, and there is currently no reliable way to determine if a user can modify a playlist through the API. As a result, the application will show all playlists, but users should be aware that they may not be able to modify all playlists shown.

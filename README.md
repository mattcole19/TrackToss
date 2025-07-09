# TrackToss 🎵

A Vue 3 + TypeScript web application that helps you quickly delete songs from your Spotify playlists while being able to hear a snippet of each track. The Spotify app requires 3 clicks/taps to remove a song from the "Now Playing" view - TrackToss makes this process much faster and more efficient (and fun!).

## What TrackToss Does

- **Spotify Integration**: Authenticate with your Spotify account
- **Playlist Management**: View and manage your playlists, including Liked Songs
- **Track Removal**: Remove unwanted tracks from playlists with a single click
- **Real-time Playback**: Preview tracks before removing them using Spotify's Web Playback SDK

## Why This Isn't Publicly Available

Due to recent changes in Spotify's developer policies ([Extended Access Mode requirements](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access)), applications that require user authentication now need "Extended Access Mode" which is only available to business accounts. This policy change effectively prevents small developers from creating publicly available Spotify applications.

TrackToss was designed to be a public tool for music lovers to clean up their playlists, but these policy restrictions mean it can only be used by developers who run it locally with their own Spotify app credentials.

## Prerequisites

- Node.js (v16 or higher)
- A Spotify account
- A Spotify Developer account (free)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone git@github.com:mattcole19/TrackToss.git
cd TrackToss
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a Spotify App

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in the app details:
   - **App name**: TrackToss (or any name you prefer)
   - **App description**: A playlist cleanup tool
   - **Redirect URI**: `http://127.0.0.1:5173` (for running locally) *note: http://localhost:5173 does not work due to security changes outlined [here](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify)*
4. Save the app

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_REDIRECT_URI=http://localhost:5173
```

Replace `your_spotify_client_id_here` with the Client ID from your Spotify app dashboard.

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 6. First Time Setup

1. Open the app in your browser
2. Click "Login with Spotify"
3. Authorize the application
4. Start cleaning your playlists!

## Features

- **Authentication**: Secure OAuth flow with Spotify
- **Playlist Browsing**: View all your playlists and Liked Songs
- **Track Management**: Remove tracks from playlists with instant feedback
- **Mobile Optimization**: Touch-friendly interface that works great on mobile
- **Real-time Sync**: Changes are immediately reflected in your Spotify account

## Technical Stack

- **Frontend**: Vue 3 with TypeScript (Composition API)
- **Build Tool**: Vite
- **Styling**: CSS with mobile-first responsive design
- **API**: Spotify Web API
- **Playback**: Spotify Web Playback SDK

## Known Limitations

### Spotify Premium Required for Song Snippets
The web playback SDK will only work for premium spotify users. The other features (removing songs) should work for all users.

### Playlist Modification Permissions
Due to limitations in the Spotify Web API, the application cannot reliably determine which playlists a user has permission to modify. The API's `collaborative` field does not accurately reflect playlist permissions, and there is currently no reliable way to determine if a user can modify a playlist through the API. As a result, the application will show all playlists, but users should be aware that they may not be able to modify all playlists shown.

### Mobile Playback
On mobile devices, the first play button press may require two clicks due to browser autoplay restrictions. This is a known limitation of mobile browsers and the Spotify Web Playback SDK.

## Contributing

Contributions are welcome! While this project cannot be publicly deployed due to Spotify's policies, it's designed to be a useful tool for anyone who wants to clean up their Spotify playlists more efficiently. Whether you're fixing bugs, adding features, improving the UI, or enhancing documentation, your contributions help make TrackToss better for everyone who uses it locally.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.
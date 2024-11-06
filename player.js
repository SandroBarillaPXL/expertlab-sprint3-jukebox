const apiUrl = "http://localhost:8888"

// Extract token from URL and store it in localStorage
const params = new URLSearchParams(window.location.search);
const token = params.get('access_token');

if (token) {
    localStorage.setItem('spotifyAccessToken', token);
}

window.onload = function() {
    const storedToken = localStorage.getItem('spotifyAccessToken');
    if (!storedToken) {
        window.location = `${apiUrl}/login`;
    }
};

window.onSpotifyWebPlaybackSDKReady = () => {
    const storedToken = localStorage.getItem('spotifyAccessToken');
    if (!storedToken) {
        console.error("No access token found.");
        return;
    }

    const player = new Spotify.Player({
        name: 'Web Playback SDK Quick Start Player',
        getOAuthToken: cb => { cb(storedToken); },
        volume: 0.5
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        localStorage.setItem('device_id', device_id);
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    player.addListener('initialization_error', ({ message }) => {
        console.error(message);
    });

    player.addListener('authentication_error', ({ message }) => {
        console.error(message);
    });

    player.addListener('account_error', ({ message }) => {
        console.error(message);
    });

    document.getElementById('togglePlay').onclick = function() {
      player.togglePlay();
    };

    document.getElementById('next').onclick = function() {
      player.nextTrack();
    };

    document.getElementById('previous').onclick = function() {
      player.previousTrack();
    };

    document.getElementById('search').onclick = async () => {
        // get uri of song
        const searchQuery = document.getElementById('song-search').value;
        const trackUri = await fetch(`${apiUrl}/search?q=${searchQuery}`)
            .then(response => response.json())
            .then(data => data.uri);

        // play song uri on device
        const deviceId = localStorage.getItem('device_id'); // Retrieve device ID
        fetch(`${apiUrl}/play?uri=${trackUri}&device_id=${deviceId}`); // Pass device ID to backend

        // get song info and display
        const songInfo = await fetch(`${apiUrl}/song`)
            .then(response => response.json());
        const { name, artists } = songInfo;
        document.getElementById('player-song').innerText = name;
        document.getElementById('player-artist').innerText = artists;
    };

    player.connect();
}
const apiUrl = "http://localhost:8888"

// Extract token from URL and store it in localStorage
const params = new URLSearchParams(window.location.search);
const token = params.get('access_token');

const seekBar = document.getElementById('progress-bar');
const currentTime = document.getElementById('current-time');
const durationTime = document.getElementById('duration');
let trackDuration = 0; // Store duration of the current track in milliseconds

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

    player.addListener('player_state_changed', (state) => {
        if (!state) {
            console.error("Player state is undefined");
            return;
        }

        // Access the current track from the playback state
        const currentTrack = state.track_window.current_track;
        trackDuration = currentTrack.duration_ms;

        document.getElementById('player-song').innerText = currentTrack.name;
        document.getElementById('player-artist').innerText = currentTrack.artists[0].name;
        document.getElementById('player-image').src = currentTrack.album.images[0].url;

        // Update the duration text in minutes and seconds
        durationTime.innerText = formatTime(trackDuration);

        // Update seek bar position
        updateSeekBar(state.position, trackDuration); 
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
    }

    player.connect();

    // Update seek bar position every second
    setInterval(() => {
        player.getCurrentState().then(state => {
            if (!state) return;
            updateSeekBar(state.position, trackDuration);
        });
    }, 1000);

    // Event listener for changing the seek bar
    seekBar.addEventListener('input', (e) => {
        const newPosition = (e.target.value / 100) * trackDuration;
        player.seek(newPosition);
    });

    // Update seek bar UI based on the current track position
    function updateSeekBar(position, duration) {
        const percentage = (position / duration) * 100;
        seekBar.value = percentage;
        currentTime.innerText = formatTime(position);
    }
}

// Format time from milliseconds to MM:SS
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}
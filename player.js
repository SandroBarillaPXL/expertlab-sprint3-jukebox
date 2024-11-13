import config from '../config.js';
const apiUrl = config.apiUrl;

// Clear any existing token from localStorage on page load 
// before extracting token from URL and store it in localStorage
localStorage.removeItem('spotifyAccessToken');
const params = new URLSearchParams(window.location.search);
const token = params.get('access_token');

const seekBar = document.getElementById('progress-bar');
const currentTime = document.getElementById('current-time');
const durationTime = document.getElementById('duration');
let trackDuration = 0; // Store duration of the current track in milliseconds

if (token) {
    localStorage.setItem('spotifyAccessToken', token);
    window.history.replaceState({}, document.title, "/"); // Clean up the URL
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
        updatePlayButton(state.paused); 
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
        const searchQuery = document.getElementById('song-search').value;
        const searchLimit = document.getElementById('search-limit').value || 3;
        const deviceId = localStorage.getItem('device_id'); // Retrieve device ID
        const response = await fetch(`${apiUrl}/search?q=${searchQuery}&n=${searchLimit}`);
        const data = await response.json();

        const trackUris = Array.isArray(data.uris) ? data.uris : [];
        const searchResultContainer = document.getElementById('search-results');
        searchResultContainer.innerHTML = '';
        for (const uri of trackUris) {
            const trackContainer = document.createElement('div');
            const trackInfo = document.createElement('div');
            const id = uri.split(':')[2];
            const songResponse  = await fetch(`${apiUrl}/song?uri=${id}`);
            const { songInfo } = await songResponse.json();
            trackInfo.className = 'track-item';
            trackInfo.innerText = `${songInfo.name} - ${songInfo.artists[0].name} - ${songInfo.album.name} - ${formatTime(songInfo.duration_ms)}`;
            const trackPlayButton = document.createElement('button');
            trackPlayButton.innerText = 'Play';
            trackPlayButton.className ='play-button';
            trackPlayButton.onclick = () => {
                fetch(`${apiUrl}/play?uri=${uri}&device_id=${deviceId}`);
            };
            const trackQueueButton = document.createElement('button');
            trackQueueButton.innerText = 'Add to queue';
            trackQueueButton.className ='queue-button';
            trackQueueButton.onclick = () => {
                fetch(`${apiUrl}/queue?uri=${uri}`);
                trackQueueButton.innerText = 'Song added!';
                trackQueueButton.classList.add('active');
                const checkMark = document.createElement('img');
                checkMark.src = 'imgs/checkmark.png';
                checkMark.style.width = '20px';
                checkMark.style.height = '20px';
                checkMark.style.verticalAlign = 'middle';
                trackContainer.appendChild(checkMark);
                setTimeout(() => {
                    trackQueueButton.innerText = 'Add to queue';
                    trackQueueButton.classList.remove('active');
                    trackContainer.removeChild(checkMark);
                }, 1500);
            };
            const trackImage = document.createElement('img');
            trackImage.src = songInfo.imgUrl;
            trackImage.className = 'track-image';
            trackImage.style.width = '100px';
        
            trackContainer.appendChild(trackInfo);
            trackContainer.appendChild(trackImage);
            trackContainer.appendChild(trackPlayButton);
            trackContainer.appendChild(trackQueueButton);
            searchResultContainer.appendChild(trackContainer);
        };
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
        seekBar.style.background = `linear-gradient(to right, #9000FF ${percentage}%, #b3b3b3 ${percentage}%)`;
    }

    // Update play button UI based on the current playback state
    function updatePlayButton(paused) {
        const playButton = document.getElementById("togglePlay");
        if (paused) {
            playButton.classList = "play-button control-button";
        } else {
            playButton.classList = "pause-button control-button";
        }
    }
    
    document.getElementById("qr").onclick = () => {
        player.getCurrentState().then(async state => {
            if (!state) return;
            const id = state.track_window.current_track.uri.split(':')[2];
            const songResponse  = await fetch(`${apiUrl}/song?uri=${id}`);
            const { songInfo } = await songResponse.json();
            const url = songInfo.external_urls.spotify;
            const qrCodeContainer = document.createElement('div');
            qrCodeContainer.id = 'qr-code-container';
    
            const qrCodeImage = document.createElement('img');
            qrCodeImage.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=100x100`;
            qrCodeContainer.appendChild(qrCodeImage);
            qrCodeContainer.innerHTML += `<p>Scan the QR code to open the song in your Spotify app.</p>`;
    
            const closeButton = document.createElement('button');
            closeButton.innerText = 'Close';
            closeButton.id = 'close-qr';
            closeButton.onclick = () => {
                document.body.removeChild(qrCodeContainer);
            };
            qrCodeContainer.appendChild(closeButton);
    
            document.body.appendChild(qrCodeContainer);
        });
    };
}

// Format time from milliseconds to MM:SS
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}
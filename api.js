/*
########### SETUP ############
*/

import express from "express";
import cors from "cors";
import SpotifyWebApi from "spotify-web-api-node";
import dotenv from "dotenv";
dotenv.config();

const apiPort = 8888
const apiUrl = process.env.API_URL || `http://localhost:${port}`;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5500';

const app = express();
app.use(cors()); 
app.use(express.json());

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: `${apiUrl}/callback`
});

/*
########### ROUTES ############
*/

// ## LOGIN ##
app.get('/login', (req, res) => {
    const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state', 'streaming'];
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// ## CALLBACK ##
app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }

    // Exchange the code for an access token and a refresh token.
    spotifyApi.authorizationCodeGrant(code)
    .then(data => {
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];
        const expiresIn = data.body['expires_in'];

        // Set the access token and refresh token on the Spotify API object.
        spotifyApi.setAccessToken(accessToken);
        spotifyApi.setRefreshToken(refreshToken);
        
        // Logging tokens can be a security risk; this should be avoided in production.
        // console.log('The access token is ' + accessToken);
        // console.log('The refresh token is ' + refreshToken);

        res.redirect(`${clientUrl}?access_token=${accessToken}`);

        // Keep refreshing the access token periodically before it expires.
        setInterval(async () => {
            const data = await spotifyApi.refreshAccessToken();
            const accessTokenRefreshed = data.body['access_token'];
            spotifyApi.setAccessToken(accessTokenRefreshed);
            console.log('The access token has been refreshed at ' + new Date());
        }, expiresIn / 2 * 1000); // Refresh halfway before expiration.
    }).catch(error => {
        console.error('Error getting Tokens:', error);
        res.send('Error getting tokens');
    });
});

// ## SEARCH ##
app.get('/search', (req, res) => {
    const { q } = req.query;
    spotifyApi.searchTracks(q)
    .then(searchData => {
        const trackUri = searchData.body.tracks.items[0].uri;
        res.send({ uri: trackUri });
    }).catch(err => {
        console.error('Search Error:', err);
        res.send('Error occurred during search');
    });
});

// ## PLAY ##
app.get('/play', (req, res) => {
    const { uri, device_id } = req.query;
    spotifyApi.transferMyPlayback([device_id])
    .then(() => spotifyApi.play({ uris: [uri], device_id: device_id }))
    .then(() => res.send('Playback started'))
    .catch(err => {
        console.error('Play Error:', err);
        res.send('Error occurred during playback');
    });
});


/*
########### RUN ############
*/

console.log(`Listening at ${apiUrl}`);
app.listen(apiPort)

// source: https://www.youtube.com/watch?v=TN1uvgAyxE0 
// https://github.com/adanzweig/nodejs-spotify
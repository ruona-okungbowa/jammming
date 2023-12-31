import { error } from "console";

// Spotify API configuration
const clientID = "1b2e4d0711db4faab9a6b637df41d1b5";
const redirectURI = "http://localhost:3000/";
const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const spotifyBaseUrl = "https://api.spotify.com/v1";

// Function to generate a random string
function generateRandomString(length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

// Function to initate the Spotify login flow. Generates a code verifier, code challenge and a random state like in the API documentation
function initateLogin() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = btoa(codeVerifier); // btoa is a js function for binary to ASCII
  const state = generateRandomString(16); // Optional in the documentation but it provides protection against attacks

  // Stores the code verifier in local storage
  localStorage.setItem("code_verifier", codeVerifier);

  // Following the documentation the required params
  const params = new URLSearchParams({
    client_id: clientID,
    response_type: "code",
    redirect_uri: redirectURI,
    state: state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  // Responsible for creating the URL for the Spotify login and authorization page and the redirecting the user to that URL
  const loginURL = `${authorizationEndpoint}?${params}`;
  window.location.href = loginURL;
}

// Function to exchange the authorization code for an access token
function exchangeCodeForToken(code) {
  // Needed for the POST request
  const headers = {
    "Content-type": "application/x-www-form-urlencoded",
  };
  let codeVerifier = localStorage.getItem("code_verifier");

  // The body of the request for access token
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectURI,
    client_id: clientID,
    code_verifier: codeVerifier,
  });

  const response = fetch(tokenEndpoint, {
    method: "POST",
    headers: headers,
    body: body,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP status " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      localStorage.setItem("access_token", data.access_token);
    })
    .catch((error) => {
      console.log("Error:", error);
    });
}

/// Function to search for tracks
async function search(query) {
  const searchEndpoint = `/search?${query}&type=track`;
  const urlToFetch = `${spotifyBaseUrl}${searchEndpoint}`;
  const accessToken = localStorage.getItem("access_token");
  try {
    const response = await fetch(urlToFetch, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.ok) {
      const jsonResponse = await response.json();
      if (!jsonResponse.tracks) {
        return [];
      }
      return jsonResponse.tracks.items.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        uri: track.url,
      }));
    }
  } catch (error) {
    console.log(error);
  }
}

// Function to create and save tracks to playlist
async function savePlaylist(playlistName, trackUris) {
  if (!playlistName || trackUris.length) {
    return;
  }
  // First create the playlist using the playlistName
  // Get the user_id from the current users profile.
  let userId;
  let playlistId;
  const accessToken = localStorage.getItem("access_token");
  const headers = { Authorization: `Bearer ${accessToken}` };
  const userDetailsEndpoint = "https://api.spotify.com/v1/me";

  // Get the userId
  try {
    const userResponse = await fetch(userDetailsEndpoint, { header: headers });
    if (userResponse.ok) {
      const jsonUserResponse = await userResponse.json();
      userId = jsonUserResponse.id;
    }
  } catch (error) {
    console.log(error);
  }

  // Create playlist and add tracks to playlist
  return fetch(`https://api.spotify.com/v1//users/${userId}/playlists`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ name: playlistName }),
  })
    .then((response) => response.json())
    .then((jsonResponse) => {
      playlistId = jsonResponse.id;
      return fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: headers,
          method: "POST",
          body: JSON.stringify({ uris: trackUris }),
        }
      );
    });
}

export { search, initateLogin, exchangeCodeForToken, savePlaylist };

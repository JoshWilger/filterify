import './App.scss'
import "./icons"
import logo from "./favicon.png"

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import "url-search-params-polyfill"

import Login from 'components/Login'
import TrackTable from 'components/TrackTable'
import { getQueryParam } from "helpers"
import Logout from "components/Logout"

function App() {
  let view
  let key = new URLSearchParams(window.location.hash.substring(1))

  if (getQueryParam('spotify_error') !== '') {
    view = <div id="spotifyErrorMessage" className="lead">
      <p><FontAwesomeIcon icon={['fas', 'bolt']} style={{ fontSize: "50px", marginBottom: "20px" }} /></p>
      <p>Oops, Filterify has encountered an unexpected error (5XX) while using the Spotify API. This kind of error is due to a problem on Spotify's side, and although it's rare, unfortunately all we can do is retry later.</p>
      <p style={{ marginTop: "50px" }}>Keep an eye on the <a target="_blank" rel="noreferrer" href="https://status.spotify.dev/">Spotify Web API Status page</a> to see if there are any known problems right now, and then <a rel="noreferrer" href="?">retry</a>.</p>
    </div>
  } else if (key.has('access_token')) {
    view = <TrackTable accessToken={key.get('access_token')} />
  } else {
    view = <Login />
  }

  return (
    <div className="App container">
      <header className="App-header">
        { key.has('access_token') && <Logout /> }
        <h1>
          <img src={logo} height="35px" width="35px" style={{margin: "5px 0px 12px 0px"}} alt='' /> <a href={process.env.PUBLIC_URL}>Filterify</a>
        </h1>

        <p id="subtitle" className="lead text-secondary">
          Filter your Spotify songs.
        </p>
      </header>

      {view}
    </div>
  );
}

export default App;

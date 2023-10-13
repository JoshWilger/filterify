import React from "react"
import { ProgressBar } from "react-bootstrap"

import Bugsnag from "@bugsnag/js"
import TracksDisplayData from "./data/TracksDisplayData"
import TrackRow from "./TrackRow"
import Paginator from "./Paginator"
import TracksExporter from "./TracksExporter"
import { apiCall, apiCallErrorHandler } from "helpers"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Button } from "react-bootstrap"
import PlaylistsData from "./data/PlaylistsData"
import DataFiltering from "./DataFiltering"

class TrackTable extends React.Component {
  PAGE_SIZE = 10
  LIKED_SONGS_LABEL = "liked songs"
  NAME_LABEL = "Song"
  ARTIST_LABEL = "Artists"
  GENRE_LABEL = "Genres"
  DATE_ADDED_LABEL = "Date Added"
  PLAYLIST_LABEL = "Playlists"

  userId = null
  tracksData = null
  playlistsData = null

  state = {
    initialized: false,
    searching: false,
    playlists: [],
    tracks: [],
    likedPlaylistTracks: [],
    playlistCount: 0,
    likedSongs: {
      limit: 0,
      count: 0
    },
    currentPage: 1,
    progressBar: {
      show: false,
      label: "",
      value: 0
    },
    config: {
      includeArtistsData: false,
      includeAudioFeaturesData: false,
      includeAlbumData: false
    }
  }

  constructor(props) {
    super(props)

    this.configDropdown = React.createRef()
    this.trackSearch = React.createRef()

    if (props.config) {
      this.state.config = props.config
    }
  }

  handleTrackSearch = async (query, label) => {
    if (query.length === 0) {
      this.handleTrackSearchCancel()
    } else {
      let tracks = null

      if (label === this.NAME_LABEL) {
        tracks = await this.tracksData.nameSearch(query).catch(apiCallErrorHandler)
      }
      else if (label === this.ARTIST_LABEL) {
        tracks = await this.tracksData.artistSearch(query).catch(apiCallErrorHandler)
      }
      else if (label === this.GENRE_LABEL) {
        tracks = await this.tracksData.genreSearch(query).catch(apiCallErrorHandler)
      }
      else if (label === this.DATE_ADDED_LABEL) {
        tracks = await this.tracksData.dateSearch(query).catch(apiCallErrorHandler)
      }
      else if (label === this.PLAYLIST_LABEL) {
        // tracks = await this.tracksData.playlistSearch(query).catch(apiCallErrorHandler)
      }
      else {
        this.handleTrackSearchCancel()
        return
      }

      this.setState({
        searching: true,
        tracks: tracks,
        currentPage: 1
      })

      if (tracks.length === this.tracksData.SEARCH_LIMIT) {
        this.setSubtitle(`First ${tracks.length} results with "${query}" in ${label} name`)
      } else {
        this.setSubtitle(`${tracks.length} results with "${query}" in ${label} name`)
      }
    }
  }

  handleTrackSearchCancel = () => {
    return this.loadCurrentTrackPage().catch(apiCallErrorHandler)
  }

  loadCurrentTrackPage = async () => {
    if (this.trackSearch.current) {
      this.trackSearch.current.clear()
    }

    try {
      const tracks = await this.tracksData.tracksSlice(
        ((this.state.currentPage - 1) * this.PAGE_SIZE),
        ((this.state.currentPage - 1) * this.PAGE_SIZE) + this.PAGE_SIZE
      )

      // FIXME: Handle unmounting
      this.setState(
        {
          initialized: true,
          searching: false,
          tracks: tracks,
          playlistCount: await this.tracksData.totalTracks()
        },
        () => {
          const min = ((this.state.currentPage - 1) * this.PAGE_SIZE) + 1
          const max = Math.min(min + this.PAGE_SIZE - 1, this.state.playlistCount)
          this.setSubtitle(`${min}-${max} of ${this.state.playlistCount} songs for ${this.userId}`)
        }
      )
    } catch(error) {
      apiCallErrorHandler(error)
    }
  }

  handlePlaylistsLoadingStarted = () => {
    Bugsnag.leaveBreadcrumb("Started exporting all playlists")

    this.configDropdown.current.spin(true)
  }

  handlePlaylistsLoadingDone = () => {
    this.configDropdown.current.spin(false)
  }

  handlePlaylistsExportDone = () => {
    Bugsnag.leaveBreadcrumb("Finished exporting all playlists")

    this.setState({
      progressBar: {
        show: true,
        label: "Done!",
        value: this.state.playlistCount
      }
    })
  }

  handlePlaylistExportStarted = (playlistName, doneCount) => {
    Bugsnag.leaveBreadcrumb(`Started exporting playlist ${playlistName}`)

    this.setState({
      progressBar: {
        show: true,
        label: `Exporting ${playlistName}...`,
        value: doneCount
      }
    })
  }

  loadAllTrackData = async () => {
    await this.loadLikedTracks()
    await this.loadPlaylistData()

    await this.handleTrackDataLoadingDone()
  }

  loadLikedTracks = async () => {
    for (var offset = 0; offset < this.state.playlistCount; offset = offset + this.PAGE_SIZE) {
        this.handleTrackDataLoadingStarted(this.LIKED_SONGS_LABEL, offset)

        await this.tracksData.tracksSlice(offset, offset + this.PAGE_SIZE)
    }
  }

  loadPlaylistData = async () => {
    const myPlaylists = await this.playlistsData.allMine()

    for (var currentIndex = 0; currentIndex < myPlaylists.length; currentIndex++) {
      const progressValue = (currentIndex / myPlaylists.length) * this.state.playlistCount
      const updatedValueCheck = progressValue > this.state.progressBar.value ? progressValue : currentIndex === 0 ? 0 : this.state.progressBar.value
      // updated value check is a hotfix to prevent staggering loading bar
      this.handleTrackDataLoadingStarted(this.PLAYLIST_LABEL, updatedValueCheck)

      const playlistTracks = await this.tracksData.loadTrackPlaylists(myPlaylists[currentIndex])

      this.setState({
        likedPlaylistTracks: playlistTracks
      })
    }
  }

  handleTrackDataLoadingStarted = (label, doneCount) => {
    Bugsnag.leaveBreadcrumb(`Started loading ${label} data`)

    this.setState({
      progressBar: {
        show: true,
        label: `Loading ${label} data...`,
        value: doneCount
      }
    })
  }

  handleTrackDataLoadingDone = async () => {
    Bugsnag.leaveBreadcrumb("Finished loading song data")

    this.setState({
      progressBar: {
        show: false,
        label: "Song data loaded!",
        value: this.state.playlistCount
      }
    })
  }

  handleConfigChanged = (config) => {
    Bugsnag.leaveBreadcrumb(`Config updated to ${JSON.stringify(config)}`)

    this.setState({ config: config })
  }

  handlePageChanged = (page) => {
    try {
      this.setState(
        { currentPage: page },
        this.loadCurrentTrackPage
      )
    } catch(error) {
      apiCallErrorHandler(error)
    }
  }

  setSubtitle(subtitle) {
    if (document.getElementById("subtitle") !== null) {
      document.getElementById("subtitle").textContent = subtitle
    }
  }

  async componentDidMount() {
    try {
      const user = await apiCall("https://api.spotify.com/v1/me", this.props.accessToken)
        .then(response => response.data)

      Bugsnag.setUser(user.id, user.uri, user.display_name)

      this.userId = user.id
      this.tracksData = new TracksDisplayData(
        this.props.accessToken,
        this.userId,
        this.handlePlaylistsLoadingStarted,
        this.handlePlaylistsLoadingDone
      )
      this.playlistsData = new PlaylistsData(
        this.props.accessToken,
        this.userId,
        this.handlePlaylistsLoadingStarted,
        this.handlePlaylistsLoadingDone
      )

      await this.loadCurrentTrackPage()
      await this.loadAllTrackData()
    } catch(error) {
      apiCallErrorHandler(error)
    }
  }

  render() {
    const progressBar = <ProgressBar striped variant="primary" animated={this.state.progressBar.value < this.state.playlistCount} now={this.state.progressBar.value} max={this.state.playlistCount} label={this.state.progressBar.label} />

    if (this.state.initialized) {
      return (
        <div id="playlists">
          <div id="playlistsHeader">
            <Paginator currentPage={this.state.currentPage} pageLimit={this.PAGE_SIZE} totalRecords={this.state.playlistCount} onPageChanged={this.handlePageChanged}/>
            <TracksExporter
                accessToken={this.props.accessToken}
                onPlaylistsExportDone={this.handlePlaylistsExportDone}
                onPlaylistExportStarted={this.handlePlaylistExportStarted}
                playlistsData={this.tracksData}
                config={this.state.config}
                disabled={this.state.searching}
            />
            <Button type="submit" variant="danger" size="sm" onClick={this.exportPlaylist} className="text-nowrap" style={{margin:"0px 0px 15px 20px"}}>
                <FontAwesomeIcon icon={['fas', 'times']} size="1x" /> Reset Filters
            </Button>
            {this.state.progressBar.show && progressBar ? progressBar : <p style={{margin: "3px 0px 0px 20px"}}>Data Loaded <FontAwesomeIcon icon={['far', 'check-circle']} size="sm" /></p>}
          </div>
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th style={{width: "30px"}}></th>
                <DataFiltering label={this.NAME_LABEL} width="200px" onConfigChanged={this.handleConfigChanged} onSearch={this.handleTrackSearch} onSearchCancel={this.handleTrackSearchCancel} />
                <DataFiltering label={this.ARTIST_LABEL} width="160px" onConfigChanged={this.handleConfigChanged} onSearch={this.handleTrackSearch} onSearchCancel={this.handleTrackSearchCancel} />
                <DataFiltering label={this.GENRE_LABEL} width="200px" onConfigChanged={this.handleConfigChanged} onSearch={this.handleTrackSearch} onSearchCancel={this.handleTrackSearchCancel} />
                <DataFiltering label={this.DATE_ADDED_LABEL} width="140px" onConfigChanged={this.handleConfigChanged} onSearch={this.handleTrackSearch} onSearchCancel={this.handleTrackSearchCancel} />
                <DataFiltering label={this.PLAYLIST_LABEL} width="250px" onConfigChanged={this.handleConfigChanged} onSearch={this.handleTrackSearch} onSearchCancel={this.handleTrackSearchCancel} />
              </tr>
            </thead>
            <tbody>
              {this.state.tracks.map((trackItem, i) => {
                return <TrackRow
                  playlist={trackItem}
                  key={trackItem.id}
                  accessToken={this.props.accessToken}
                  config={this.state.config}
                  likedPlaylistTracks={this.state.likedPlaylistTracks[
                    this.state.searching ?
                    this.tracksData.trackIndex(trackItem.track.uri):
                    ((this.state.currentPage - 1) * this.PAGE_SIZE) + i
                  ]}
                  loading={this.state.progressBar.show}
                />
              })}
            </tbody>
          </table>
          <div id="playlistsFooter">
            <Paginator currentPage={this.state.currentPage} pageLimit={this.PAGE_SIZE} totalRecords={this.state.playlistCount} onPageChanged={this.handlePageChanged}/>
          </div>
        </div>
      );
    } else {
      return <div className="spinner" data-testid="playlistTableSpinner"></div>
    }
  }
}

export default TrackTable

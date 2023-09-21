import React from "react"
import { ProgressBar } from "react-bootstrap"

import Bugsnag from "@bugsnag/js"
import TracksDisplayData from "./data/TracksDisplayData"
import ConfigDropdown from "./ConfigDropdown"
import PlaylistSearch from "./PlaylistSearch"
import TrackRow from "./TrackRow"
import Paginator from "./Paginator"
import PlaylistsExporter from "./PlaylistsExporter"
import { apiCall, apiCallErrorHandler } from "helpers"

class PlaylistTable extends React.Component {
  PAGE_SIZE = 20

  userId = null
  tracksData = null

  state = {
    initialized: false,
    searching: false,
    playlists: [],
    tracks: [],
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
    this.playlistSearch = React.createRef()

    if (props.config) {
      this.state.config = props.config
    }
  }

  handlePlaylistSearch = async (query) => {
    if (query.length === 0) {
      this.handlePlaylistSearchCancel()
    } else {
      const tracks = await this.tracksData.search(query).catch(apiCallErrorHandler)

      this.setState({
        searching: true,
        tracks: tracks,
        playlistCount: tracks.length,
        currentPage: 1
      })

      if (tracks.length === this.tracksData.SEARCH_LIMIT) {
        this.setSubtitle(`First ${tracks.length} results with "${query}" in track name`)
      } else {
        this.setSubtitle(`${tracks.length} results with "${query}" in track name`)
      }
    }
  }

  handlePlaylistSearchCancel = () => {
    return this.loadCurrentPlaylistPage().catch(apiCallErrorHandler)
  }

  loadCurrentPlaylistPage = async () => {
    if (this.playlistSearch.current) {
      this.playlistSearch.current.clear()
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
          playlists: this.tracksData,
          tracks: tracks,
          playlistCount: await this.tracksData.total()
        },
        () => {
          const min = ((this.state.currentPage - 1) * this.PAGE_SIZE) + 1
          const max = Math.min(min + this.PAGE_SIZE - 1, this.state.playlistCount)
          this.setSubtitle(`${min}-${max} of ${this.state.playlistCount} tracks for ${this.userId}`)
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

  handleConfigChanged = (config) => {
    Bugsnag.leaveBreadcrumb(`Config updated to ${JSON.stringify(config)}`)

    this.setState({ config: config })
  }

  handlePageChanged = (page) => {
    try {
      this.setState(
        { currentPage: page },
        this.loadCurrentPlaylistPage
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

      await this.loadCurrentPlaylistPage()
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
            <PlaylistSearch onPlaylistSearch={this.handlePlaylistSearch} onPlaylistSearchCancel={this.handlePlaylistSearchCancel} ref={this.playlistSearch} />
            <ConfigDropdown onConfigChanged={this.handleConfigChanged} ref={this.configDropdown} />
            {this.state.progressBar.show && progressBar}
          </div>
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th style={{width: "30px"}}></th>
                <th>Name</th>
                <th style={{width: "150px"}}>Artists</th>
                <th style={{width: "100px"}}>Genres</th>
                <th style={{width: "120px"}}>Date Added</th>
                <th style={{width: "100px"}}>Liked?</th>
                <th style={{width: "100px"}} className="text-right">
                  <PlaylistsExporter
                    accessToken={this.props.accessToken}
                    onPlaylistsExportDone={this.handlePlaylistsExportDone}
                    onPlaylistExportStarted={this.handlePlaylistExportStarted}
                    playlistsData={this.tracksData}
                    config={this.state.config}
                    disabled={this.state.searching}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {this.state.tracks.map((trackItem, i) => {
                return <TrackRow
                  playlist={trackItem}
                  key={trackItem.id}
                  accessToken={this.props.accessToken}
                  config={this.state.config}
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

export default PlaylistTable

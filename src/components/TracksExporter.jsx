import React from "react"
import { Button } from "react-bootstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { saveAs } from "file-saver"
import { apiCallErrorHandler } from "helpers"

import TracksCsvFile from "components/data/TracksCsvFile"
import TracksBaseData from "components/data/TracksBaseData"
import TracksAudioFeaturesData from "components/data/TracksAudioFeaturesData"
import TracksAlbumData from "components/data/TracksAlbumData"
import TracksPlaylistData from "./data/TracksPlaylistData"

  // Handles exporting given tracks as a CSV file
  class TracksExporter extends React.Component {
  async export() {
    return this.csvData().then((data) => {
      var blob = new Blob([ data ], { type: "text/csv;charset=utf-8" })
      saveAs(blob, "filterify_songs", true)
    })
  }

  async csvData() {
    const trackItems = this.props.searching ? this.props.trackData : await this.props.trackData.all(this.props.onLoadedPlaylistCountChanged)
    const tracksBaseData = new TracksBaseData(this.props.accessToken, trackItems)
    const tracksPlaylist = new TracksPlaylistData(this.props.accessToken, trackItems, this.props.likedPlaylistTracks)
    const tracks = trackItems.map(i => i.track)
    const tracksCsvFile = new TracksCsvFile(trackItems)

    // Add base data before existing (item) data, for backward compatibility
    await tracksCsvFile.addData(tracksBaseData, true)
    await tracksCsvFile.addData(tracksPlaylist)

    if (this.props.config.includeAudioFeaturesData) {
      await tracksCsvFile.addData(new TracksAudioFeaturesData(this.props.accessToken, tracks))
    }

    if (this.props.config.includeAlbumData) {
      await tracksCsvFile.addData(new TracksAlbumData(this.props.accessToken, tracks))
    }

    return tracksCsvFile.content()
  }

  fileName() {
    return this.playlist.name.replace(/[\x00-\x1F\x7F/\\<>:;"|=,.?*[\] ]+/g, "_").toLowerCase() + ".csv" // eslint-disable-line no-control-regex
  }

  exportCurrentTracks = async () => {
    await this.export().catch(apiCallErrorHandler)
  }

  exportAllTracks = async () => {
    if (window.confirm("Are you sure you want to export all liked songs?")) {
        await this.export().catch(apiCallErrorHandler)
    }
  }

  render() {
    return <Button type="submit" variant="outline-secondary" size="xs" onClick={this.props.searching ? this.exportCurrentTracks : this.exportAllTracks} disabled={this.props.loading} className="text-nowrap" style={{margin:"5px 0px 20px 20px"}}>
      <FontAwesomeIcon icon={['fas', 'download']}/> Export to CSV
    </Button>
  }
}

export default TracksExporter

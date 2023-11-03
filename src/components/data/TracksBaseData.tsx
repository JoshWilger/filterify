import TracksData from "./TracksData"

class TracksBaseData extends TracksData {
  trackItems: any[]

  constructor(accessToken: string, trackItems: any[]) {
    super(accessToken)
    this.trackItems = trackItems
  }

  dataLabels() {
    return [
      "Track URI",
      "Track Name",
      "Artist URI(s)",
      "Artist Name(s)",
      "Album URI",
      "Album Name",
      "Album Artist URI(s)",
      "Album Artist Name(s)",
      "Album Release Date",
      "Album Image URL",
      "Disc Number",
      "Track Number",
      "Track Duration (ms)",
      "Track Preview URL",
      "Explicit",
      "Popularity",
      "ISRC"
    ]
  }

  async data() {
    return new Map(this.trackItems.map(item => {
      return [
        item.track.uri,
        [
          item.track.uri,
          item.track.name,
          item.track.artists.map((a: any) => { return a.uri }).join(', '),
          item.track.artists.map((a: any) => { return String(a.name).replace(/,/g, "\\,") }).join(', '),
          item.track.album.uri == null ? '' : item.track.album.uri,
          item.track.album.name,
          item.track.album.artists.map((a: any) => { return a.uri }).join(', '),
          item.track.album.artists.map((a: any) => { return String(a.name).replace(/,/g, "\\,") }).join(', '),
          item.track.album.release_date == null ? '' : item.track.album.release_date,
          item.track.album.images[0] == null ? '' : item.track.album.images[0].url,
          item.track.disc_number,
          item.track.track_number,
          item.track.duration_ms,
          item.track.preview_url == null ? '' : item.track.preview_url,
          item.track.explicit,
          item.track.popularity,
          item.track.external_ids.isrc == null ? '' : item.track.external_ids.isrc
        ]
      ]
    }))
  }
}

export default TracksBaseData

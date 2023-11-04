import TracksData from "./TracksData"

class TracksPlaylistData extends TracksData {
  tracks: Map<string, string[]>

  constructor(accessToken: string, trackItems: any[], trackPlaylists: string[]) {
    super(accessToken)
    this.tracks = new Map<string, string[]>(trackPlaylists.map((playlists: string, i) => {
      return [
        trackItems[i].track.uri,
        [playlists ? playlists : ""]
      ]
    }))
  }

  dataLabels() {
    return [
      "Included Playlists"
    ]
  }

  async data() {
    return this.tracks
  }
}

export default TracksPlaylistData

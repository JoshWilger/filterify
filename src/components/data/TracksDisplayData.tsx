import { apiCall } from "helpers"

// Handles cached loading of all or subsets of playlist data
class TracksDisplayData {
  PLAYLIST_LIMIT = 50
  SEARCH_LIMIT = 20

  userId: string
  private accessToken: string
  private onPlaylistsLoadingStarted?: () => void
  private onPlaylistsLoadingDone?: () => void
  private data: any[]
  private trackData: any[]
  private likedTracksPlaylist: any
  private dataInitialized = false
  private trackDataInitialized = false

  constructor(accessToken: string, userId: string, onPlaylistsLoadingStarted?: () => void, onPlaylistsLoadingDone?: () => void) {
    this.accessToken = accessToken
    this.userId = userId
    this.onPlaylistsLoadingStarted = onPlaylistsLoadingStarted
    this.onPlaylistsLoadingDone = onPlaylistsLoadingDone
    this.data = []
    this.trackData = []
    this.likedTracksPlaylist = null
  }

  async total() {
    if (!this.trackDataInitialized) {
      await this.loadLikedTracksSlice()
    }

    return this.likedTracksPlaylist.tracks.total
  }

  async tracksSlice(start: number, end: number) {
    await this.loadLikedTracksSlice(start, end)
    await this.loadSlice(start, end);

    return this.trackData.slice(start, end)
  }

  // async slice(start: number, end: number) {
  //   await this.loadSlice(start, end)
  //   await this.loadLikedTracksPlaylist()

  //   // It's a little ugly, but we slip in liked tracks with the first slice
  //   if (start === 0) {
  //     return [this.likedTracksPlaylist, ...this.data.slice(start, end)]
  //   } else {
  //     return this.data.slice(start, end)
  //   }
  // }

  async all() {
    await this.loadAll()
    await this.loadLikedTracksPlaylist()

    return [this.likedTracksPlaylist, ...this.data]
  }

  async search(query: string) {
    await this.loadAll()

    // Case-insensitive search in playlist name
    // TODO: Add lazy evaluation for performance?
    return this.trackData
      .filter(t => t.track.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, this.SEARCH_LIMIT)
  }

  async loadAll() {
    if (this.onPlaylistsLoadingStarted) {
      this.onPlaylistsLoadingStarted()
    }

    await this.loadLikedTracksSlice()

    // Get the rest of them if necessary
    for (var offset = this.PLAYLIST_LIMIT; offset < this.trackData.length; offset = offset + this.PLAYLIST_LIMIT) {
      await this.loadLikedTracksSlice(offset, offset + this.PLAYLIST_LIMIT)
    }

    if (this.onPlaylistsLoadingDone) {
      this.onPlaylistsLoadingDone()
    }
  }

  private async loadSlice(start = 0, end = start + this.PLAYLIST_LIMIT) {
    if (this.dataInitialized) {
      const loadedData = this.data.slice(start, end)

      if (loadedData.filter(i => !i).length === 0) {
        return loadedData
      }
    }

    const playlistsUrl = `https://api.spotify.com/v1/users/${this.userId}/playlists?offset=${start}&limit=${end-start}`
    const playlistsResponse = await apiCall(playlistsUrl, this.accessToken)
    const playlistsData = playlistsResponse.data

    if (!this.dataInitialized) {
      this.data = Array(playlistsData.total).fill(null)
      this.dataInitialized = true
    }

    this.data.splice(start, playlistsData.items.length, ...playlistsData.items)
  }

  private async loadLikedTracksSlice(start = 0, end = start + this.PLAYLIST_LIMIT) {
    if (this.likedTracksPlaylist == null) {
      await this.loadLikedTracksPlaylist()
    }
    if (this.trackDataInitialized) {
      const loadedData = this.trackData.slice(start, end)

      if (loadedData.filter(i => !i).length === 0) {
        return loadedData
      }
    }
    
    const likedTracksUrl = `https://api.spotify.com/v1/users/${this.userId}/tracks?offset=${start}&limit=${end-start}`
    const likedTracksResponse = await apiCall(likedTracksUrl, this.accessToken)
    const likedTracksData = likedTracksResponse.data

    if (!this.trackDataInitialized) {
      this.trackData = Array(likedTracksData.total).fill(null)
      this.trackDataInitialized = true
    }

    this.trackData.splice(start, likedTracksData.items.length, ...likedTracksData.items)
  }

  private async loadLikedTracksPlaylist() {
    if (this.likedTracksPlaylist !== null) {
      return
    }

    const likedTracksUrl = `https://api.spotify.com/v1/users/${this.userId}/tracks`
    const likedTracksResponse = await apiCall(likedTracksUrl, this.accessToken)
    const likedTracksData = likedTracksResponse.data

    this.likedTracksPlaylist = {
      "id": "liked",
      "name": "Liked",
      "public": false,
      "collaborative": false,
      "owner": {
        "id": this.userId,
        "display_name": this.userId,
        "uri": "spotify:user:" + this.userId
      },
      "tracks": {
        "href": "https://api.spotify.com/v1/me/tracks",
        "limit": likedTracksData.limit,
        "total": likedTracksData.total
      },
      "uri": "spotify:user:" + this.userId + ":saved"
    }
  }
}

export default TracksDisplayData

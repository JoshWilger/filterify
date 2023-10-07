import { apiCall } from "helpers"

// Handles cached loading of all or subsets of playlist data
class TracksDisplayData {
  PLAYLIST_LIMIT = 50
  SEARCH_LIMIT = 20

  userId: string
  private accessToken: string
  private onPlaylistsLoadingStarted?: () => void
  private onPlaylistsLoadingDone?: () => void
  private trackData: any[]
  private likedTracksPlaylist: any
  private trackDataInitialized = false

  constructor(accessToken: string, userId: string, onPlaylistsLoadingStarted?: () => void, onPlaylistsLoadingDone?: () => void) {
    this.accessToken = accessToken
    this.userId = userId
    this.onPlaylistsLoadingStarted = onPlaylistsLoadingStarted
    this.onPlaylistsLoadingDone = onPlaylistsLoadingDone
    this.trackData = []
  }

  async totalTracks() {
    if (!this.trackDataInitialized) {
      await this.loadLikedTracksSlice()
    }

    return this.trackData.length
  }

  async tracksSlice(start: number, end: number) {
    await this.loadLikedTracksSlice(start, end)

    return this.trackData.slice(start, end)
  }

  async all() {
    await this.loadAllTracks()

    return [...this.trackData]
  }

  async search(query: string) {
    await this.loadAllTracks()

    // Case-insensitive search in playlist name
    // TODO: Add lazy evaluation for performance?
    return this.trackData
      .filter(t => t.track.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, this.SEARCH_LIMIT)
  }

  async loadAllTracks() {
    await this.loadLikedTracksSlice()

    // Get the rest of them if necessary
    for (var offset = this.PLAYLIST_LIMIT; offset < this.trackData.length; offset = offset + this.PLAYLIST_LIMIT) {
      await this.loadLikedTracksSlice(offset, offset + this.PLAYLIST_LIMIT)
    }
  }

  private trackPlaylists: any[][] = []
  async loadTrackPlaylists(playlists: any[], currentIndex: number) {
    if (this.trackPlaylists.length === 0) {
      this.trackPlaylists = Array(this.trackData.length).fill(null)
    }

    var playlist = playlists[currentIndex]
    var requests = []
    var limit = playlist.tracks.limit ? 50 : 100

    for (var offset = 0; offset < playlist.tracks.total; offset = offset + limit) {
      requests.push(`${playlist.tracks.href.split('?')[0]}?offset=${offset}&limit=${limit}`)
    }

    const trackPromises = requests.map(request => { return apiCall(request, this.accessToken) })
    const trackResponses = await Promise.all(trackPromises)

    const playlistTracks = trackResponses.flatMap(response => {
      return response.data.items.filter((i: any) => i.track) // Exclude null track attributes
    })

    const allLiked = await this.all()
    const liked = allLiked.filter(t => playlistTracks.some(i => {
      return i.track.id === t.track.id
    }))

    for (let index = 0; index < liked.length; index++) {
      const elementIndex = allLiked.indexOf(liked[index]);
      const current = this.trackPlaylists[elementIndex]
      
      if (elementIndex > -1) {
        if (!current) {
          this.trackPlaylists[elementIndex] = [playlist]
        }
        else if (!current.includes(playlist)) {
          this.trackPlaylists[elementIndex].push(playlist)
        }
      }
    }

    return this.trackPlaylists
  }

  async loadArtistData(currentTracks: any) {
    const artistIds = Array.from(new Set(currentTracks.map((trackItem: any) => {
      return trackItem.track
        .artists
        .filter((a: any) => a.type === "artist")
        .map((a: any) => a.id)
        .filter((i: string) => i)
    })))

    let requests = []

    for (var offset = 0; offset < artistIds.length; offset = offset + this.PLAYLIST_LIMIT) {
      requests.push(`https://api.spotify.com/v1/artists?ids=${artistIds.slice(offset, offset + this.PLAYLIST_LIMIT)}`)
    }

    const artistPromises = requests.map(request => { return apiCall(request, this.accessToken) })
    const artistResponses = await Promise.all(artistPromises)

    const artistsById = new Map(artistResponses.flatMap((response) => response.data.artists).map((artist: any) => [artist.id, artist]))

    return new Map<string, string[]>(currentTracks.map((trackItem: any) => {
      return [
        trackItem.track.uri,
        [
          trackItem.track.artists.map((a: any) => {
            return artistsById.has(a.id) ? artistsById.get(a.id)!.genres.filter((g: string) => g).join(', ') : ""
          }).filter((g: string) => g).join(", ")
        ]
      ]
    }))
  }

  private async loadLikedTracksSlice(start = 0, end = start + this.PLAYLIST_LIMIT) {
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

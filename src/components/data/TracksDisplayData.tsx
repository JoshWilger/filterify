import { apiCall } from "helpers"

// Handles cached loading of all or subsets of playlist data
class TracksDisplayData {
  TRACK_LIMIT = 50
  SEARCH_LIMIT = 20
  private ADD_QUERY_EXPRESSION = new RegExp(" ?\\+ ?")
  private TRAITS_QUERY_EXPRESSION = new RegExp(" ?, ?")

  userId: string
  private accessToken: string
  private onTracksLoadingStarted?: () => void
  private onTracksLoadingDone?: () => void
  private trackData: any[]
  private likedTracksPlaylist: any
  private trackDataInitialized = false

  constructor(accessToken: string, userId: string, onTracksLoadingStarted?: () => void, onTracksLoadingDone?: () => void) {
    this.accessToken = accessToken
    this.userId = userId
    this.onTracksLoadingStarted = onTracksLoadingStarted
    this.onTracksLoadingDone = onTracksLoadingDone
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

  // TODO: Add lazy evaluation for performance?
  async nameSearch(query: string) {
    await this.loadAllTracks()

    // Case-insensitive search in track name
    return this.trackData.filter(
      trackItem => query.split(this.ADD_QUERY_EXPRESSION).some(
      queryWord => queryWord !== "" && queryWord.split(this.TRAITS_QUERY_EXPRESSION).every(
      queryTrait => trackItem.track.name.split(' ').some(
      (trackWord: string) => this.searchCompareStrings(trackItem.track.name, trackWord, queryTrait)
    ))))
  }

  async artistSearch(query: string) {
    await this.loadAllTracks()

    // Case-insensitive search in artist name
    return this.trackData.filter(
      trackItem => query.split(this.ADD_QUERY_EXPRESSION).some(
      queryWord => queryWord !== "" && queryWord.split(this.TRAITS_QUERY_EXPRESSION).every(
      queryTrait => trackItem.track.artists.some(
      (artist: any) => artist.name.split(' ').some(
      (artistWord: string) => this.searchCompareStrings(artist.name, artistWord, queryTrait)
    )))))
  }

  async genreSearch(query: string) {
    await this.loadAllTracks()

    // Case-insensitive search in genre name
    return this.trackData.filter(
      (trackItem: any) => query.split(this.ADD_QUERY_EXPRESSION).some(
      queryWord => queryWord !== "" && queryWord.split(this.TRAITS_QUERY_EXPRESSION).every(
      queryTrait => trackItem.genres.some(
      (genreList: string) => genreList.split(", ").some(
      (genre: string) => genre.split(' ').some(
      (genreWord: string) => this.searchCompareStrings(genre, genreWord, queryTrait) 
    ))))))
  }

  async dateSearch(query: string) {
    await this.loadAllTracks()

    // Case-insensitive search in date added name
    return this.trackData.filter(
      trackItem => query.split(this.ADD_QUERY_EXPRESSION).some(
        queryWord => queryWord !== "" && queryWord.split(this.TRAITS_QUERY_EXPRESSION).every(
        queryTrait => (trackItem.added_at.split("T")[0].substring(5) + "-" + trackItem.added_at.split("T")[0].substring(0, 4))
        .includes(queryTrait.toLowerCase())
    )))
  }

  async playlistSearch(query: string) {
    await this.loadAllTracks()
    let playlistTracks: any[] = []

    // Case-insensitive search in playlist name
    query.split(this.ADD_QUERY_EXPRESSION).map(
      queryWord => this.trackPlaylists.forEach((playlists: any[], index: number) => {
        const currentTrack = this.trackData[index]
        if (!playlists) {
          if (queryWord.toLowerCase().includes("none") && currentTrack) {
            playlistTracks.push(currentTrack)
          }
          return
        }
        const selectedPlaylists = queryWord !== "" && queryWord.split(this.TRAITS_QUERY_EXPRESSION).every(
          queryTrait => playlists.some(
          (playlist: any) => playlist.name.split(' ').some(
          (playlistWord: string) => this.searchCompareStrings(playlist.name, playlistWord, queryTrait)
        )))
        
        if (selectedPlaylists && currentTrack && !playlistTracks.includes(currentTrack)) {
          playlistTracks.push(currentTrack)
        }
      }))
    
    return playlistTracks.sort((a, b) => b.added_at.localeCompare(a.added_at))
  }

  private searchCompareStrings(baseWord: string, subBaseWord: string, queryWord: string) {
    return queryWord.includes(" ")
      ? baseWord.toLowerCase().includes(queryWord.toLowerCase())
      : subBaseWord.toLowerCase().substring(0, queryWord.length).includes(queryWord.toLowerCase())
  }

  trackIndex(trackUri: string) {
    return this.trackData.findIndex(t => t.track.uri === trackUri)
  }

  async loadAllTracks() {
    await this.loadLikedTracksSlice()

    // Get the rest of them if necessary
    for (var offset = this.TRACK_LIMIT; offset < this.trackData.length; offset = offset + this.TRACK_LIMIT) {
      await this.loadLikedTracksSlice(offset, offset + this.TRACK_LIMIT)
    }
  }

  async loadArtistData(currentTracks: any) {
    const artistIds = Array.from(new Set(currentTracks.flatMap((trackItem: any) => {
      return trackItem.track
        .artists
        .filter((a: any) => a.type === "artist")
        .map((a: any) => a.id)
        .filter((i: string) => i)
    })))

    let requests = []

    for (var offset = 0; offset < artistIds.length; offset = offset + this.SEARCH_LIMIT) {
      requests.push(`https://api.spotify.com/v1/artists?ids=${artistIds.slice(offset, offset + this.SEARCH_LIMIT)}`)
    }

    const artistPromises = requests.map(request => { return apiCall(request, this.accessToken) })
    const artistResponses = await Promise.all(artistPromises)

    const artistsById = new Map(artistResponses.flatMap((response) => response.data.artists).filter((a:any) => a).map((artist: any) => [artist.id, artist]))

    return new Map<string, string[]>(currentTracks.map((trackItem: any) => {
      return [
        trackItem.track.uri,
        [
          trackItem.track.artists.map((a: any) => {
            return artistsById.has(a.id) ? artistsById.get(a.id)!.genres.map((g: string) => g).join(', ') : ""
          }).map((g: any) => g ? g : g="-").join(" | ")
        ]
      ]
    }))
  }

  allTrackPlaylists() {
    return this.trackPlaylists
  }

  private trackPlaylists: any[][] = []
  async loadTrackPlaylists(playlist: any) {
    if (this.trackPlaylists.length === 0) {
      this.trackPlaylists = Array(this.trackData.length).fill(null)
    }

    const allLiked = await this.all()
    const likedPlaylistTracks = await this.getLikedPlaylistItems(playlist)

    for (let index = 0; index < likedPlaylistTracks.length; index++) {
      const elementIndex = allLiked.indexOf(likedPlaylistTracks[index]);
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

  private async getLikedPlaylistItems(playlist: any) {
    var playlistItems: any[] = []

    if (playlistItems.length === 0) {
      var requests = []
      var limit = playlist.tracks.limit ? 50 : 100

      for (var offset = 0; offset < playlist.tracks.total; offset = offset + limit) {
        requests.push(`${playlist.tracks.href.split('?')[0]}?offset=${offset}&limit=${limit}`)
      }

      const trackPromises = requests.map(request => { return apiCall(request, this.accessToken) })
      const trackResponses = await Promise.all(trackPromises)

      playlistItems = trackResponses.flatMap(response => {
        return response.data.items.filter((i: any) => i.track) // Exclude null track attributes
      })      
    }

    return (await this.all()).filter(t => playlistItems.some(i => {
      return i.track.id === t.track.id
    }))
  }

  private async loadLikedTracksSlice(start = 0, end = start + this.TRACK_LIMIT) {
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

    var likedTrackItems: any = likedTracksData.items
    const genres = await this.loadArtistData(likedTrackItems) // TODO: improve loading time by searching stored artist values
    likedTrackItems.map((i: any) => i.genres=genres.get(i.track.uri))

    this.trackData.splice(start, likedTrackItems.length, ...likedTrackItems)
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

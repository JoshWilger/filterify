import TracksData from "./TracksData"

class TracksCsvFile {
    trackItems: any
    columnNames: string[]
    lineData: Map<string, string[]>
  
    lineTrackUris: string[]
    lineTrackData: string[][]
  
    constructor(trackItems: any) {
      this.trackItems = trackItems
      this.columnNames = [
        "Added At",
        "Artist Genres"
      ]
  
      this.lineData = new Map()
      this.lineTrackUris = trackItems.map((i: any) => i.track.uri)
      this.lineTrackData = trackItems.map((i: any) => [
        i.added_at,
        i.genres
      ])
    }
  
    async addData(tracksData: TracksData, before = false) {
      if (before) {
        this.columnNames.unshift(...tracksData.dataLabels())
      } else {
        this.columnNames.push(...tracksData.dataLabels())
      }
  
      const data: Map<string, string[]> = await tracksData.data()
  
      this.lineTrackUris.forEach((uri: string, index: number) => {
        if (data.has(uri)) {
          if (before) {
            this.lineTrackData[index].unshift(...data.get(uri)!)
          } else {
            this.lineTrackData[index].push(...data.get(uri)!)
          }
        }
      })
    }
  
    content(): string {
      let csvContent = ''
  
      csvContent += this.columnNames.map(this.sanitize).join() + "\n"
  
      this.lineTrackData.forEach((lineTrackData, trackId) => {
        csvContent += lineTrackData.map(this.sanitize).join(",") + "\n"
      })
  
      return csvContent
    }
  
    sanitize(string: string): string {
      return '"' + String(string).replace(/"/g, '""') + '"'
    }
  }
  
  export default TracksCsvFile

import React from "react"
import ConfigDropdown from './ConfigDropdown'
import PlaylistSearch from './PlaylistSearch'

type DataFilteringProps = {
  label: string
  width: string
  onConfigChanged: (config: any) => void
  onSearch: (query: string, label: string) => void
  onSearchCancel: () => Promise<any>
}

class DataFiltering extends React.Component<DataFilteringProps> {
  private configDropdown = React.createRef<ConfigDropdown>()
  private searchBar = React.createRef<PlaylistSearch>()

  render() {
    return (
    <th style={{width: this.props.width}}>
        <div style={{display: "flex"}}>
            {this.props.label} 
            <ConfigDropdown onConfigChanged={this.props.onConfigChanged} ref={this.configDropdown}  />                        
        </div>
        <PlaylistSearch label={this.props.label} onPlaylistSearch={this.props.onSearch} onPlaylistSearchCancel={this.props.onSearchCancel} ref={this.searchBar}/>
    </th>
    )
  }
}

export default DataFiltering

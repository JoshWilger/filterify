import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

class TrackRow extends React.Component {
  renderTickCross(condition) {
    if (condition) {
      return <FontAwesomeIcon icon={['far', 'check-circle']} size="sm" />
    } else {
      return <FontAwesomeIcon icon={['far', 'times-circle']} size="sm" style={{ color: '#ECEBE8' }} />
    }
  }

  renderIcon(track) {
    if (track.name === 'Liked') {
      return <FontAwesomeIcon icon={['far', 'heart']} style={{ color: 'red' }} />;
    } else {
      return <FontAwesomeIcon icon={['fas', 'music']} />;
    }
  }

  // https://stackoverflow.com/questions/74492350/date-time-formatting-in-react
  formatDate(dateToFormat) {
    // Splitting the string between date and time
    const [date] = dateToFormat.split("T");
    const [year, month, day] = date.split("-")

    return `${month}/${day}/${year}`
  }

  renderArtists(artists) {
    let names = Array(artists.length).fill(null)

    for (var i = 0; i < artists.length; i = i++) {
      names[i] = artists[i].name
    }

    return names
  }

  render() {
    let track = this.props.playlist.track

    if(track.uri==null) return (
      <tr key={track.name}>
        <td>{this.renderIcon(track)}</td>
        <td>{track.name}</td>
        <td colSpan="2">This track is not supported</td>
        <td>{this.renderTickCross(track.explicit)}</td>
        <td>{this.renderTickCross(true)}</td>
        <td>&nbsp;</td>
      </tr>
    );

    return (
      <tr key={track.uri}>
        <td>{this.renderIcon(track)}</td>
        <td><a href={track.uri}>{track.name}</a></td>
        <td><a href={track.artists[0].uri}>{track.artists[0].name}</a></td>
        <td>&nbsp;</td>
        <td>{this.formatDate(this.props.playlist.added_at)}</td>
        <td>{this.renderTickCross(true)}</td>
        <td>&nbsp;</td>
      </tr>
    );
  }
}

export default TrackRow

import React, { useEffect, useState } from 'react'
// import SpotifyPlayer from 'react-spotify-web-playback';
const Player = ({accessToken, trackUri = ""}) => {
    const [play, setPlay] = useState(false)

    useEffect(() => setPlay(true),[trackUri])
    // console.log(trackUri)
    var res = trackUri.split(":")
    // console.log(res[1])
    // console.log(res[2])
    const str = `https://open.spotify.com/embed/${res[1]}/${res[2]}`
    if(!accessToken) return null
    return (
        // <SpotifyPlayer 
        //     token={accessToken}
        //     showSaveIcon
        //     callback={state => {
        //         if(!state.isPlaying) setPlay(false)
        //     }}
        //     play={play}
        //     uris={trackUri ? [trackUri] : []}
        // />
        // <iframe src={trackUri}></iframe>
        <iframe src={str} width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
        
    )
}

export default Player

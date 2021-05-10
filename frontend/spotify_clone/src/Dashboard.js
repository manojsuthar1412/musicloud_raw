import React, { useCallback, useEffect, useState } from "react";
import useAuth from "./useAuth";
import SpotifyWebApi from "spotify-web-api-node";
import TrackSearchResult from "./TrackSearchResult";
import Player from "./Player";
import axios from "axios";
import CustomPlayer from "./CustomPlayer";

const backend = process.env.REACT_APP_BACKEND;
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.REACT_APP_CLIENT_ID,
});

const Dashboard = ({ code }) => {
  const accessToken = useAuth(code);
  const [search, setSearch] = useState();
  const [searchResult, setSearchResult] = useState([]);
  const [playingTrack, setPlayingTrack] = useState();
  const [art, setArt] = useState([]);
  const [reload, setReload] = useState(false);

  const [lyrics, setLyrics] = useState("");

  const searchSongs = () => {
    if (!search) return setSearchResult([]);
    if (!accessToken) return;
    setArt([]);
    let cancel = false;
    spotifyApi.searchTracks(search).then((res) => {
      if (cancel) return;
      setSearchResult(
        res.body.tracks.items.map((track) => {
          // console.log(track);
          const smallAlbumImage = track.album.images.reduce(
            (smallest, image) => {
              if (image.height < smallest.height) return image;
              return smallest;
            },
            track.album.images[0]
          );
          //   console.log("Track: ", track.external_urls.spotify);
          return {
            artist: track.artists,
            title: track.name,
            uri: track.uri,
            albumUrl: smallAlbumImage.url,
            externalUrl: track.external_urls.spotify,
          };
        })
      );
    });

    return () => (cancel = true);
  };

  const chooseTrack = (track) => {
    // console.log("Playing track: ", track);
    track.artist.forEach((artist) => {
      setArt((arr) => [...arr, artist.name]);
    });
    setSearch("");
    setPlayingTrack(track);
    setSearchResult([]);
    // setReload(true);
    // setLyrics("");
  };

  const playingLyrics = () => {
    if (!playingTrack) return;

    axios
      .get(`${backend}/lyrics`, {
        params: {
          track: playingTrack.title,
          artist: playingTrack.artist[0].name,
        },
      })
      .then((res) => {
        setLyrics(res.data.lyrics);
      });
  };

  useEffect(() => {
    if (!accessToken) return;
    spotifyApi.setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    searchSongs();
    // setArt([]);
  }, [search, accessToken]);

  const handlePlay = (curr_track) => {
    // console.log(art);

    return (
      <CustomPlayer
        track={curr_track}
        artists={art}
        reload={reload}
        setReload={setReload}
      />
    );
  };

  return (
    <div
      className="container d-flex flex-column py-2"
      style={{ height: "100vh" }}
    >
      <input
        className="form-control"
        type="search"
        placeholder="Search songs/artists"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex-grow-1 my-2" style={{ overflowY: "auto" }}>
        {searchResult.map((track) => {
          return (
            <TrackSearchResult
              track={track}
              key={track.uri}
              chooseTrack={chooseTrack}
            />
          );
        })}
        {searchResult.length === 0 && (
          <div className="text-center" style={{ whiteSpace: "pre" }}>
            {lyrics}
          </div>
        )}
      </div>
      <div>
        {/* <Player accessToken={accessToken} trackUri={playingTrack?.uri} /> */}
        {playingTrack && handlePlay(playingTrack)}
      </div>
    </div>
  );
};

export default Dashboard;

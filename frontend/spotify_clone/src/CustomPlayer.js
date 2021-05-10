import React, { useEffect, useState } from "react";
import axios from "axios";

const backend = process.env.REACT_APP_BACKEND;

const CustomPlayer = ({
  track,
  artists,
  reload = undefined,
  setReload = (f) => f,
}) => {
  const [names, setNames] = useState([]);
  const [url, setUrl] = useState("");
  const [flagRef, setFlagRef] = useState(false);
  const [path, setPath] = useState("");

  const startUp = async () => {
    // setUrl("");
    // setNames([]);
    await axios.get(`${backend}/list`).then((res) => {
      let data = JSON.parse(res.data);
      data.ListBucketResult.Contents.forEach((name) => {
        setNames((arr) => [...arr, name.Key._text]);
      });
    });
    // PlaySong();
    // setReload(!reload);
  };

  const PlaySong = async () => {
    setUrl("");
    // console.log("TITLE: ", track.title);
    // setFlagRef(!flagRef);

    // console.log("NAMES: ", names);
    await names.forEach((name) => {
      if (name.includes(track.title)) {
        let test = name.replaceAll(" ", "%20");
        setUrl(
          `https://testmusicdata.s3.us-south.cloud-object-storage.appdomain.cloud/${test}`
        );
        // setFlagRef(false);
      }
    });
    // console.log("URL IN PLAYSONG: ", url);
  };

  const handlePath = (e) => {
    console.log(e.target.value);
  };

  const handleDwnld = async () => {
    console.log("URL: ", url);
    console.log("FLAG: ", flagRef);
    console.log("RELOAD: ", reload);
    if (!url && flagRef) {
      console.log(names);
      console.log("Downloading....");
      console.log(artists);
      // setFlagRef(!flagRef);
      let name = "";
      let dest = "";

      await axios
        .get(`${backend}/download`, {
          params: {
            uri: track.externalUrl,
            title: track.title,
            artist: artists,
            dest_path: path,
          },
        })
        .then((res) => {
          // startUp();
          // setUrl("");
          // console.log(res);
          name = res.data.name;
          dest = res.data.dest;
          setFlagRef(true);
          console.log("DONE");
          // console.log(res);
        });
      console.log("NAME: ", name);
      console.log("DEST: ", dest);
      axios
        .get(`${backend}/upload`, {
          params: {
            name: name,
            dest: dest,
          },
        })
        .then((res) => {
          console.log("RES FROM UPLOAD: ", res);
        });
    }
  };

  const Myplayer = () => (
    <audio controls>
      {/* {console.log("URL IN HTML: ", url)} */}
      <source src={url} type="audio/ogg" />
    </audio>
  );

  useEffect(async () => {
    await startUp();
    await PlaySong();
    handleDwnld();
    setReload(!reload);
  }, []);

  useEffect(async () => {
    await PlaySong();
    handleDwnld();

    // setFlagRef(!flagRef);
  }, [track, reload]);

  // useEffect(() => {
  //   handleDwnld();
  // }, []);

  return (
    <div>
      <h1>
        <span>{track.title} </span>
        <span>
          {url
            ? url.includes(track.title[0])
              ? "-will play"
              : "-downloading"
            : "Error"}
        </span>
        <button
          className="btn btn-outline-warning btn-sm ms-5 me-auto"
          onClick={() => {
            startUp();
            setFlagRef(!flagRef);
            setReload(!reload);
          }}
        >
          Refresh
        </button>
      </h1>
      {url}
      {/* <input type="file" onChange={handlePath} /> */}

      {url && <Myplayer />}
    </div>
  );
};

export default CustomPlayer;

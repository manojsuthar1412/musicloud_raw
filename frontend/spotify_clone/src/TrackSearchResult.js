import React from "react";

const TrackSearchResult = ({ track, chooseTrack }) => {
  function handlePlay() {
    chooseTrack(track);
  }
  return (
    <div
      className="d-flex m-2 align-items-center"
      style={{ cursor: "pointer" }}
      onClick={handlePlay}
    >
      <img src={track.albumUrl} style={{ height: "64px", width: "64px" }} />
      <div className="ms-3">
        <div className="fw-bold">{track.title}</div>
        <div className="text-muted">{track.artist[0].name}</div>
      </div>
    </div>
  );
};

export default TrackSearchResult;

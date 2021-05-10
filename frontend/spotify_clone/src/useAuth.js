import { useEffect, useState } from "react";
import axios from "axios";
import login from "./Login";

const backend = process.env.REACT_APP_BACKEND;
console.log("BACKEND: ", backend);

export default function useAuth(code) {
  const [accessToken, setAccessToken] = useState();
  const [refreshToken, setRefreshToken] = useState();
  const [expiresIn, setExpiresIn] = useState();

  const login = () => {
    axios
      .post(`${backend}/login`, { code })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        setRefreshToken(res.data.refreshToken);
        setExpiresIn(res.data.expiresIn);
        window.history.pushState({}, null, "/");
      })
      .catch((err) => {
        console.log(err);
        window.location = "/";
      });
  };

  const refresh = () => {
    if (!refreshToken || !expiresIn) return;
    const interval = setInterval(() => {
      axios
        .post(`${backend}/refresh`, { refreshToken })
        .then((res) => {
          setAccessToken(res.data.accessToken);
          setExpiresIn(res.data.expiresIn);
        })
        .catch(() => {
          window.location = "/";
        });
    }, (expiresIn - 60) * 1000);
    return () => clearInterval(interval);
  };

  useEffect(() => {
    login();
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refreshToken, expiresIn]);

  return accessToken;
}

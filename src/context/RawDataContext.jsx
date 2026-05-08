import { createContext, useContext, useState, useEffect } from "react";
import { RAW as STATIC_RAW } from "../data/activeRaw";
import { AUTH_SESSION_KEY } from "../data/constants";

// Initialise with the bundled static dataset so the app renders immediately
// in development and in tests (no async required when REACT_APP_API_URL is absent).
const RawDataContext = createContext(STATIC_RAW);

const API_URL = process.env.REACT_APP_API_URL;

export function RawDataProvider({ children }) {
  const [raw, setRaw] = useState(STATIC_RAW);

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/api/raw`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401) {
          // Cookie expired or was cleared — force re-login
          sessionStorage.removeItem(AUTH_SESSION_KEY);
          window.location.reload();
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => { if (data) setRaw(data); })
      .catch((err) =>
        console.error("Failed to load barge data from API, using static fallback:", err)
      );
  }, []);

  return (
    <RawDataContext.Provider value={raw}>{children}</RawDataContext.Provider>
  );
}

export function useRaw() {
  return useContext(RawDataContext);
}

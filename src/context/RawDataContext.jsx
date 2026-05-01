import { createContext, useContext, useState, useEffect } from "react";
import { RAW as STATIC_RAW } from "../data/activeRaw";

// Initialise with the bundled static dataset so the app renders immediately
// in development and in tests (no async required when REACT_APP_API_URL is absent).
const RawDataContext = createContext(STATIC_RAW);

const API_URL = process.env.REACT_APP_API_URL;

export function RawDataProvider({ children }) {
  const [raw, setRaw] = useState(STATIC_RAW);

  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/api/raw`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setRaw)
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

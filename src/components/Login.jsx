import { useState } from "react";
import { theme } from "../data/theme";
import { ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SESSION_KEY } from "../data/constants";

const API_URL = process.env.REACT_APP_API_URL;

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (API_URL) {
        // Server-side auth: POST credentials, server issues httpOnly cookie
        const res = await fetch(`${API_URL}/api/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
          sessionStorage.setItem(AUTH_SESSION_KEY, "true");
          onSuccess();
        } else {
          setError("Incorrect username or password.");
        }
      } else {
        // Local / static dev fallback: client-side check (no server running)
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          sessionStorage.setItem(AUTH_SESSION_KEY, "true");
          onSuccess();
        } else {
          setError("Incorrect username or password.");
        }
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bgPrimary,
        fontFamily: theme.fontSans,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input:focus { outline: none; box-shadow: 0 0 0 2px ${theme.accent}40; border-color: ${theme.accent} !important; }
        .login-btn:hover:not(:disabled) { background: ${theme.accentHover} !important; }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div
        style={{
          background: theme.bgSecondary,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius.xl,
          boxShadow: theme.shadowLg,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius.lg,
              background: theme.accentMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: theme.textPrimary,
            }}
          >
            Barge Planner
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: theme.textSecondary,
            }}
          >
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: theme.textSecondary,
                marginBottom: 6,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                color: theme.textPrimary,
                background: theme.bgPrimary,
                border: `1px solid ${error ? theme.error : theme.borderMuted}`,
                borderRadius: theme.radius.md,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: theme.textSecondary,
                marginBottom: 6,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                color: theme.textPrimary,
                background: theme.bgPrimary,
                border: `1px solid ${error ? theme.error : theme.borderMuted}`,
                borderRadius: theme.radius.md,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "9px 12px",
                background: theme.errorBg,
                border: `1px solid ${theme.error}30`,
                borderRadius: theme.radius.md,
                color: theme.error,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: 600,
              color: "#fff",
              background: theme.accent,
              border: "none",
              borderRadius: theme.radius.md,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

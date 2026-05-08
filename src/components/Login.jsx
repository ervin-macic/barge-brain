import { useState } from "react";
import { theme } from "../data/theme";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "../data/constants";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setError(null);
      onSuccess();
    } else {
      setError("Incorrect username or password.");
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
        .login-btn:hover { background: ${theme.accentHover} !important; }
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
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

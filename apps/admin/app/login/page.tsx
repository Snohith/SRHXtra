"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signIn, token } = useAuth();
  const router = useRouter();
  const [apiToken, setApiToken] = useState("");
  const [userId, setUserId] = useState("admin@srh.local");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(apiToken, userId);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    router.replace("/");
    return null;
  }

  return (
    <div className="form-narrow">
      <div className="pagehead">
        <div>
          <h1>Staff sign-in</h1>
          <p className="sub">
            Verify your staff API token to open the dashboard.
          </p>
        </div>
      </div>
      <div className="panel">
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={onSubmit}>
          <label className="field">
            Staff API token
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="ADMIN_API_TOKEN value"
              autoComplete="off"
            />
          </label>
          <label className="field">
            Staff email or user ID
            <span className="hint">
              Identifies whose roles apply to your actions.
            </span>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="admin@srh.local"
            />
          </label>
          <button
            className="btn primary"
            type="submit"
            disabled={busy || !apiToken || !userId}
          >
            {busy ? "Verifying…" : "Sign in"}
          </button>
        </form>
      </div>
      <p className="muted small">
        Local default token is <code>dev-admin-token</code> with user{" "}
        <code>admin@srh.local</code>. Credentials are verified server-side on
        every admin request.
      </p>
    </div>
  );
}

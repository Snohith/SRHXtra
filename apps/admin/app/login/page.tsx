"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Loader2,
  LogIn,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signIn, token } = useAuth();
  const router = useRouter();
  const [apiToken, setApiToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(apiToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (token) router.replace("/");
  }, [token, router]);

  if (token) return null;

  return (
    <div className="login">
      <section className="login-brand">
        <div className="lb-top">
          <span className="lb-mark">
            <span className="brand-mark">X</span>
            SRH <em>Xtra</em>
          </span>
        </div>

        <div className="lb-mid">
          <div className="lb-copy">
            <h1>
              The newsroom console
              <br />
              for <em>Sunrisers Hyderabad</em>.
            </h1>
            <p>
              Draft, review, schedule, and publish — every story flows through a
              guarded pipeline that keeps the public site in sync within
              seconds.
            </p>
          </div>
          <div className="lb-features">
            <div className="lb-feat">
              <span className="lb-ico">
                <Workflow size={16} />
              </span>
              Draft → review → publish workflow with full revision history
            </div>
            <div className="lb-feat">
              <span className="lb-ico">
                <CalendarClock size={16} />
              </span>
              Scheduled publishing, autosave, and a searchable media library
            </div>
            <div className="lb-feat">
              <span className="lb-ico">
                <ShieldCheck size={16} />
              </span>
              Role-aware controls, audit trail, and durable delivery
            </div>
          </div>
        </div>

        <div className="lb-foot">
          SRH Xtra · Editorial operations — {new Date().getFullYear()}
        </div>
      </section>

      <section className="login-form">
        <div className="login-card">
          <div className="login-card-head">
            <h1>Staff sign-in</h1>
            <p>Enter your personal staff API token to open the dashboard.</p>
          </div>

          <div className="panel">
            {error && (
              <div className="alert error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <form onSubmit={onSubmit}>
              <label className="field">
                Staff API token
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Your staff API token"
                  autoComplete="off"
                />
              </label>
              <button
                className="btn primary"
                type="submit"
                disabled={busy || !apiToken}
              >
                {busy ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <LogIn size={15} />
                    Sign in
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

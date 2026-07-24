import { useEffect, useState } from "react";

async function authRequest(path, options = {}) {
  const response = await fetch(`/api/auth${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || "Authentication failed.");
  return body;
}

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("signin");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authRequest("/me")
      .then(({ user }) => setSession({ user }))
      .catch(() => setSession(null));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const { user } = await authRequest(mode === "signup" ? "/register" : "/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      setSession({ user });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await authRequest("/logout", { method: "POST" });
    setSession(null);
  }

  if (session === undefined) return <div className="auth-page"><p>Checking your session…</p></div>;
  if (session) return children({ session, signOut });

  return <main className="auth-page"><section className="auth-card">
    <p className="auth-eyebrow">Envelope Expense Tracker</p>
    <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
    <p>Your budgets and transactions stay private to your account.</p>
    <form onSubmit={submit}>
      <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
      <label className="field"><span>Password</span><input name="password" type="password" minLength="8" maxLength="128" autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>
      <button type="submit" disabled={submitting}>{submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    {message && <p className="notice error">{message}</p>}
    <button className="auth-link" type="button" onClick={() => {
      setMode(mode === "signup" ? "signin" : "signup");
      setMessage("");
    }}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
  </section></main>;
}

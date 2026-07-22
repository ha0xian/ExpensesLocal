import { useEffect, useState } from "react";
import { supabase, isAuthConfigured, isAuthDisabled } from "../lib/supabase.js";
import { setAccessToken } from "../lib/api-client.js";

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("signin");
  const [message, setMessage] = useState("");
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (isAuthDisabled) { setSession({ user: { email: "Local development" } }); return; }
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token);
      setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setAccessToken(next?.access_token);
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (isAuthDisabled) return children({ session, signOut: undefined });
  if (!isAuthConfigured) return <div className="auth-page"><div className="auth-card"><h1>Authentication setup required</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the frontend environment.</p></div></div>;
  if (session === undefined) return <div className="auth-page"><p>Checking your session…</p></div>;
  if (session && recovering) return <main className="auth-page"><section className="auth-card"><h1>Choose a new password</h1><form onSubmit={async (event) => {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error?.message || "Password updated.");
    if (!error) setRecovering(false);
  }}><label className="field"><span>New password</span><input name="password" type="password" minLength="8" required /></label><button type="submit">Update password</button></form>{message && <p className="notice">{message}</p>}</section></main>;
  if (session) return children({ session, signOut: () => supabase.auth.signOut() });

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setMessage(result.error?.message || (mode === "signup" ? "Check your email to confirm your account." : "Signed in."));
  }

  async function resetPassword() {
    const email = document.querySelector("#auth-email")?.value;
    if (!email) return setMessage("Enter your email address first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setMessage(error?.message || "Password reset email sent.");
  }

  return <main className="auth-page"><section className="auth-card">
    <p className="auth-eyebrow">Envelope Expense Tracker</p>
    <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
    <p>Your budgets and transactions stay private to your account.</p>
    <form onSubmit={submit}>
      <label className="field"><span>Email</span><input id="auth-email" name="email" type="email" autoComplete="email" required /></label>
      <label className="field"><span>Password</span><input name="password" type="password" minLength="8" autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>
      <button type="submit">{mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    {message && <p className="notice">{message}</p>}
    <button className="auth-link" type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
    {mode === "signin" && <button className="auth-link" type="button" onClick={resetPassword}>Forgot password?</button>}
  </section></main>;
}

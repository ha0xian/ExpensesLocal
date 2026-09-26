import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "./ui/alert.jsx";
import { Button } from "./ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.jsx";
import { Field, FieldGroup, FieldLabel } from "./ui/field.jsx";
import { Input } from "./ui/input.jsx";
import { Spinner } from "./ui/spinner.jsx";

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

  if (session === undefined) return <div className="auth-page"><Spinner /><p>Checking your session...</p></div>;
  if (session) return children({ session, signOut });

  return <main className="auth-page"><Card className="auth-card"><CardHeader><p className="auth-eyebrow">Envelope Expense Tracker</p><CardTitle>{mode === "signup" ? "Create your account" : "Welcome back"}</CardTitle><CardDescription>Your budgets and transactions stay private to your account.</CardDescription></CardHeader><CardContent>
    <form onSubmit={submit}><FieldGroup>
      <Field><FieldLabel htmlFor="auth-email">Email</FieldLabel><Input id="auth-email" name="email" type="email" autoComplete="email" required /></Field>
      <Field><FieldLabel htmlFor="auth-password">Password</FieldLabel><Input id="auth-password" name="password" type="password" minLength="8" maxLength="128" autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></Field>
      <Button type="submit" disabled={submitting}>{submitting && <Spinner data-icon="inline-start" />}{submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}</Button>
    </FieldGroup></form>
    {message && <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>}
    <Button variant="link" type="button" onClick={() => {
      setMode(mode === "signup" ? "signin" : "signup");
      setMessage("");
    }}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</Button>
  </CardContent></Card></main>;
}

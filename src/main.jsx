import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { AuthGate } from "./components/AuthGate.jsx";

createRoot(document.getElementById("root")).render(
  <AuthGate>{({ session, signOut }) => <App session={session} onSignOut={signOut} />}</AuthGate>
);

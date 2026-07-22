import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isAuthConfigured = Boolean(url && anonKey);
export const isAuthDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";
export const supabase = isAuthConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

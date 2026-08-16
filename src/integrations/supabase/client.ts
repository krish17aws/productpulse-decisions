import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export const supabaseConfigured = Boolean(url && publishableKey);

/**
 * Browser Supabase client for the connected external project.
 * Uses the publishable (anon) key only — never a service-role key.
 */
export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

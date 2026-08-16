/** True when the EXTERNAL backend connection env vars are present. */
export const supabaseConfigured = Boolean(
  import.meta.env["VITE_EXTERNAL_SUPABASE_URL"] &&
    import.meta.env["VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY"],
);

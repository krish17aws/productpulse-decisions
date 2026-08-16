/**
 * External Supabase client (singleton).
 *
 * This app reads its data and authenticates against an EXTERNAL Supabase
 * project that already owns the ProductPulse schema, data, users and n8n
 * integrations. The Lovable Cloud backend stays enabled but unused.
 *
 * Configure via:
 *   VITE_EXTERNAL_SUPABASE_URL
 *   VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY
 *
 * Never put a service-role / sb_secret_ key here — this runs in the browser.
 * There must be exactly ONE Supabase client for the external project, with no
 * custom fetch wrapper, no AbortController timeout and no retry loop.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EXTERNAL_URL = import.meta.env["VITE_EXTERNAL_SUPABASE_URL"] as string | undefined;
const EXTERNAL_KEY = import.meta.env["VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY"] as
  | string
  | undefined;

export const externalSupabaseConfigured = Boolean(EXTERNAL_URL && EXTERNAL_KEY);

function createExternalClient(): SupabaseClient {
  if (!EXTERNAL_URL || !EXTERNAL_KEY) {
    const missing = [
      ...(!EXTERNAL_URL ? ["VITE_EXTERNAL_SUPABASE_URL"] : []),
      ...(!EXTERNAL_KEY ? ["VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY"] : []),
    ].join(", ");
    throw new Error(`Missing external backend environment variable(s): ${missing}.`);
  }

  return createClient(EXTERNAL_URL, EXTERNAL_KEY, {
    auth: {
      storageKey: "productpulse-external-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let _client: SupabaseClient | undefined;

/** Single shared external Supabase client used for auth and all dashboard reads. */
export const externalSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = createExternalClient();
    return Reflect.get(_client, prop, receiver);
  },
});

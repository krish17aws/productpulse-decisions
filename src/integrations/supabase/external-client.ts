/**
 * External Supabase client.
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
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const EXTERNAL_URL = import.meta.env["VITE_EXTERNAL_SUPABASE_URL"] as string | undefined;
const EXTERNAL_KEY = import.meta.env["VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY"] as
  | string
  | undefined;

export const externalSupabaseConfigured = Boolean(EXTERNAL_URL && EXTERNAL_KEY);

function isOpaqueApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createExternalFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    // New-format keys are opaque strings, not bearer JWTs.
    if (isOpaqueApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function createExternalClient(): SupabaseClient {
  if (!EXTERNAL_URL || !EXTERNAL_KEY) {
    const missing = [
      ...(!EXTERNAL_URL ? ["VITE_EXTERNAL_SUPABASE_URL"] : []),
      ...(!EXTERNAL_KEY ? ["VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY"] : []),
    ].join(", ");
    throw new Error(`Missing external backend environment variable(s): ${missing}.`);
  }

  return createClient(EXTERNAL_URL, EXTERNAL_KEY, {
    global: { fetch: createExternalFetch(EXTERNAL_KEY) },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      storageKey: "productpulse-external-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _client: SupabaseClient | undefined;

/** Lazily-created external Supabase client used for auth and all dashboard reads. */
export const externalSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = createExternalClient();
    return Reflect.get(_client, prop, receiver);
  },
});

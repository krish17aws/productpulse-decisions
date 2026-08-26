export const APP_VERSION =
  (import.meta.env["VITE_APP_VERSION"] as string | undefined)?.trim() ||
  "1.1.3";

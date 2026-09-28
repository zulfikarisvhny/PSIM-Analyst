// lib/supabase/psimBrowserClient.ts
// Auth + data client for client components — the "PSIM Yogyakarta" Supabase
// project (separate from the older project the rest of lib/scouting still
// reads from). Session is stored in cookies (not localStorage) so the
// middleware can read it on the server for route protection.
import { createBrowserClient } from "@supabase/ssr";

export function createPsimBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_PSIM_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PSIM_SUPABASE_ANON_KEY!
  );
}

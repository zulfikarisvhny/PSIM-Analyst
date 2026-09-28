// lib/supabase/psimAdminClient.ts
// service_role client — bypasses RLS entirely. Import this ONLY from
// server-only code (Route Handlers, Server Actions). Never import it from a
// "use client" component or anything that could end up in the browser bundle.
import { createClient } from "@supabase/supabase-js";

export function createPsimAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_PSIM_SUPABASE_URL!, process.env.PSIM_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

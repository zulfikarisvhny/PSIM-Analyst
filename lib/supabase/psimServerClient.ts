// lib/supabase/psimServerClient.ts
// Server-side (Server Component / Route Handler) client for the PSIM Auth
// project — reads the session from the incoming request's cookies.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createPsimServerClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_PSIM_SUPABASE_URL!, process.env.NEXT_PUBLIC_PSIM_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component that can't set cookies — the
          // middleware below already refreshes the session on every request.
        }
      },
    },
  });
}

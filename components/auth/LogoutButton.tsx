// components/auth/LogoutButton.tsx
"use client";
import { useRouter } from "next/navigation";
import { createPsimBrowserClient } from "@/lib/supabase/psimBrowserClient";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createPsimBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
    >
      Sign out
    </button>
  );
}

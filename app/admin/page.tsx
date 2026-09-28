// app/admin/page.tsx
import Link from "next/link";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";
import { InviteForm } from "@/components/admin/InviteForm";
import { DashboardPageShell } from "@/components/DashboardPageShell";
import shell from "@/components/DashboardShell.module.css";

function isAdmin(email: string | undefined | null) {
  const allowlist = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && allowlist.includes(email.toLowerCase());
}

export default async function AdminPage() {
  const supabase = createPsimServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return (
      <main className={`${shell.page} flex items-center justify-center px-4`}>
        <div className={shell.blueField} aria-hidden="true" />
        <div className={shell.navySlice} aria-hidden="true" />
        <div className={shell.grain} aria-hidden="true" />
        <div className="relative z-[1] text-center">
          <p className="text-sm text-gray-500 mb-2">You don&apos;t have access to this page.</p>
          <Link href="/" className="text-sm font-semibold text-blue-600 underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const admin = createPsimAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers();
  const users = usersData?.users ?? [];

  return (
    <DashboardPageShell title="Staff Access" description="Invite staff to PSIM Intelligence Dashboard.">
      <div className={`${shell.card} p-5 mb-6`}>
        <InviteForm />
      </div>

      <div className={`${shell.card} p-5`}>
        <h2 className="text-sm font-bold text-[#121b2d] mb-3">{users.length} account(s)</h2>
        <div className="flex flex-col gap-1.5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs">
              <span className="text-gray-700">{u.email}</span>
              <span className={u.last_sign_in_at ? "text-emerald-600" : "text-gray-400"}>
                {u.last_sign_in_at ? "Active" : "Invited — not signed in yet"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardPageShell>
  );
}

// app/api/admin/invite/route.ts
import { NextResponse } from "next/server";
import { createPsimServerClient } from "@/lib/supabase/psimServerClient";
import { createPsimAdminClient } from "@/lib/supabase/psimAdminClient";

function isAdmin(email: string | undefined | null) {
  const allowlist = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && allowlist.includes(email.toLowerCase());
}

export async function POST(request: Request) {
  const supabase = createPsimServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createPsimAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

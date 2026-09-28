// components/admin/InviteForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage({ ok: false, text: body.error ?? "Failed to invite." });
      return;
    }
    setMessage({ ok: true, text: `Invite sent to ${email}.` });
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Staff email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white w-64"
          placeholder="staff@psim.id"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="text-sm font-bold bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10] rounded-md px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send invite"}
      </button>
      {message && (
        <p className={`text-xs w-full ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

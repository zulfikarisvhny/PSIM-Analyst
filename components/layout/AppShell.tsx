// components/layout/AppShell.tsx
"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppShell({ logoUrl, children }: { logoUrl: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar logoUrl={logoUrl} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

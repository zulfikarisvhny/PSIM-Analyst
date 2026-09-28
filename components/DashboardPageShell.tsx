// components/DashboardPageShell.tsx
// Shared wrapper for secondary dashboard pages (import forms, player
// browser, admin, ...) — plain white background, with the standard
// "← Back to dashboard" + title + description header every one of these
// pages already had.
import Link from "next/link";
import shell from "./DashboardShell.module.css";

export function DashboardPageShell({
  title,
  description,
  maxWidthClassName = "max-w-2xl",
  children,
}: {
  title: string;
  description?: React.ReactNode;
  maxWidthClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={shell.page}>
      <div className={`relative z-[1] ${maxWidthClassName} mx-auto px-4 py-10`}>
        <Link href="/" className="text-xs font-semibold text-gray-500 hover:text-blue-600">
          ← Back to dashboard
        </Link>
        <h1 className="text-xl font-extrabold text-[#121b2d] mt-3 mb-1">{title}</h1>
        {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}
        {children}
      </div>
    </main>
  );
}

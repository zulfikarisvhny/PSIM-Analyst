// components/DashboardPageShell.tsx
// Shared wrapper for secondary dashboard pages (import forms, player
// browser, admin, ...) — plain white background, with the standard
// title + description header every one of these pages already had.
// Navigation back to other pages lives in the sidebar (components/layout/Sidebar.tsx).
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
        <h1 className="text-xl font-extrabold text-[#121b2d] mb-1">{title}</h1>
        {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}
        {children}
      </div>
    </main>
  );
}

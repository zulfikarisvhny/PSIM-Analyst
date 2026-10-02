// components/DashboardPageShell.tsx
// Shared wrapper for secondary dashboard pages (import forms, player
// browser, admin, ...) — plain white background, with the standard
// description text every one of these pages already had. The title itself
// is shown by the global TopBar (components/layout/TopBar.tsx), which keys
// off the route — keep its ROUTE_TITLES entry in sync with `title` here.
import shell from "./DashboardShell.module.css";

export function DashboardPageShell({
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
        {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}
        {children}
      </div>
    </main>
  );
}

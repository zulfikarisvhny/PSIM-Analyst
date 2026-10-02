// components/layout/Sidebar.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const COLLAPSE_KEY = "psim-sidebar-collapsed";

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.3a3.2 3.2 0 0 1 0 6.1" />
      <path d="M21 20c0-2.8-1.9-5.1-4.5-5.8" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4.5 6v6c0 4.5 3.1 7.7 7.5 9 4.4-1.3 7.5-4.5 7.5-9V6L12 3Z" />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: () => React.ReactNode;
  activePrefixes?: string[]; // extra paths that should also highlight this item
}

const MAIN_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: IconHome },
  { href: "/opponent-analysis", label: "Opponent Analyst", icon: IconSearch, activePrefixes: ["/scouting"] },
  { href: "/players", label: "Players", icon: IconUsers },
  { href: "/schedule", label: "Schedule", icon: IconCalendar },
];

const IMPORT_ITEMS: NavItem[] = [
  { href: "/match-reports/import", label: "Match Reports", icon: IconUpload },
  { href: "/physical-stats/import", label: "Physical Stats", icon: IconUpload },
  { href: "/team-style/import", label: "Team Style", icon: IconUpload },
  { href: "/players/import", label: "Player Stats", icon: IconUpload },
];

const TOOLS_ITEMS: NavItem[] = [
  { href: "/physical-stats/compare", label: "Compare GPS", icon: IconChart },
  { href: "/season-comparison", label: "Season Comparison", icon: IconChart },
  { href: "/admin", label: "Admin", icon: IconShield },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.activePrefixes ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${collapsed ? "justify-center" : ""} ${
        active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-[#121b2d]"
      }`}
    >
      <Icon />
      {!collapsed && item.label}
    </Link>
  );
}

export function Sidebar({ logoUrl }: { logoUrl: string | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read the saved preference after mount (not in the initial state) so the
  // server-rendered markup always matches the client's first render —
  // avoids a hydration mismatch for anyone who'd previously collapsed it.
  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore — private browsing / storage disabled, just stays expanded
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} ${mounted ? "transition-[width] duration-150" : ""} shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col`}>
      <div className={`flex items-center gap-2.5 px-5 py-6 ${collapsed ? "justify-center px-0" : ""}`}>
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-600 font-extrabold text-[10px]">PSIM</span>
            )}
          </div>
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            title="Collapse sidebar"
            className="ml-auto shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-[#121b2d] hover:bg-gray-50"
          >
            <IconChevronLeft />
          </button>
        )}
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          title="Expand sidebar"
          className="mx-auto mb-3 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-[#121b2d] hover:bg-gray-50 rotate-180"
        >
          <IconChevronLeft />
        </button>
      )}

      <nav className={`flex-1 overflow-y-auto pb-6 flex flex-col gap-6 ${collapsed ? "px-2" : "px-3"}`}>
        <div className="flex flex-col gap-0.5">
          {MAIN_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item)} collapsed={collapsed} />
          ))}
        </div>

        <div>
          {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Import Data</p>}
          <div className="flex flex-col gap-0.5">
            {IMPORT_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item)} collapsed={collapsed} />
            ))}
          </div>
        </div>

        <div>
          {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">Tools</p>}
          <div className="flex flex-col gap-0.5">
            {TOOLS_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item)} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      <div className={`px-5 py-4 border-t border-gray-100 flex items-center ${collapsed ? "flex-col gap-3 px-2" : "justify-between"}`}>
        <LogoutButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}

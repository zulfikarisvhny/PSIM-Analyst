// components/layout/TopBar.tsx
// Slim breadcrumb-style header above every page's content: a small eyebrow
// (section) line and the page title, so each route reads clearly without
// every page having to roll its own big <h1>.
"use client";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: Record<string, { eyebrow: string; title: string }> = {
  "/": { eyebrow: "PSIM Yogyakarta", title: "Dashboard" },
  "/opponent-analysis": { eyebrow: "Scouting", title: "Opponent Analysis" },
  "/players": { eyebrow: "Squad", title: "Players" },
  "/players/import": { eyebrow: "Import Data", title: "Player Stats" },
  "/schedule": { eyebrow: "PSIM Yogyakarta", title: "Schedule" },
  "/match-reports/import": { eyebrow: "Import Data", title: "Match Reports" },
  "/physical-stats/import": { eyebrow: "Import Data", title: "Physical Stats" },
  "/physical-stats/compare": { eyebrow: "Tools", title: "Compare GPS" },
  "/team-style/import": { eyebrow: "Import Data", title: "Team Style" },
  "/season-comparison": { eyebrow: "Tools", title: "Season Comparison" },
  "/admin": { eyebrow: "Tools", title: "Admin" },
};

function titleFor(pathname: string): { eyebrow: string; title: string } {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/scouting/")) {
    const team = decodeURIComponent(pathname.slice("/scouting/".length));
    return { eyebrow: "Scouting", title: team || "Team" };
  }
  return { eyebrow: "PSIM Intelligence Dashboard", title: "" };
}

export function TopBar() {
  const pathname = usePathname();
  const { eyebrow, title } = titleFor(pathname);
  if (!title) return null;

  return (
    <div className="sticky top-0 z-[5] bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5">
      <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{eyebrow}</p>
      <h1 className="text-lg font-extrabold text-[#121b2d] leading-tight">{title}</h1>
    </div>
  );
}

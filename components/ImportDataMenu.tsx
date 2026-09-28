// components/ImportDataMenu.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const IMPORT_LINKS = [
  { href: "/match-reports/import", label: "Match Reports" },
  { href: "/physical-stats/import", label: "Physical Stats" },
  { href: "/team-style/import", label: "Team Style" },
  { href: "/players/import", label: "Player Stats" },
];

export function ImportDataMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-gray-500 hover:text-[#121b2d] text-[12.5px] font-semibold"
      >
        Import Data
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-20">
          {IMPORT_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#121b2d]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

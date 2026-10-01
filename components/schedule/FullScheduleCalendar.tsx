// components/schedule/FullScheduleCalendar.tsx
"use client";
import { useState } from "react";
import type { ScheduleData } from "@/lib/scouting/schedule";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TIME_OF_DAY_LABEL: Record<string, string> = {
  morning: "morning",
  early_afternoon: "early afternoon",
  afternoon: "afternoon",
  evening: "evening",
};
const TIME_OF_DAY_ORDER = ["morning", "early_afternoon", "afternoon", "evening"];

const CATEGORY_PILL: Record<string, string> = {
  OFF: "border-red-400 bg-red-50 text-red-700",
  Train: "border-emerald-400 bg-emerald-50 text-emerald-700",
  Gym: "border-cyan-400 bg-cyan-50 text-cyan-700",
  Meeting: "border-amber-400 bg-amber-50 text-amber-700",
  FM: "border-lime-400 bg-lime-50 text-lime-700",
  Travel: "border-purple-400 bg-purple-50 text-purple-700",
  Match: "border-red-500 bg-red-100 text-red-800",
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLongDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function DayModal({
  dateKey,
  match,
  trainings,
  onClose,
}: {
  dateKey: string;
  match: ScheduleData["matches"][number] | undefined;
  trainings: ScheduleData["training"];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-[#121b2d]">{formatLongDate(dateKey)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-[#121b2d] text-xl leading-none px-1" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-5">
          {match ? (
            <div className="flex items-center gap-3">
              {match.opponentLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.opponentLogoUrl} alt="" className="w-10 h-10 object-contain rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                  {match.opponent.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-[#121b2d]">
                  {match.home ? "vs" : "@"} {match.opponent}
                </div>
                <div className="text-xs text-gray-500">{match.home ? "Home" : "Away"} match{match.round ? ` · ${match.round}` : ""}</div>
              </div>
            </div>
          ) : trainings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {[...trainings]
                .sort((a, b) => TIME_OF_DAY_ORDER.indexOf(a.timeOfDay ?? "") - TIME_OF_DAY_ORDER.indexOf(b.timeOfDay ?? ""))
                .map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-28 shrink-0 text-xs text-gray-400 pt-0.5 capitalize">{t.timeOfDay ? TIME_OF_DAY_LABEL[t.timeOfDay] : "—"}</span>
                    <div>
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_PILL[t.category ?? ""] ?? "border-gray-300 bg-gray-50 text-gray-700"}`}
                      >
                        {t.category ?? "Training"}
                      </span>
                      {t.notes && <span className="block text-xs text-gray-500 mt-1">{t.notes}</span>}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No activity recorded for this day.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function FullScheduleCalendar({ data }: { data: ScheduleData }) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const matchByDate = new Map(data.matches.map((m) => [m.date, m]));
  const trainingByDate = new Map<string, ScheduleData["training"]>();
  for (const t of data.training) {
    trainingByDate.set(t.date, [...(trainingByDate.get(t.date) ?? []), t]);
  }
  const offDates = new Set(data.training.filter((t) => t.category === "OFF").map((t) => t.date));

  const nextMatch = data.matches.find((m) => m.date >= todayKey) ?? null;
  const initialView = nextMatch ? new Date(`${nextMatch.date}T00:00:00`) : today;
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [openDate, setOpenDate] = useState<string | null>(null);

  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold text-[#121b2d]">
          {MONTH_LABELS[viewMonth]} {viewYear}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:text-[#121b2d] hover:border-gray-300">
            Today
          </button>
          <button onClick={goPrevMonth} className="text-gray-400 hover:text-[#121b2d] px-2 text-lg" aria-label="Previous month">
            ‹
          </button>
          <button onClick={goNextMonth} className="text-gray-400 hover:text-[#121b2d] px-2 text-lg" aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateKey = toDateKey(new Date(viewYear, viewMonth, day));
          const match = matchByDate.get(dateKey);
          const trainings = trainingByDate.get(dateKey) ?? [];
          const isOffDay = offDates.has(dateKey);
          const isToday = dateKey === todayKey;

          const col = i % 7;
          const prevDay = cells[i - 1];
          const nextDay = cells[i + 1];
          const prevOff = col > 0 && prevDay !== null && offDates.has(toDateKey(new Date(viewYear, viewMonth, prevDay)));
          const nextOff = col < 6 && nextDay !== null && offDates.has(toDateKey(new Date(viewYear, viewMonth, nextDay)));

          const pills: { label: string; className: string }[] = match
            ? [{ label: `${match.home ? "vs" : "@"} ${match.opponent}`, className: CATEGORY_PILL["Match"] }]
            : trainings.map((t) => ({ label: t.category ?? "Training", className: CATEGORY_PILL[t.category ?? ""] ?? "border-gray-300 bg-gray-50 text-gray-700" }));
          const shown = pills.slice(0, 2);
          const extra = pills.length - shown.length;

          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenDate(dateKey)}
              className={`relative min-h-[88px] sm:min-h-[104px] rounded-lg border p-1.5 text-left flex flex-col gap-1 hover:border-gray-300 transition-colors ${
                isOffDay ? `bg-red-50/60 ${prevOff ? "-ml-1.5 rounded-l-none border-l-0" : ""} ${nextOff ? "-mr-1.5 rounded-r-none border-r-0" : ""}` : "bg-white"
              } ${isToday ? "border-[#3E63B4] border-2" : "border-gray-100"}`}
            >
              <span className={`text-xs font-semibold ${isOffDay ? "text-red-600" : isToday ? "text-[#3E63B4]" : "text-gray-600"}`}>{day}</span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {shown.map((p, idx) => (
                  <span key={idx} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border-l-2 truncate ${p.className}`}>
                    {p.label}
                  </span>
                ))}
                {extra > 0 && <span className="text-[10px] text-gray-400 px-1.5">+{extra} more</span>}
              </div>
            </button>
          );
        })}
      </div>

      {openDate && <DayModal dateKey={openDate} match={matchByDate.get(openDate)} trainings={trainingByDate.get(openDate) ?? []} onClose={() => setOpenDate(null)} />}
    </div>
  );
}

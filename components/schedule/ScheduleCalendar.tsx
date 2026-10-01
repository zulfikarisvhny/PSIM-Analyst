// components/schedule/ScheduleCalendar.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
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

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TIME_OF_DAY_LABEL: Record<string, string> = {
  morning: "morning",
  early_afternoon: "early afternoon",
  afternoon: "afternoon",
  evening: "evening",
};
const TIME_OF_DAY_ORDER = ["morning", "early_afternoon", "afternoon", "evening"];

function formatLongDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** A day can have more than one session (e.g. Gym in the morning + Train in the afternoon) — joins them into one readable line. */
function summarizeTrainings(list: ScheduleData["training"]): string {
  return list
    .map((t) => {
      const label = t.category ?? "Training";
      const when = t.timeOfDay ? TIME_OF_DAY_LABEL[t.timeOfDay] : null;
      return when ? `${label} (${when})` : label;
    })
    .join(", ");
}

export function ScheduleCalendar({ data }: { data: ScheduleData }) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const matchByDate = new Map(data.matches.map((m) => [m.date, m]));
  const trainingByDate = new Map<string, ScheduleData["training"]>();
  for (const t of data.training) {
    trainingByDate.set(t.date, [...(trainingByDate.get(t.date) ?? []), t]);
  }
  const offDates = new Set(data.training.filter((t) => t.category === "OFF").map((t) => t.date));

  const nextMatch = data.matches.find((m) => m.date >= todayKey) ?? null;
  const todayMatch = matchByDate.get(todayKey) ?? null;
  const todayTrainings = trainingByDate.get(todayKey) ?? [];

  const initialView = nextMatch ? new Date(`${nextMatch.date}T00:00:00`) : today;
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const selectedMatch = selectedDate ? matchByDate.get(selectedDate) ?? null : null;
  const selectedTrainings = selectedDate ? trainingByDate.get(selectedDate) ?? [] : [];

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

  return (
    <div className="bg-white border border-gray-200 rounded-[20px] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[#121b2d]">Schedule</h3>
        <Link href="/schedule" className="text-xs font-semibold text-gray-400 hover:text-blue-600">
          Full calendar →
        </Link>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={goPrevMonth} className="text-gray-400 hover:text-[#121b2d] px-1" aria-label="Previous month">
          ‹
        </button>
        <span className="text-sm font-semibold text-[#121b2d]">
          {MONTH_LABELS[viewMonth]} {viewYear}
        </span>
        <button onClick={goNextMonth} className="text-gray-400 hover:text-[#121b2d] px-1" aria-label="Next month">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-gray-400 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 mb-2">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateKey = toDateKey(new Date(viewYear, viewMonth, day));
          const match = matchByDate.get(dateKey);
          const trainings = trainingByDate.get(dateKey) ?? [];
          const isOffDay = offDates.has(dateKey);
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;

          // Consecutive OFF days in the same week row render as one connected
          // bar (rounded only at the streak's two ends) instead of separate
          // pills, so a multi-day break reads as one block at a glance.
          const col = i % 7;
          const prevDay = cells[i - 1];
          const nextDay = cells[i + 1];
          const prevOff = col > 0 && prevDay !== null && offDates.has(toDateKey(new Date(viewYear, viewMonth, prevDay)));
          const nextOff = col < 6 && nextDay !== null && offDates.has(toDateKey(new Date(viewYear, viewMonth, nextDay)));

          return (
            <div key={i} className="aspect-square flex items-center justify-center p-px">
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => (prev === dateKey ? null : dateKey))}
                title={match ? `${match.home ? "vs (Home)" : "@ (Away)"} ${match.opponent}` : trainings.length > 0 ? summarizeTrainings(trainings) : undefined}
                className={`relative w-full h-full flex items-center justify-center text-[11px] cursor-pointer ${
                  isOffDay ? `${prevOff ? "-ml-0.5 rounded-l-none" : "rounded-l-full"} ${nextOff ? "-mr-0.5 rounded-r-none" : "rounded-r-full"}` : "rounded-full"
                } ${
                  isSelected ? "ring-2 ring-[#3E63B4] font-bold text-[#121b2d]" : isToday ? "ring-2 ring-[#121b2d] font-bold text-[#121b2d]" : "text-gray-600"
                } ${
                  match
                    ? match.home
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "bg-orange-50 ring-1 ring-orange-200"
                    : isOffDay
                      ? "bg-red-100"
                      : trainings.length > 0
                        ? "bg-emerald-50"
                        : ""
                }`}
              >
                {match ? (
                  <>
                    {match.opponentLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={match.opponentLogoUrl} alt="" className="w-6 h-6 object-contain rounded-full" />
                    ) : (
                      <span className={`text-[9px] font-bold ${match.home ? "text-blue-600" : "text-orange-600"}`}>
                        {match.opponent.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white border border-white ${
                        match.home ? "bg-blue-600" : "bg-orange-500"
                      }`}
                    >
                      {match.home ? "H" : "A"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={isOffDay ? "text-red-600 font-bold" : undefined}>{day}</span>
                    {trainings.length > 1 && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white border border-white ${
                          isOffDay ? "bg-red-500" : "bg-emerald-500"
                        }`}
                      >
                        {trainings.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs">
        <div>
          <div className="text-gray-500 font-semibold mb-1">Today&apos;s Plan</div>
          <div className="text-[#121b2d] font-medium">
            {todayMatch ? `${todayMatch.home ? "vs" : "@"} ${todayMatch.opponent}` : todayTrainings.length > 0 ? summarizeTrainings(todayTrainings) : "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-500 font-semibold mb-1">Next Match</div>
          <div className="text-[#121b2d] font-medium">
            {nextMatch ? `${nextMatch.home ? "vs" : "@"} ${nextMatch.opponent}` : "—"}
          </div>
        </div>
      </div>

      {/* Fixed height + internal scroll — always rendered (even empty) so the
          card's overall height never shifts as different days (with
          different activity counts) are selected. */}
      <div className="pt-2 mt-2 border-t border-gray-100 text-xs h-20 overflow-y-auto shrink-0">
        {selectedDate ? (
          <>
            <div className="flex items-center justify-between mb-2 sticky top-0 bg-white">
              <span className="font-semibold text-[#121b2d]">{formatLongDate(selectedDate)}</span>
              <button type="button" onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-[#121b2d]" aria-label="Close">
                ✕
              </button>
            </div>
            {selectedMatch ? (
              <div className="flex items-center gap-2 text-[#121b2d] font-medium">
                {selectedMatch.opponentLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedMatch.opponentLogoUrl} alt="" className="w-5 h-5 object-contain rounded-full" />
                )}
                <span>
                  {selectedMatch.home ? "vs" : "@"} {selectedMatch.opponent} ({selectedMatch.home ? "Home" : "Away"})
                </span>
              </div>
            ) : selectedTrainings.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {[...selectedTrainings]
                  .sort((a, b) => TIME_OF_DAY_ORDER.indexOf(a.timeOfDay ?? "") - TIME_OF_DAY_ORDER.indexOf(b.timeOfDay ?? ""))
                  .map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-gray-400 capitalize">{t.timeOfDay ? TIME_OF_DAY_LABEL[t.timeOfDay] : "—"}</span>
                      <span className={`font-medium ${t.category === "OFF" ? "text-red-600" : "text-[#121b2d]"}`}>
                        {t.category ?? "Training"}
                        {t.notes ? ` — ${t.notes}` : ""}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-400">No activity recorded for this day.</p>
            )}
          </>
        ) : (
          <p className="text-gray-400">Click a date to see that day&apos;s schedule.</p>
        )}
      </div>
    </div>
  );
}

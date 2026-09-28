// components/schedule/ScheduleCalendar.tsx
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

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleCalendar({ data }: { data: ScheduleData }) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const matchByDate = new Map(data.matches.map((m) => [m.date, m]));
  const trainingByDate = new Map(data.training.map((t) => [t.date, t]));

  const nextMatch = data.matches.find((m) => m.date >= todayKey) ?? null;
  const todayMatch = matchByDate.get(todayKey) ?? null;
  const todayTraining = trainingByDate.get(todayKey) ?? null;

  const initialView = nextMatch ? new Date(`${nextMatch.date}T00:00:00`) : today;
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

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
    <div className="bg-white border border-gray-200 rounded-[20px] p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#121b2d]">Schedule</h3>
      </div>

      <div className="flex items-center justify-between mb-3">
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

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateKey = toDateKey(new Date(viewYear, viewMonth, day));
          const match = matchByDate.get(dateKey);
          const training = trainingByDate.get(dateKey);
          const isToday = dateKey === todayKey;

          return (
            <div key={i} className="aspect-square flex items-center justify-center">
              <div
                title={match ? `vs ${match.opponent}` : training ? training.category ?? "Training" : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] ${
                  isToday ? "ring-2 ring-[#121b2d] font-bold text-[#121b2d]" : "text-gray-600"
                } ${match ? "bg-blue-50" : training ? "bg-emerald-50" : ""}`}
              >
                {match ? (
                  match.opponentLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={match.opponentLogoUrl} alt="" className="w-6 h-6 object-contain rounded-full" />
                  ) : (
                    <span className="text-[9px] font-bold text-blue-600">{match.opponent.slice(0, 2).toUpperCase()}</span>
                  )
                ) : (
                  day
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs mt-auto">
        <div>
          <div className="text-gray-500 font-semibold mb-1">Today&apos;s Plan</div>
          <div className="text-[#121b2d] font-medium">
            {todayMatch ? `${todayMatch.home ? "vs" : "@"} ${todayMatch.opponent}` : todayTraining ? todayTraining.category ?? "Training" : "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-500 font-semibold mb-1">Next Match</div>
          <div className="text-[#121b2d] font-medium">
            {nextMatch ? `${nextMatch.home ? "vs" : "@"} ${nextMatch.opponent}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

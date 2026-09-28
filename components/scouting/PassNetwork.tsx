// components/scouting/PassNetwork.tsx
"use client";
import { useMemo, useState } from "react";
import { PassNetworkMatch, combinedEdges } from "@/lib/scouting/passNetwork";

const PITCH_W = 760;
const PITCH_H = 480;
const PAD = 4;
const STROKE = "#1a1a1a30";
const MIN_NODE_R = 14;
const MAX_NODE_R = 30;
const MIN_EDGE_W = 1;
const MAX_EDGE_W = 12;
const EDGE_MIN_COUNT = 2; // hide near-zero connections to keep the chart legible

function PitchMarkings() {
  const cx = PITCH_W / 2;
  const cy = PITCH_H / 2;
  const boxW = 90;
  const boxH = 220;
  const sixW = 32;
  const sixH = 120;
  return (
    <>
      <rect x={PAD} y={PAD} width={PITCH_W - PAD * 2} height={PITCH_H - PAD * 2} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <line x1={cx} y1={PAD} x2={cx} y2={PITCH_H - PAD} stroke={STROKE} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={55} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <rect x={PAD} y={(PITCH_H - boxH) / 2} width={boxW} height={boxH} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <rect x={PAD} y={(PITCH_H - sixH) / 2} width={sixW} height={sixH} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <rect x={PITCH_W - PAD - boxW} y={(PITCH_H - boxH) / 2} width={boxW} height={boxH} fill="none" stroke={STROKE} strokeWidth={1.5} />
      <rect x={PITCH_W - PAD - sixW} y={(PITCH_H - sixH) / 2} width={sixW} height={sixH} fill="none" stroke={STROKE} strokeWidth={1.5} />
    </>
  );
}

type View = "network" | "matrix";

export function PassNetwork({ teamName, matches }: { teamName: string; matches: PassNetworkMatch[] }) {
  const [matchIdx, setMatchIdx] = useState(0);
  const [view, setView] = useState<View>("network");
  const match = matches[matchIdx];
  const edges = useMemo(() => combinedEdges(match), [match]);

  const posByNumber = useMemo(() => {
    const map = new Map<number, { x: number; y: number; name: string }>();
    for (const p of match.players) {
      map.set(p.number, { x: PAD + p.x * (PITCH_W - PAD * 2), y: PAD + p.y * (PITCH_H - PAD * 2), name: p.name });
    }
    return map;
  }, [match]);

  const degree = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of edges) {
      map.set(e.a, (map.get(e.a) ?? 0) + e.count);
      map.set(e.b, (map.get(e.b) ?? 0) + e.count);
    }
    return map;
  }, [edges]);

  const maxDegree = Math.max(...Array.from(degree.values()), 1);
  const maxCount = Math.max(...edges.map((e) => e.count), 1);

  const nodeRadius = (num: number) => {
    const t = (degree.get(num) ?? 0) / maxDegree;
    return MIN_NODE_R + t * (MAX_NODE_R - MIN_NODE_R);
  };

  const edgeWidth = (count: number) => MIN_EDGE_W + (count / maxCount) * (MAX_EDGE_W - MIN_EDGE_W);

  const topCombos = edges
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  function playerLabel(num: number) {
    const p = posByNumber.get(num);
    return p ? `${num} ${p.name}` : String(num);
  }

  const passMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of match.passes) map.set(`${p.from}-${p.to}`, p.count);
    return map;
  }, [match]);

  const rowTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of match.passes) map.set(p.from, (map.get(p.from) ?? 0) + p.count);
    return map;
  }, [match]);

  const colTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of match.passes) map.set(p.to, (map.get(p.to) ?? 0) + p.count);
    return map;
  }, [match]);

  const maxCell = Math.max(...match.passes.map((p) => p.count), 1);
  const grandTotal = match.passes.reduce((s, p) => s + p.count, 0);

  function cellBg(count: number) {
    if (!count) return "transparent";
    const t = count / maxCell;
    return `rgba(37, 99, 235, ${0.08 + t * 0.72})`;
  }

  function shortName(name: string) {
    return name.split(" ").slice(-1)[0];
  }

  return (
    <div className="bg-white dark:bg-[#191a1d] border border-gray-200 dark:border-transparent rounded-lg p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Passing Network</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-gray-200 dark:border-[#2a2b30] overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setView("network")}
              className={`px-3 py-1.5 ${
                view === "network"
                  ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]"
                  : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
              }`}
            >
              Network
            </button>
            <button
              onClick={() => setView("matrix")}
              className={`px-3 py-1.5 border-l border-gray-200 dark:border-[#2a2b30] ${
                view === "matrix"
                  ? "bg-blue-600 dark:bg-[#ffcf4d] text-white dark:text-[#0e0e10]"
                  : "bg-white dark:bg-[#191a1d] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#26272c]"
              }`}
            >
              Matrix
            </button>
          </div>
          {matches.length > 1 && (
            <select
              value={matchIdx}
              onChange={(e) => setMatchIdx(Number(e.target.value))}
              className="bg-gray-100 dark:bg-[#26272c] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2a2b30] rounded-md px-2.5 py-1.5 text-xs"
            >
              {matches.map((m, i) => (
                <option key={m.label} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {view === "network" ? (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {teamName} starting XI, {match.label}. Node size = total passes involved. Line thickness = passes
            exchanged between that pair, both directions combined. Connections under {EDGE_MIN_COUNT} passes are
            hidden to keep it readable.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
            <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} className="w-full rounded-lg border border-gray-200 dark:border-[#2a2b30]" style={{ background: "#ffffff" }}>
              <PitchMarkings />

              {edges
                .filter((e) => e.count >= EDGE_MIN_COUNT)
                .map((e, i) => {
                  const pa = posByNumber.get(e.a);
                  const pb = posByNumber.get(e.b);
                  if (!pa || !pb) return null;
                  return (
                    <line
                      key={i}
                      x1={pa.x}
                      y1={pa.y}
                      x2={pb.x}
                      y2={pb.y}
                      stroke="#2563eb"
                      strokeOpacity={0.45}
                      strokeWidth={edgeWidth(e.count)}
                      strokeLinecap="round"
                    />
                  );
                })}

              {match.players.map((p) => {
                const pos = posByNumber.get(p.number)!;
                const r = nodeRadius(p.number);
                return (
                  <g key={p.number}>
                    <circle cx={pos.x} cy={pos.y} r={r} fill="#ef4444" stroke="#0e0e10" strokeWidth={2} />
                    <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#ffffff">
                      {p.number}
                    </text>
                    <text x={pos.x} y={pos.y + r + 13} textAnchor="middle" fontSize={10} fontWeight={700} fill="#111827">
                      {shortName(p.name)}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">Top Combinations</h4>
              <div className="flex flex-col gap-1.5">
                {topCombos.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#0e0e10] border border-gray-200 dark:border-[#2a2b30] rounded-md px-2.5 py-2 text-xs"
                  >
                    <span className="text-gray-700 dark:text-gray-200 truncate">
                      {playerLabel(e.a)} <span className="text-gray-400">&harr;</span> {playerLabel(e.b)}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white shrink-0">{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {teamName} starting XI, {match.label}. Rows = passer, columns = receiver. Cell = passes from that row's
            player to that column's player — darker means more intense. {grandTotal} total passes among the XI.
          </p>

          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white dark:bg-[#191a1d] p-1.5 text-left text-gray-500 dark:text-gray-400 font-semibold">
                    Passer \ Receiver
                  </th>
                  {match.players.map((p) => (
                    <th key={p.number} className="p-1.5 text-center text-gray-700 dark:text-gray-200 font-semibold whitespace-nowrap">
                      <div>{p.number}</div>
                      <div className="font-normal text-gray-400 text-[10px]">{shortName(p.name)}</div>
                    </th>
                  ))}
                  <th className="p-1.5 text-center text-gray-900 dark:text-white font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {match.players.map((rowP) => (
                  <tr key={rowP.number}>
                    <td className="sticky left-0 bg-white dark:bg-[#191a1d] p-1.5 text-gray-700 dark:text-gray-200 font-semibold whitespace-nowrap border-t border-gray-100 dark:border-[#2a2b30]">
                      {rowP.number} {shortName(rowP.name)}
                    </td>
                    {match.players.map((colP) => {
                      const isSelf = rowP.number === colP.number;
                      const count = passMap.get(`${rowP.number}-${colP.number}`) ?? 0;
                      return (
                        <td
                          key={colP.number}
                          className="p-1.5 text-center border-t border-gray-100 dark:border-[#2a2b30] w-11"
                          style={{ background: isSelf ? "#00000010" : cellBg(count) }}
                        >
                          {isSelf ? (
                            <span className="text-gray-300 dark:text-gray-700">—</span>
                          ) : count ? (
                            <span className={count / maxCell > 0.55 ? "text-white font-bold" : "text-gray-900 dark:text-white font-semibold"}>
                              {count}
                            </span>
                          ) : (
                            <span className="text-gray-200 dark:text-gray-800">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1.5 text-center font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-[#2a2b30]">
                      {rowTotals.get(rowP.number) ?? 0}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 bg-white dark:bg-[#191a1d] p-1.5 font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-[#2a2b30]">
                    Total
                  </td>
                  {match.players.map((colP) => (
                    <td key={colP.number} className="p-1.5 text-center font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-[#2a2b30]">
                      {colTotals.get(colP.number) ?? 0}
                    </td>
                  ))}
                  <td className="p-1.5 text-center font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-[#2a2b30]">
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

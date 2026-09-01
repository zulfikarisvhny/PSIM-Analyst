// components/scouting/PlayerPizzaChart.tsx
"use client";
import { useState } from "react";
import { useTheme } from "next-themes";

export interface PizzaMetric {
  key: string;
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
  percentile: number;
}

export interface PizzaGroup {
  title: string;
  // Color encodes group identity, never magnitude (radius already carries
  // magnitude) — caller supplies it, pre-validated for CVD-safety against
  // whichever other groups render alongside it. See PlayerDetailModal's
  // ROLE_TEMPLATES for the palette assignment and why orange+yellow never
  // appear together.
  color: { light: string; dark: string };
  items: PizzaMetric[];
}

const SIZE = 432;
const CX = SIZE / 2;
const CY = SIZE / 2;
const HOLE_R = 31;
const MAX_R = 108;
const LABEL_R = MAX_R + 12;
const LABEL_FONT_SIZE = 7.8;
const LABEL_LINE_HEIGHT = 9;
const LABEL_LINE_MAX_CHARS = 11;

// Long labels wrap onto (at most) 2 lines instead of getting truncated —
// keeps the full name legible rather than an ellipsis.
function wrapLabel(label: string): string[] {
  if (label.length <= LABEL_LINE_MAX_CHARS) return [label];
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const attempt = current ? `${current} ${w}` : w;
    if (attempt.length > LABEL_LINE_MAX_CHARS && current) {
      lines.push(current);
      current = w;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines.length > 2 ? [lines[0], lines.slice(1).join(" ")] : lines;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polar(r: number, angleDeg: number): [number, number] {
  return [CX + r * Math.cos(toRad(angleDeg)), CY + r * Math.sin(toRad(angleDeg))];
}

function wedgePath(innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const [x1, y1] = polar(outerR, startAngle);
  const [x2, y2] = polar(outerR, endAngle);
  const [x3, y3] = polar(innerR, endAngle);
  const [x4, y4] = polar(innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  if (innerR <= 0.01) {
    return `M ${CX} ${CY} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

// Labels stay upright (never rotated) — anchor/baseline pick which side of
// the label point the text grows from, based on which zone of the circle
// it's in: right half grows rightward, left half leftward, and the near-
// vertical top/bottom slivers center and stack above/below the point.
function labelPlacement(angleDeg: number) {
  const rad = toRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const anchor: "start" | "middle" | "end" = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
  const baseline: "middle" | "auto" | "hanging" =
    Math.abs(cos) > 0.35 ? "middle" : sin < 0 ? "auto" : "hanging";
  return { anchor, baseline };
}

export function PlayerPizzaChart({ groups }: { groups: PizzaGroup[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const trackFill = isDark ? "#26272c" : "#e5e7eb";
  const ringStroke = isDark ? "#2c2c2a" : "#e1e0d9";
  const textMuted = isDark ? "#9a9a9f" : "#898781";
  const cardBg = isDark ? "#191a1d" : "#ffffff";
  const cardBorder = isDark ? "#2a2b30" : "#e5e7eb";

  const flat = groups.flatMap((g) => g.items.map((item) => ({ ...item, groupColor: g.color })));
  const n = flat.length;
  const [hovered, setHovered] = useState<number | null>(null);

  if (n === 0) return null;

  const anglePer = 360 / n;
  const pad = Math.min(1.5, anglePer * 0.15);
  const showLegend = groups.length > 1;

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <circle key={t} cx={CX} cy={CY} r={HOLE_R + t * (MAX_R - HOLE_R)} fill="none" stroke={ringStroke} strokeWidth={1} />
          ))}

          {flat.map((m, i) => {
            const start = -90 + i * anglePer + pad;
            const end = -90 + (i + 1) * anglePer - pad;
            const valueR = HOLE_R + (Math.max(0, Math.min(100, m.percentile)) / 100) * (MAX_R - HOLE_R);
            const color = isDark ? m.groupColor.dark : m.groupColor.light;
            const mid = (start + end) / 2;
            const { anchor, baseline } = labelPlacement(mid);
            const [lx, ly] = polar(LABEL_R, mid);
            const lines = wrapLabel(m.label);
            const startY =
              baseline === "auto"
                ? ly - (lines.length - 1) * LABEL_LINE_HEIGHT
                : baseline === "hanging"
                ? ly
                : ly - ((lines.length - 1) * LABEL_LINE_HEIGHT) / 2;

            return (
              <g
                key={m.key}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                style={{ cursor: "pointer" }}
              >
                <path d={wedgePath(HOLE_R, MAX_R, start, end)} fill={trackFill} />
                <path
                  d={wedgePath(HOLE_R, valueR, start, end)}
                  fill={color}
                  opacity={hovered === null || hovered === i ? 1 : 0.35}
                />
                <text
                  fontSize={LABEL_FONT_SIZE}
                  fontWeight={700}
                  fill={hovered === i ? color : textMuted}
                  textAnchor={anchor}
                  style={{ textTransform: "uppercase", letterSpacing: "0.02em" }}
                >
                  {lines.map((line, li) => (
                    <tspan key={li} x={lx} y={startY + li * LABEL_LINE_HEIGHT}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered !== null &&
          (() => {
            const m = flat[hovered];
            const start = -90 + hovered * anglePer + pad;
            const end = -90 + (hovered + 1) * anglePer - pad;
            const mid = (start + end) / 2;
            const [px, py] = polar((HOLE_R + MAX_R) / 2, mid);
            const leftPct = (px / SIZE) * 100;
            const topPct = (py / SIZE) * 100;
            return (
              <div
                className="absolute z-10 pointer-events-none rounded-md px-2.5 py-1.5 text-xs shadow-xl whitespace-nowrap"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: "translate(-50%, -50%)",
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                }}
              >
                <div className="font-bold text-gray-900 dark:text-white">{m.label}</div>
                <div className="text-gray-500 dark:text-gray-400">
                  {m.value.toFixed(m.decimals)}
                  {m.suffix ?? ""} · percentile {Math.round(m.percentile)}
                </div>
              </div>
            );
          })()}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3">
          {groups.map((g) => (
            <div key={g.title} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: isDark ? g.color.dark : g.color.light }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">{g.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

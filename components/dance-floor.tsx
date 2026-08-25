"use client";

import { motion } from "framer-motion";
import {
  PHASES,
  directionFor,
  rolesFor,
  stanceFor,
  type Lang,
  type Phase,
  translations,
} from "@/lib/translations";

type Props = {
  phase: Phase;
  phaseIndex: number;
  bar: number;
  beatMs: number;
  playing: boolean;
  lang: Lang;
  baby: boolean;
  role?: "leader" | "follower";
};

const CENTER = { x: 160, y: 126 };

// FIX: Neutralna pozycja stopy — fallback zamiast undefined/TypeError,
// gdy faza lub dana stopa nie istnieje.
const NEUTRAL_FOOT = { x: 0, y: 0, rotate: 0 };

function FootShape({ side }: { side: "left" | "right" }) {
  return (
    <g transform={side === "right" ? "scale(-1,1)" : undefined}>
      <path
        d="M-2 -27 C 9 -27 15 -17 15 -5 C 15 10 11 27 -1 27 C -12 27 -16 11 -16 -5 C -16 -17 -12 -27 -2 -27 Z"
        fill="currentColor"
        className="opacity-95"
      />
      <circle cx="-9" cy="-20" r="2.4" className="fill-background/50" />
      <circle cx="-2.5" cy="-22.5" r="2.6" className="fill-background/50" />
      <circle cx="4" cy="-21" r="2.4" className="fill-background/50" />
      <circle cx="9" cy="-17" r="2" className="fill-background/50" />
    </g>
  );
}

function GhostFoot({
  x,
  y,
  rotate,
  side,
  delay,
}: {
  x: number;
  y: number;
  rotate: number;
  side: "left" | "right";
  delay: number;
}) {
  return (
    <motion.g
      initial={{ x: CENTER.x + x, y: CENTER.y + y, rotate, opacity: 0 }}
      animate={{ x: CENTER.x + x, y: CENTER.y + y, rotate, opacity: 0.1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="text-muted-foreground"
    >
      <FootShape side={side} />
    </motion.g>
  );
}

export function DanceFloor({
  phase,
  phaseIndex,
  bar,
  beatMs,
  playing,
  lang,
  baby,
  role = "leader",
}: Props) {
  const t = translations[lang];

  // Pancerne sprawdzanie parametrów wejściowych
  const safePhaseIndex = Number.isFinite(phaseIndex) ? phaseIndex : 0;
  const safeBar = Number.isFinite(bar) ? bar : 1;

  const effectiveBar = role === "follower" ? safeBar + 1 : safeBar;
  const direction = directionFor(effectiveBar);
  const stance = stanceFor(safePhaseIndex, effectiveBar, baby);

  const { moving, weight } = rolesFor(phase || PHASES[0], effectiveBar);

  const stepDuration = (beatMs || 500) / 1000;

  const slideTransition = {
    duration: stepDuration * 0.8,
    ease: [0.45, 0, 0.55, 1] as const,
  };

  // FIX: Jedno bezpieczne źródło pozycji stopy — nigdy undefined.
  const footAt = (side: "left" | "right") => stance?.[side] ?? NEUTRAL_FOOT;

  const leftFoot = footAt("left");
  const rightFoot = footAt("right");

  const footAnimation = (side: "left" | "right") => {
    const self = footAt(side);
    const isMoving = moving === side;
    const isTapping = isMoving && phase?.tap === true;

    return {
      x: CENTER.x + self.x,
      y: isTapping ? [CENTER.y, CENTER.y - 8, CENTER.y] : CENTER.y + self.y,
      rotate: self.rotate,
      opacity: 1,
    };
  };

  // FIX (sedno błędu "Expected length, undefined"):
  // Nie animujemy atrybutów SVG cx/cy — framer-motion potrafi je ustawić
  // jako "undefined" przy pierwszym renderze (hydratacja w Next.js).
  // Elipsa ma teraz STATYCZNE, zawsze liczbowe cx/cy, a przesunięcie
  // realizujemy transformacją x/y, która nigdy nie trafia do geometrii SVG.
  const weightStance = footAt(weight as "left" | "right");
  const weightOffsetX = Number.isFinite(weightStance.x) ? weightStance.x : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-floor shadow-inner">
      <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-primary/10 via-transparent to-transparent opacity-60" />

      <svg
        viewBox="0 0 320 220"
        role="img"
        aria-label={t.FLOOR_TITLE as string}
        className="relative block w-full select-none"
      >
        <defs>
          <pattern
            id="parquet"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0H40V40H0Z" fill="none" />
            <path
              d="M0 0L40 40M40 0L0 40"
              className="stroke-floor-line"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect
          x="0"
          y="0"
          width="320"
          height="220"
          fill="url(#parquet)"
          className="opacity-40"
        />

        {/* FIX: Statyczne cx/cy + transformacja x/y zamiast animacji cx/cy */}
        <motion.ellipse
          cx={CENTER.x}
          cy={CENTER.y + 28}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={{
            x: weightOffsetX,
            y: 0,
            opacity: [0.15, 0.3, 0.15],
            scale: [1, 1.05, 1],
          }}
          transition={{
            x: slideTransition,
            opacity: { repeat: Infinity, duration: 2 },
            scale: { repeat: Infinity, duration: 2 },
          }}
          rx={24}
          ry={8}
          className="fill-primary"
        />

        {moving === "left" && (
          <>
            <GhostFoot
              x={leftFoot.x}
              y={leftFoot.y}
              rotate={leftFoot.rotate}
              side="left"
              delay={0.04}
            />
            <GhostFoot
              x={leftFoot.x}
              y={leftFoot.y}
              rotate={leftFoot.rotate}
              side="left"
              delay={0.08}
            />
          </>
        )}

        {moving === "right" && (
          <>
            <GhostFoot
              x={rightFoot.x}
              y={rightFoot.y}
              rotate={rightFoot.rotate}
              side="right"
              delay={0.04}
            />
            <GhostFoot
              x={rightFoot.x}
              y={rightFoot.y}
              rotate={rightFoot.rotate}
              side="right"
              delay={0.08}
            />
          </>
        )}

        <motion.g
          className="text-accent"
          initial={{ x: CENTER.x + leftFoot.x, y: CENTER.y }}
          animate={footAnimation("left")}
          transition={slideTransition}
        >
          <FootShape side="left" />
          <text
            y="4"
            textAnchor="middle"
            className="fill-background text-[10px] font-bold pointer-events-none italic"
          >
            L
          </text>
        </motion.g>

        <motion.g
          className="text-primary"
          initial={{ x: CENTER.x + rightFoot.x, y: CENTER.y }}
          animate={footAnimation("right")}
          transition={slideTransition}
        >
          <FootShape side="right" />
          <text
            y="4"
            textAnchor="middle"
            className="fill-background text-[10px] font-bold pointer-events-none italic"
          >
            R
          </text>
        </motion.g>

        {PHASES.map((p, i) => {
          const active = i === safePhaseIndex;
          return (
            <circle
              key={p.id}
              cx={118 + i * 28}
              cy={20}
              r={active ? 5 : 3.5}
              className={active ? "fill-primary" : "fill-floor-line"}
            />
          );
        })}
      </svg>

      <div className="relative flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {
            t.INSTRUCTIONS[direction.toUpperCase() as "LEFT" | "RIGHT"][
              (phase || PHASES[0]).id
            ]
          }
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
            <span className="size-2 rounded-full bg-accent shadow-sm" />{" "}
            {t.LEFT_FOOT as string}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase">
            <span className="size-2 rounded-full bg-primary shadow-sm" />{" "}
            {t.RIGHT_FOOT as string}
          </div>
        </div>
      </div>
    </div>
  );
}

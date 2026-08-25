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

  const effectiveBar = role === "follower" ? bar + 1 : bar;
  const direction = directionFor(effectiveBar);
  const stance = stanceFor(phaseIndex, effectiveBar, baby);
  const { moving, weight } = rolesFor(phase, effectiveBar);

  const stepDuration = beatMs / 1000;

  const slideTransition = {
    duration: stepDuration * 0.8,
    ease: [0.45, 0, 0.55, 1] as const,
  };

  const footAnimation = (side: "left" | "right") => {
    const self = stance[side];
    const isMoving = moving === side;
    const isTapping = isMoving && phase.tap === true;

    return {
      x: CENTER.x + (self?.x ?? 0),
      y: isTapping
        ? [CENTER.y, CENTER.y - 8, CENTER.y]
        : CENTER.y + (self?.y ?? 0),
      rotate: self?.rotate ?? 0,
      opacity: 1,
    };
  };

  // Zabezpieczenie przed wartościami undefined dla SVG
  const weightX = CENTER.x + (stance[weight]?.x ?? 0);
  const weightY = CENTER.y + 28;

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

        {/*
          FIX: Usunięto AnimatePresence i key, aby wyeliminować Forced Reflow.
          Dodano bezpieczne wartości domyślne cx/cy, aby uniknąć błędów w konsoli.
        */}
        <motion.ellipse
          animate={{
            cx: weightX,
            cy: weightY,
            opacity: [0.15, 0.3, 0.15],
            scale: [1, 1.05, 1],
          }}
          transition={{
            cx: slideTransition,
            cy: slideTransition,
            opacity: { repeat: Infinity, duration: 2 },
            scale: { repeat: Infinity, duration: 2 },
          }}
          rx="24"
          ry="8"
          className="fill-primary"
        />

        {moving === "left" && (
          <>
            <GhostFoot
              x={stance.left.x}
              y={stance.left.y}
              rotate={stance.left.rotate}
              side="left"
              delay={0.04}
            />
            <GhostFoot
              x={stance.left.x}
              y={stance.left.y}
              rotate={stance.left.rotate}
              side="left"
              delay={0.08}
            />
          </>
        )}

        {moving === "right" && (
          <>
            <GhostFoot
              x={stance.right.x}
              y={stance.right.y}
              rotate={stance.right.rotate}
              side="right"
              delay={0.04}
            />
            <GhostFoot
              x={stance.right.x}
              y={stance.right.y}
              rotate={stance.right.rotate}
              side="right"
              delay={0.08}
            />
          </>
        )}

        <motion.g
          className="text-accent"
          initial={{ x: CENTER.x + stance.left.x, y: CENTER.y }}
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
          initial={{ x: CENTER.x + stance.right.x, y: CENTER.y }}
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
          const active = i === phaseIndex;
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
              phase.id
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

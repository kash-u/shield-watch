import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface RiskMeterProps {
  score: number; // 0-100
  level: "Safe" | "Medium" | "High";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function RiskMeter({ score, level, size = "md", animated = true }: RiskMeterProps) {
  const dim = size === "lg" ? 180 : size === "sm" ? 96 : 140;
  const stroke = size === "lg" ? 14 : size === "sm" ? 8 : 11;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  const color =
    level === "High" ? "var(--color-danger)" :
    level === "Medium" ? "var(--color-medium)" :
    "var(--color-safe)";

  // Animated counter 0 → score
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!animated) { setDisplay(score); return; }
    const controls = animate(count, score, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [score, animated, count, rounded]);

  const isHigh = level === "High";

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{
        width: dim,
        height: dim,
        filter: isHigh
          ? `drop-shadow(0 0 18px color-mix(in oklab, ${color} 55%, transparent))`
          : `drop-shadow(0 0 12px color-mix(in oklab, ${color} 30%, transparent))`,
      }}
    >
      {isHigh && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, color-mix(in oklab, ${color} 22%, transparent), transparent 65%)` }}
          animate={{ opacity: [0.6, 1, 0.6], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <svg width={dim} height={dim} className="-rotate-90 relative">
        <defs>
          <linearGradient id={`rg-${score}-${level}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-neon-violet)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          stroke="color-mix(in oklab, white 8%, transparent)"
          strokeWidth={stroke} fill="none"
        />
        <motion.circle
          cx={dim / 2} cy={dim / 2} r={r}
          stroke={`url(#rg-${score}-${level})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-display font-semibold leading-none tabular-nums"
            style={{
              fontSize: size === "lg" ? "2.6rem" : size === "sm" ? "1.25rem" : "1.85rem",
              color,
            }}
          >
            {display}
          </motion.div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
            {level} risk
          </div>
        </div>
      </div>
    </div>
  );
}

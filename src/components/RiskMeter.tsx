import { motion } from "framer-motion";

interface RiskMeterProps {
  score: number; // 0-100
  level: "Safe" | "Medium" | "High";
  size?: "sm" | "md" | "lg";
}

export function RiskMeter({ score, level, size = "md" }: RiskMeterProps) {
  const dim = size === "lg" ? 180 : size === "sm" ? 96 : 140;
  const stroke = size === "lg" ? 14 : size === "sm" ? 8 : 11;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  const color =
    level === "High" ? "var(--color-danger)" :
    level === "Medium" ? "var(--color-medium)" :
    "var(--color-safe)";

  return (
    <div className="relative inline-grid place-items-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
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
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display font-semibold leading-none"
            style={{
              fontSize: size === "lg" ? "2.6rem" : size === "sm" ? "1.25rem" : "1.85rem",
              color,
            }}
          >
            {score}
          </motion.div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
            {level} risk
          </div>
        </div>
      </div>
    </div>
  );
}

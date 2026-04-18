import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { RiskLevel } from "@/lib/detection";

interface Props {
  level: RiskLevel;
  prediction: string;
  reasons: string[];
  breakdown?: {
    mlScore: number;       // 0-100
    keywordRisk: number;   // 0-100
    urlRisk: number;       // 0-100
  };
}

export function AlertCard({ level, prediction, reasons, breakdown }: Props) {
  const Icon = level === "High" ? AlertTriangle : level === "Medium" ? ShieldAlert : ShieldCheck;
  const color =
    level === "High" ? "text-danger ring-danger/30 bg-danger/10" :
    level === "Medium" ? "text-medium ring-medium/30 bg-medium/10" :
    "text-safe ring-safe/30 bg-safe/10";

  const isHigh = level === "High";
  const isSafe = level === "Safe";
  const confidence = isSafe
    ? Math.max(60, 100 - (breakdown ? Math.round((breakdown.mlScore + breakdown.keywordRisk + breakdown.urlRisk) / 3) : 15))
    : null;

  // Friendly explanation
  const headline = isHigh
    ? "Detected linguistic patterns commonly used in phishing attacks."
    : level === "Medium"
    ? "Some suspicious indicators were found — proceed with caution."
    : "No phishing patterns, suspicious keywords, or malicious URL structures detected.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={isHigh
        ? { opacity: 1, y: 0, x: [0, -2, 2, -1, 1, 0] }
        : { opacity: 1, y: 0 }}
      transition={isHigh
        ? { duration: 0.55, x: { duration: 0.5, delay: 0.1 } }
        : { duration: 0.4 }}
      className={`relative rounded-xl p-4 ring-1 ${color} overflow-hidden`}
    >
      {isHigh && (
        <motion.span
          aria-hidden
          className="absolute -inset-px rounded-xl pointer-events-none"
          style={{
            boxShadow: "0 0 0 1px color-mix(in oklab, var(--color-danger) 60%, transparent), 0 0 30px -4px color-mix(in oklab, var(--color-danger) 55%, transparent)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <div className="size-9 rounded-lg bg-background/40 grid place-items-center shrink-0">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-display font-semibold tracking-tight">{prediction}</h3>
            <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">{level} risk</span>
          </div>

          <p className="text-sm opacity-90 mt-1.5 leading-relaxed">{headline}</p>

          {confidence !== null && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs opacity-90">
              <CheckCircle2 className="size-3.5" />
              <span className="font-mono">Confidence: {confidence}% Safe classification</span>
            </div>
          )}

          {reasons.length > 0 && (
            <ul className="mt-3 space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="opacity-60 font-mono text-xs mt-0.5">→</span>
                  <span className="opacity-90">{r}</span>
                </li>
              ))}
            </ul>
          )}

          {breakdown && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <BreakdownPill label="ML Score" value={breakdown.mlScore} />
              <BreakdownPill label="Keyword Risk" value={breakdown.keywordRisk} />
              <BreakdownPill label="URL Risk" value={breakdown.urlRisk} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function BreakdownPill({ label, value }: { label: string; value: number }) {
  const tag =
    value >= 71 ? { txt: "High", cls: "text-danger bg-danger/15 ring-danger/30" } :
    value >= 31 ? { txt: "Medium", cls: "text-medium bg-medium/15 ring-medium/30" } :
    value > 0 ? { txt: "Low", cls: "text-safe bg-safe/15 ring-safe/30" } :
    { txt: "None", cls: "text-muted-foreground bg-secondary/40 ring-border" };

  return (
    <div className="rounded-lg bg-background/30 ring-1 ring-border/60 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md ring-1 ${tag.cls}`}>
          {tag.txt}
        </span>
        <span className="font-mono text-xs opacity-80 tabular-nums">{value}</span>
      </div>
    </div>
  );
}

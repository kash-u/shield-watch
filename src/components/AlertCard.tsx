import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { RiskLevel } from "@/lib/detection";

export function AlertCard({
  level,
  prediction,
  reasons,
}: {
  level: RiskLevel;
  prediction: string;
  reasons: string[];
}) {
  const Icon = level === "High" ? AlertTriangle : level === "Medium" ? ShieldAlert : ShieldCheck;
  const color =
    level === "High" ? "text-danger ring-danger/30 bg-danger/10" :
    level === "Medium" ? "text-medium ring-medium/30 bg-medium/10" :
    "text-safe ring-safe/30 bg-safe/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl p-4 ring-1 ${color}`}
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-lg bg-background/40 grid place-items-center shrink-0">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-display font-semibold tracking-tight">{prediction}</h3>
            <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">{level} risk</span>
          </div>
          <ul className="mt-2 space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="opacity-60 font-mono text-xs mt-0.5">→</span>
                <span className="opacity-90">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

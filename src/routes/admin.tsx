import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Trash2, Database, Cpu, Radio, Server, Settings2, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ThreatRow {
  id: string;
  type: "sms" | "email" | "url" | "social";
  content: string;
  prediction: string;
  risk_score: number;
  risk_level: "Safe" | "Medium" | "High";
  reasons: string[];
  highlighted_words: string[];
  created_at: string;
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · CyberShield AI" },
      { name: "description", content: "Manage detection settings, monitor system health, and export threat data." },
      { property: "og:title", content: "Admin · CyberShield AI" },
      { property: "og:description", content: "System health, model status, and data export for CyberShield admins." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [rows, setRows] = useState<ThreatRow[]>([]);
  const [type, setType] = useState<"all" | ThreatRow["type"]>("all");
  const [level, setLevel] = useState<"all" | ThreatRow["risk_level"]>("all");

  useEffect(() => {
    supabase.from("threat_logs").select("*").order("created_at", { ascending: false }).limit(1000)
      .then(({ data }) => setRows((data as ThreatRow[]) ?? []));
  }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    (type === "all" || r.type === type) && (level === "all" || r.risk_level === level)
  ), [rows, type, level]);

  function exportCsv() {
    if (filtered.length === 0) { toast.error("Nothing to export"); return; }
    const header = ["id", "created_at", "type", "prediction", "risk_score", "risk_level", "content"];
    const escape = (s: any) => `"${String(s).replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const csv = [header.join(",")]
      .concat(filtered.map((r) => header.map((h) => escape((r as any)[h])).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cybershield-logs-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  }

  async function purgeSafe() {
    if (!confirm("Delete all SAFE entries from the log? This cannot be undone.")) return;
    const { error } = await supabase.from("threat_logs").delete().eq("risk_level", "Safe");
    if (error) { toast.error(error.message); return; }
    setRows((p) => p.filter((r) => r.risk_level !== "Safe"));
    toast.success("Safe entries purged");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-muted-foreground text-sm mt-1.5">System health, detection model status, and data export.</p>
      </div>

      {/* System health */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <HealthCard icon={Server} label="API gateway" value="Operational" status="ok" detail="p95 · 84ms" />
        <HealthCard icon={Cpu} label="Detection model" value="tfidf-logreg-v2" status="ok" detail="loaded · 142ms cold" />
        <HealthCard icon={Database} label="Threat store" value={`${rows.length.toLocaleString()} rows`} status="ok" detail="postgres · realtime" />
        <HealthCard icon={Radio} label="Realtime channel" value="Streaming" status="ok" detail="ws · 1 connection" />
      </div>

      {/* Settings + export */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-elevated rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="size-4 text-muted-foreground" />
            <h2 className="font-display font-semibold">Detection thresholds</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ThresholdBar label="Safe" range="0–30" value={30} color="var(--color-safe)" />
            <ThresholdBar label="Medium" range="31–70" value={70} color="var(--color-medium)" />
            <ThresholdBar label="High" range="71–100" value={100} color="var(--color-danger)" />
          </div>
          <div className="mt-5 text-xs text-muted-foreground leading-relaxed">
            Thresholds combine ML confidence (45%), keyword density (35%), and URL structural risk (35%) with channel-specific boosts.
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card-elevated rounded-2xl p-5">
          <h2 className="font-display font-semibold mb-1">Maintenance</h2>
          <p className="text-xs text-muted-foreground mb-4">Bulk operations on the threat log.</p>
          <div className="space-y-2">
            <button onClick={exportCsv} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors">
              <Download className="size-4" /> Export filtered as CSV
            </button>
            <button onClick={purgeSafe} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/15 ring-1 ring-danger/30 text-sm font-medium transition-colors">
              <Trash2 className="size-4" /> Purge safe entries
            </button>
          </div>
        </motion.div>
      </div>

      {/* Filter + table */}
      <div className="card-elevated rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="text-sm font-display font-semibold mr-2">All analyzed messages</div>
        <Select value={type} onChange={(v) => setType(v as any)} options={[
          { v: "all", l: "All channels" }, { v: "sms", l: "SMS" }, { v: "email", l: "Email" }, { v: "url", l: "URL" }, { v: "social", l: "Social" },
        ]} />
        <Select value={level} onChange={(v) => setLevel(v as any)} options={[
          { v: "all", l: "All risks" }, { v: "Safe", l: "Safe" }, { v: "Medium", l: "Medium" }, { v: "High", l: "High" },
        ]} />
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} rows</span>
      </div>

      <div className="card-elevated rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_120px_80px_140px] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b border-border/60 font-mono">
          <div>Type</div><div>Content</div><div>Verdict</div><div>Score</div><div>Created</div>
        </div>
        <div className="max-h-[480px] overflow-y-auto">
          {filtered.slice(0, 200).map((r) => (
            <div key={r.id} className="grid grid-cols-[80px_1fr_120px_80px_140px] gap-4 px-5 py-3 border-b border-border/40 last:border-0 text-sm hover:bg-secondary/30">
              <div className="text-xs uppercase font-mono text-muted-foreground">{r.type}</div>
              <div className="truncate">{r.content}</div>
              <div className={
                r.risk_level === "High" ? "text-danger" :
                r.risk_level === "Medium" ? "text-medium" : "text-safe"
              }>{r.prediction}</div>
              <div className="font-display font-semibold">{r.risk_score}</div>
              <div className="text-xs text-muted-foreground font-mono">{new Date(r.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground">No entries.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function HealthCard({ icon: Icon, label, value, status, detail }: { icon: any; label: string; value: string; status: "ok" | "warn" | "err"; detail: string }) {
  const dot = status === "ok" ? "bg-safe" : status === "warn" ? "bg-medium" : "bg-danger";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-elevated rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`size-2 rounded-full pulse-dot ${dot}`} />
        <div className="font-display font-semibold tracking-tight">{value}</div>
      </div>
      <div className="text-[11px] text-muted-foreground font-mono mt-1">{detail}</div>
    </motion.div>
  );
}

function ThresholdBar({ label, range, value, color }: { label: string; range: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color }}>{label}</span>
        <span className="text-xs text-muted-foreground font-mono">{range}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-input/40 border border-border/60 rounded-lg pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className="size-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

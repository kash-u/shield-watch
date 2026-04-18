import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, MessagesSquare, Mail, Link as LinkIcon, Hash, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

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

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Threat Logs · CyberShield AI" },
      { name: "description", content: "Browse, filter, and inspect every analyzed message in your CyberShield workspace." },
      { property: "og:title", content: "Threat Logs · CyberShield AI" },
      { property: "og:description", content: "Realtime stream of analyzed threats with full explanations." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const [rows, setRows] = useState<ThreatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | ThreatRow["type"]>("all");
  const [level, setLevel] = useState<"all" | ThreatRow["risk_level"]>("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("threat_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (mounted) {
          setRows((data as ThreatRow[]) ?? []);
          setLoading(false);
        }
      });
    const ch = supabase
      .channel("logs-stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threat_logs" }, (p) => {
        setRows((prev) => [p.new as ThreatRow, ...prev]);
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (level !== "all" && r.risk_level !== level) return false;
      if (q && !r.content.toLowerCase().includes(q.toLowerCase()) && !r.prediction.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, q, type, level]);

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Threat logs</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {loading ? "Loading…" : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} entries`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card-elevated rounded-2xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search content or verdict…"
            className="w-full bg-input/40 border border-border/60 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
          />
        </div>
        <Select value={type} onChange={(v) => setType(v as any)} options={[
          { v: "all", l: "All channels" }, { v: "sms", l: "SMS" }, { v: "email", l: "Email" }, { v: "url", l: "URL" }, { v: "social", l: "Social" },
        ]} />
        <Select value={level} onChange={(v) => setLevel(v as any)} options={[
          { v: "all", l: "All risks" }, { v: "Safe", l: "Safe" }, { v: "Medium", l: "Medium" }, { v: "High", l: "High" },
        ]} />
      </div>

      {/* Table */}
      <div className="card-elevated rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[110px_1fr_140px_100px_120px] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground border-b border-border/60 font-mono">
          <div>Type</div><div>Content</div><div>Verdict</div><div>Score</div><div>Time</div>
        </div>
        <div>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-border/40 animate-pulse">
              <div className="h-3 w-2/3 bg-secondary/40 rounded mb-2" />
              <div className="h-2 w-1/3 bg-secondary/30 rounded" />
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground">No results match your filters.</div>
          )}
          {!loading && filtered.map((r) => (
            <LogRow key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function LogRow({ r, open, onToggle }: { r: ThreatRow; open: boolean; onToggle: () => void }) {
  const Icon = r.type === "sms" ? MessagesSquare : r.type === "email" ? Mail : r.type === "url" ? LinkIcon : Hash;
  const tone =
    r.risk_level === "High" ? "text-danger bg-danger/10 ring-danger/30" :
    r.risk_level === "Medium" ? "text-medium bg-medium/10 ring-medium/30" :
    "text-safe bg-safe/10 ring-safe/30";
  return (
    <div className="border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors">
      <button onClick={onToggle} className="w-full text-left grid grid-cols-1 md:grid-cols-[110px_1fr_140px_100px_120px] gap-2 md:gap-4 px-5 py-3.5 items-center">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
          <Icon className="size-4" /> {r.type}
        </div>
        <div className="text-sm truncate">{r.content}</div>
        <div>
          <span className={`text-[11px] px-2 py-1 rounded-md ring-1 inline-block ${tone}`}>
            {r.prediction}
          </span>
        </div>
        <div className="font-display font-semibold text-sm">{r.risk_score}<span className="text-muted-foreground text-xs">/100</span></div>
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">Full content</div>
            <div className="bg-input/40 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed">{r.content}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">Reasoning</div>
            <ul className="space-y-1.5">
              {(r.reasons || []).map((reason, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="opacity-60 font-mono text-xs mt-0.5">→</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {r.highlighted_words?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.highlighted_words.map((w, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-danger/10 text-danger ring-1 ring-danger/30 font-mono">
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-input/40 border border-border/60 rounded-lg pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className="size-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

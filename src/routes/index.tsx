import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, Activity, ShieldCheck, AlertTriangle, Zap, MessagesSquare, Mail, Link as LinkIcon, Hash } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ThreatRow {
  id: string;
  type: "sms" | "email" | "url" | "social";
  content: string;
  prediction: string;
  risk_score: number;
  risk_level: "Safe" | "Medium" | "High";
  created_at: string;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberShield AI — Multi-Channel Threat Detection" },
      { name: "description", content: "Real-time spam, phishing, and scam detection across SMS, email, URLs, and social channels with explainable AI." },
      { property: "og:title", content: "CyberShield AI — Threat Detection Dashboard" },
      { property: "og:description", content: "Real-time multi-channel threat detection with explainable AI risk scoring." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [rows, setRows] = useState<ThreatRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("threat_logs")
      .select("id,type,content,prediction,risk_score,risk_level,created_at")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) toast.error("Failed to load threats");
        setRows((data as ThreatRow[]) ?? []);
        setLoading(false);
      });

    const ch = supabase
      .channel("dashboard-threats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threat_logs" }, (p) => {
        const r = p.new as ThreatRow;
        setRows((prev) => [r, ...prev].slice(0, 200));
        if (r.risk_level === "High") {
          toast.error(`High-risk ${r.type.toUpperCase()} detected · score ${r.risk_score}`, {
            description: r.content.slice(0, 90) + (r.content.length > 90 ? "…" : ""),
          });
        }
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const high = rows.filter((r) => r.risk_level === "High").length;
    const medium = rows.filter((r) => r.risk_level === "Medium").length;
    const safe = rows.filter((r) => r.risk_level === "Safe").length;
    const avg = total ? Math.round(rows.reduce((s, r) => s + r.risk_score, 0) / total) : 0;
    return { total, high, medium, safe, avg };
  }, [rows]);

  const trend = useMemo(() => buildTrend(rows), [rows]);
  const channelBreakdown = useMemo(() => buildChannels(rows), [rows]);
  const distribution = useMemo(() => [
    { name: "Safe", value: stats.safe, color: "var(--color-safe)" },
    { name: "Medium", value: stats.medium, color: "var(--color-medium)" },
    { name: "High", value: stats.high, color: "var(--color-danger)" },
  ], [stats]);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
            <span className="size-1.5 rounded-full bg-safe pulse-dot" />
            <span>LIVE · streaming from edge sensors</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Threat overview
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
            Real-time multi-channel detection across SMS, email, URLs, and social text.
            Models are scoring messages as they arrive.
          </p>
        </div>
        <Link
          to="/analyze"
          className="self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:opacity-95 transition-opacity glow-ring"
        >
          <Zap className="size-4" /> Analyze a message
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Threats analyzed" value={stats.total} delta="+12.4%" icon={Activity} accent="primary" />
        <KpiCard label="High risk" value={stats.high} delta={stats.high ? "elevated" : "stable"} icon={AlertTriangle} accent="danger" />
        <KpiCard label="Avg. risk score" value={stats.avg} suffix="/100" delta="−3.1" icon={Zap} accent="accent" />
        <KpiCard label="Safe" value={stats.safe} delta="" icon={ShieldCheck} accent="safe" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="card-elevated rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold">Threat volume · last 24h</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Hourly aggregation across all channels</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Legend swatch="var(--color-primary)" label="Threats" />
              <Legend swatch="var(--color-safe)" label="Safe" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-threat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-safe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-safe)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-safe)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="color-mix(in oklab, white 6%, transparent)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: "color-mix(in oklab, white 12%, transparent)" }} />
                <Area type="monotone" dataKey="threats" stroke="var(--color-primary)" strokeWidth={2} fill="url(#g-threat)" />
                <Area type="monotone" dataKey="safe" stroke="var(--color-safe)" strokeWidth={2} fill="url(#g-safe)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card-elevated rounded-2xl p-5"
        >
          <h2 className="font-display font-semibold mb-1">Risk distribution</h2>
          <p className="text-xs text-muted-foreground mb-3">Across all analyzed inputs</p>
          <div className="h-48 -mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">
                  {distribution.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {distribution.map((d) => (
              <div key={d.name}>
                <div className="font-display text-lg font-semibold" style={{ color: d.color }}>{d.value}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{d.name}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Channels + live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-elevated rounded-2xl p-5">
          <h2 className="font-display font-semibold mb-1">By channel</h2>
          <p className="text-xs text-muted-foreground mb-4">Threat counts by input type</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelBreakdown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="color-mix(in oklab, white 6%, transparent)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "color-mix(in oklab, white 4%, transparent)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card-elevated rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-semibold">Live threat feed</h2>
              <p className="text-xs text-muted-foreground">Newest analyses, streaming via realtime</p>
            </div>
            <Link to="/logs" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View all <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {loading && <SkeletonRows />}
            {!loading && rows.length === 0 && (
              <div className="text-sm text-muted-foreground py-10 text-center">
                No analyses yet. <Link to="/analyze" className="text-primary hover:underline">Run your first scan</Link>.
              </div>
            )}
            {rows.slice(0, 8).map((r) => <FeedRow key={r.id} r={r} />)}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  label, value, delta, suffix, icon: Icon, accent,
}: {
  label: string; value: number | string; delta?: string; suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "primary" | "danger" | "accent" | "safe";
}) {
  const tone =
    accent === "danger" ? "text-danger bg-danger/10 ring-danger/20" :
    accent === "accent" ? "text-accent bg-accent/10 ring-accent/20" :
    accent === "safe" ? "text-safe bg-safe/10 ring-safe/20" :
    "text-primary bg-primary/10 ring-primary/20";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-2xl p-4.5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className={`size-9 rounded-lg grid place-items-center ring-1 ${tone}`}>
          <Icon className="size-4.5" />
        </div>
        {delta && (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">{delta}</span>
        )}
      </div>
      <div className="mt-3">
        <div className="font-display text-2xl md:text-[28px] font-semibold tracking-tight">
          {value}{suffix && <span className="text-muted-foreground text-base font-normal">{suffix}</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </motion.div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  );
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ background: p.color || p.fill }} />
          <span className="font-mono">{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
}

function FeedRow({ r }: { r: ThreatRow }) {
  const Icon = r.type === "sms" ? MessagesSquare : r.type === "email" ? Mail : r.type === "url" ? LinkIcon : Hash;
  const tone =
    r.risk_level === "High" ? "text-danger" :
    r.risk_level === "Medium" ? "text-medium" : "text-safe";
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/40 transition-colors"
    >
      <div className="size-8 rounded-lg bg-secondary/60 grid place-items-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{r.content}</div>
        <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.14em] mt-0.5">
          {r.type} · {r.prediction} · {timeAgo(r.created_at)}
        </div>
      </div>
      <div className={`text-sm font-display font-semibold ${tone}`}>{r.risk_score}</div>
    </motion.div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="size-8 rounded-lg bg-secondary/40 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 bg-secondary/40 rounded animate-pulse" />
            <div className="h-2 w-1/3 bg-secondary/30 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );
}

function buildTrend(rows: ThreatRow[]) {
  const buckets: Record<number, { threats: number; safe: number }> = {};
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const h = new Date(now - i * 2 * 3600 * 1000);
    buckets[h.getHours()] = { threats: 0, safe: 0 };
  }
  rows.forEach((r) => {
    const h = new Date(r.created_at).getHours();
    if (!buckets[h]) buckets[h] = { threats: 0, safe: 0 };
    if (r.risk_level === "Safe") buckets[h].safe += 1;
    else buckets[h].threats += 1;
  });
  return Object.entries(buckets).map(([h, v]) => ({
    label: `${h.padStart(2, "0")}:00`, threats: v.threats, safe: v.safe,
  }));
}

function buildChannels(rows: ThreatRow[]) {
  const counts: Record<string, number> = { SMS: 0, Email: 0, URL: 0, Social: 0 };
  rows.forEach((r) => {
    const k = r.type === "sms" ? "SMS" : r.type === "email" ? "Email" : r.type === "url" ? "URL" : "Social";
    counts[k] += 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

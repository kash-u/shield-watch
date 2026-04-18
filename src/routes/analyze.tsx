import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessagesSquare, Mail, Link as LinkIcon, Hash, Sparkles, Loader2, Wand2, Cpu, ShieldAlert, Database, Mic } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RiskMeter } from "@/components/RiskMeter";
import { HighlightedText } from "@/components/HighlightedText";
import { AlertCard } from "@/components/AlertCard";
import { analyze, type AnalysisResult, type ChannelType } from "@/lib/detection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze · CyberShield AI" },
      { name: "description", content: "Paste any SMS, email, URL, or social message — get instant risk scoring and explainable threat analysis." },
      { property: "og:title", content: "Analyze a message · CyberShield AI" },
      { property: "og:description", content: "Multi-channel phishing and scam detection with explainable AI." },
    ],
  }),
  component: AnalyzePage,
});

const TYPES: { id: ChannelType; label: string; icon: any; placeholder: string }[] = [
  { id: "sms", label: "SMS", icon: MessagesSquare, placeholder: "URGENT: Your bank account has been suspended. Verify now: http://secure-bank.verify-login.tk/auth" },
  { id: "email", label: "Email", icon: Mail, placeholder: "Dear customer,\n\nWe detected unusual sign-in activity. Please confirm your password within 24 hours or your account will be permanently closed.\n\nClick here: http://account-verify.support-team.xyz" },
  { id: "url", label: "URL", icon: LinkIcon, placeholder: "http://paypa1-secure.login-verify.click/auth?session=xx" },
  { id: "social", label: "Social", icon: Hash, placeholder: "🔥 You won a $1,000 Amazon gift card! Claim now → bit.ly/free-prize-2024" },
];

const SAMPLES: Record<ChannelType, string[]> = {
  sms: [
    "URGENT: Your bank account is suspended. Verify immediately: http://secure-bank.verify-login.tk/auth",
    "Hey, lunch tomorrow at 1? Same place as last time.",
    "Your OTP is 482910. Do NOT share. — HDFC Bank",
  ],
  email: [
    "Dear valued customer, your PayPal account will be suspended unless you verify your password within 24 hours. Click here: http://paypa1-verify.security-update.xyz",
    "Hi team, attached the Q3 report. Let me know if you have questions before our Monday meeting. Regards, Anna",
  ],
  url: [
    "http://paypa1-secure.login-verify.click/auth?session=xx",
    "https://github.com/lovable-dev/awesome",
    "http://192.168.4.21/admin/login",
  ],
  social: [
    "🔥 You won a $1,000 Amazon gift card! Claim now → bit.ly/free-prize-2024",
    "Loved the new track — listening on repeat 🎧",
  ],
};

const PIPELINE_STEPS = [
  "Tokenizing input",
  "Scoring lexicon features",
  "Running URL heuristics",
  "ML inference (NLP classifier)",
  "Combining hybrid ensemble",
];

function AnalyzePage() {
  const [type, setType] = useState<ChannelType>("sms");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const placeholder = TYPES.find((t) => t.id === type)!.placeholder;

  async function runAnalysis(rawContent?: string, rawType?: ChannelType) {
    const c = (rawContent ?? content).trim();
    const t = rawType ?? type;
    if (!c) {
      toast.error("Please enter content to analyze");
      return;
    }
    setLoading(true);
    setResult(null);
    // Simulated detection latency for realism
    await new Promise((r) => setTimeout(r, 950));
    const r = analyze(c, t);
    setResult(r);
    setLoading(false);

    // Persist to Lovable Cloud (drives dashboard, logs, realtime)
    const { error } = await supabase.from("threat_logs").insert({
      type: t,
      content: c.slice(0, 5000),
      prediction: r.prediction,
      risk_score: r.risk_score,
      risk_level: r.risk_level,
      reasons: r.reasons,
      highlighted_words: r.highlighted_words,
    });
    if (error) {
      toast.error("Couldn't sync result", { description: error.message });
    } else {
      if (r.risk_level === "High") {
        toast.error("🚨 High-Risk Phishing Detected!", {
          description: `${r.prediction} · score ${r.risk_score}/100`,
          duration: 6000,
        });
      } else if (r.risk_level === "Medium") {
        toast.warning(`Medium risk · ${r.prediction}`);
      } else {
        toast.success("Looks safe", { description: "Saved to Threat Logs" });
        return;
      }
      toast("Saved to Threat Logs", {
        icon: <Database className="size-4 text-primary" />,
        duration: 2400,
      });
    }
  }

  function loadSample(s: string) {
    setContent(s);
    setResult(null);
  }

  function quickCheckUrl() {
    const sample = "http://paypa1-secure.login-verify.click/auth?session=xx";
    setType("url");
    setContent(sample);
    void runAnalysis(sample, "url");
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
              <Sparkles className="size-3.5 text-primary" />
              <span>EXPLAINABLE AI · Hybrid detection ensemble</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Analyze a message
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
              Paste content from any channel. The engine highlights risky tokens and explains every decision.
            </p>
          </div>
          <button
            onClick={quickCheckUrl}
            className="self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary/60 hover:bg-secondary ring-1 ring-border text-sm font-medium transition-colors"
          >
            <ShieldAlert className="size-4 text-accent" />
            URL quick check
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Input panel */}
          <div className="lg:col-span-3 card-elevated rounded-2xl p-5 hover:ring-1 hover:ring-primary/20 transition-shadow">
            <div className="flex flex-wrap gap-2 mb-4">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setType(t.id); setResult(null); }}
                    className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-secondary text-foreground ring-1 ring-primary/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Icon className="size-4" />
                    {t.label}
                    {active && (
                      <motion.span
                        layoutId="type-pill"
                        className="absolute inset-0 rounded-lg ring-1 ring-primary/60"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                rows={8}
                disabled={loading}
                className="w-full resize-none bg-input/40 border border-border/60 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all disabled:opacity-60"
              />
              <div className="absolute right-3 bottom-3 text-[10px] text-muted-foreground font-mono">
                {content.length} chars
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Try a sample:</span>
              {SAMPLES[type].map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(s)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Sample {i + 1}
                </button>
              ))}
              <button
                disabled
                title="Voice input · coming soon"
                className="ml-auto text-xs px-2.5 py-1 rounded-md bg-secondary/40 text-muted-foreground inline-flex items-center gap-1.5 cursor-not-allowed opacity-60"
              >
                <Mic className="size-3" /> Voice
              </button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                Engine: <span className="font-mono text-foreground/80">Hybrid AI Engine (NLP + URL Intelligence + Heuristic Analysis)</span>
              </div>
              <button
                onClick={() => runAnalysis()}
                disabled={loading}
                className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity glow-ring overflow-hidden"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing with Hybrid AI Engine…
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    Analyze threat
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result panel */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="card-elevated rounded-2xl p-6 h-full grid place-items-center text-center min-h-[380px]"
                >
                  <div>
                    <div className="size-14 rounded-2xl bg-secondary/60 grid place-items-center mx-auto mb-3">
                      <Sparkles className="size-6 text-muted-foreground" />
                    </div>
                    <div className="font-display font-semibold">Awaiting input</div>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Results, risk score, and explanations will appear here.
                    </p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="card-elevated rounded-2xl p-6 h-full min-h-[380px] relative overflow-hidden scan-line"
                >
                  <div className="flex items-center gap-2 text-xs text-primary font-mono mb-4">
                    <motion.span
                      className="size-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    ANALYZING WITH HYBRID AI ENGINE…
                  </div>
                  <div className="space-y-3">
                    {PIPELINE_STEPS.map((s, i) => (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.14 }}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                        <span className="text-muted-foreground">{s}…</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`card-elevated rounded-2xl p-5 space-y-4 transition-shadow ${
                    result.risk_level === "High"
                      ? "ring-1 ring-danger/40 shadow-[0_0_60px_-15px_color-mix(in_oklab,var(--color-danger)_55%,transparent)]"
                      : result.risk_level === "Safe"
                      ? "ring-1 ring-safe/30"
                      : "ring-1 ring-medium/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Verdict</div>
                      <div className="font-display text-2xl font-semibold tracking-tight mt-1">
                        {result.prediction}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        channel: {type.toUpperCase()}
                      </div>
                    </div>
                    <RiskMeter score={result.risk_score} level={result.risk_level} size="md" />
                  </div>

                  <AlertCard
                    level={result.risk_level}
                    prediction={result.prediction}
                    reasons={result.reasons}
                    breakdown={result.breakdown}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Highlighted text panel */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card-elevated rounded-2xl p-5 mt-5 hover:ring-1 hover:ring-primary/20 transition-shadow"
          >
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h2 className="font-display font-semibold">Explainable highlights</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Hover any tag to see why the engine flagged it</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {result.highlighted_words.length} suspicious token{result.highlighted_words.length === 1 ? "" : "s"}
              </span>
            </div>
            <HighlightedText text={content} highlights={result.highlighted_words} />
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

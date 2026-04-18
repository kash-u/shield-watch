import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessagesSquare, Mail, Link as LinkIcon, Hash, Sparkles, Loader2, Wand2 } from "lucide-react";
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

function AnalyzePage() {
  const [type, setType] = useState<ChannelType>("sms");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const placeholder = TYPES.find((t) => t.id === type)!.placeholder;

  async function runAnalysis() {
    if (!content.trim()) {
      toast.error("Please enter content to analyze");
      return;
    }
    setLoading(true);
    setResult(null);
    // Simulated detection latency for realism
    await new Promise((r) => setTimeout(r, 650));
    const r = analyze(content, type);
    setResult(r);
    setLoading(false);

    // Persist to Lovable Cloud (drives dashboard, logs, realtime)
    const { error } = await supabase.from("threat_logs").insert({
      type,
      content: content.slice(0, 5000),
      prediction: r.prediction,
      risk_score: r.risk_score,
      risk_level: r.risk_level,
      reasons: r.reasons,
      highlighted_words: r.highlighted_words,
    });
    if (error) {
      toast.error("Couldn't sync result", { description: error.message });
    } else {
      if (r.risk_level === "High") toast.error(`High risk · ${r.prediction}`);
      else if (r.risk_level === "Medium") toast.warning(`Medium risk · ${r.prediction}`);
      else toast.success("Looks safe");
    }
  }

  function loadSample(s: string) {
    setContent(s);
    setResult(null);
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-7">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
            <Sparkles className="size-3.5 text-primary" />
            <span>EXPLAINABLE AI · TF-IDF + heuristic ensemble</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Analyze a message
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
            Paste content from any channel. The engine highlights risky tokens and explains every decision.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Input panel */}
          <div className="lg:col-span-3 card-elevated rounded-2xl p-5">
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
                className="w-full resize-none bg-input/40 border border-border/60 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
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
                  className="text-xs px-2.5 py-1 rounded-md bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sample {i + 1}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Engine: <span className="font-mono text-foreground/80">tfidf-logreg-v2 + url-heuristics</span>
              </div>
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm hover:opacity-95 disabled:opacity-50 transition-opacity glow-ring"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                {loading ? "Analyzing…" : "Analyze threat"}
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
                  <div className="text-xs text-muted-foreground font-mono mb-4">RUNNING DETECTION PIPELINE</div>
                  <div className="space-y-3">
                    {["Tokenizing input", "Scoring lexicon features", "Running URL heuristics", "ML inference", "Combining ensemble"].map((s, i) => (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.12 }}
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
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="card-elevated rounded-2xl p-5 space-y-4"
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

                  <AlertCard level={result.risk_level} prediction={result.prediction} reasons={result.reasons} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Highlighted text panel */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="card-elevated rounded-2xl p-5 mt-5"
          >
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display font-semibold">Explainable highlights</h2>
              <span className="text-xs text-muted-foreground">
                {result.highlighted_words.length} suspicious token(s)
              </span>
            </div>
            <HighlightedText text={content} highlights={result.highlighted_words} />
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

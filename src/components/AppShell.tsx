import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, LayoutDashboard, Search, ScrollText, Settings2, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "Analyze", icon: Search },
  { to: "/logs", label: "Threat Logs", icon: ScrollText },
  { to: "/admin", label: "Admin", icon: Settings2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [liveCount, setLiveCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("threat_logs")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (mounted && typeof count === "number") setLiveCount(count);
      });
    const ch = supabase
      .channel("nav-threats")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threat_logs" }, () => {
        setLiveCount((c) => c + 1);
      })
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col glass border-r border-border/60 sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-border/60">
          <div className="relative">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center glow-ring">
              <Shield className="size-4.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-safe pulse-dot ring-2 ring-background" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold tracking-tight">CyberShield</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">AI · v1.4</div>
          </div>
        </div>

        <nav className="px-3 py-4 flex flex-col gap-1">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Navigation</div>
          {NAV.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-secondary/80 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-3">
          <div className="card-elevated rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs">
              <Radio className="size-3.5 text-safe" />
              <span className="text-muted-foreground">Live monitoring</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-semibold">{liveCount.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">threats logged</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-secondary/60 overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-primary to-accent" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 px-5 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 glass border-b border-border/60">
      <div className="h-14 px-5 md:px-8 flex items-center gap-4">
        <div className="md:hidden flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center">
            <Shield className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold">CyberShield</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-safe pulse-dot" />
          <span>System operational</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono">us-east-1 · edge</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/60 text-xs text-muted-foreground font-mono">
            <span className="opacity-60">⌘</span> K
          </div>
          <div className="flex items-center gap-2.5 pl-3 border-l border-border/60">
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-xs font-medium">Maya Lindholm</div>
              <div className="text-[10px] text-muted-foreground">Security Analyst</div>
            </div>
            <div className="size-8 rounded-full bg-gradient-to-br from-accent to-primary grid place-items-center text-xs font-semibold text-primary-foreground">
              ML
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

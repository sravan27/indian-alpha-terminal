"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Cpu,
  Flame,
  HelpCircle,
  Layers,
  ScrollText,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { buildWorkspacePlan, type WorkspacePlan } from "@/lib/theses-engine";
import { CAPITAL_COLOR } from "@/lib/intelligence-engine";
import type { BrainData } from "@/lib/brain-types";

export interface WorkspaceSeed {
  category: string;
  hypothesis: string;
  playbook?: Parameters<typeof buildWorkspacePlan>[1]["playbook"];
  capital?: Parameters<typeof buildWorkspacePlan>[1]["capital"];
  timeline?: Parameters<typeof buildWorkspacePlan>[1]["timeline"];
  reg?: Parameters<typeof buildWorkspacePlan>[1]["reg"];
}

export function WorkspaceOverlay({
  open,
  brain,
  seed,
  onClose,
}: {
  open: boolean;
  brain: BrainData;
  seed: WorkspaceSeed | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const plan: WorkspacePlan | null = seed ? buildWorkspacePlan(brain, seed) : null;

  return (
    <AnimatePresence>
      {open && plan && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#04040a]/85 backdrop-blur-md z-[150]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-6 top-[5vh] bottom-[5vh] mx-auto max-w-[1200px] bg-[#0b0b10]/97 border border-white/[0.08] rounded-2xl shadow-[0_60px_120px_-30px_rgba(0,0,0,0.85)] z-[151] overflow-hidden flex flex-col backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="shrink-0 px-8 py-5 border-b border-white/[0.06] flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">
                    Founder OS · Workspace Compiled
                  </span>
                </div>
                <h2 className="text-[24px] font-semibold text-white tracking-[-0.01em] leading-tight max-w-[78ch]">
                  {plan.thesisHeadline}
                </h2>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-[family-name:var(--font-signal-mono)] text-stone-400">
                  <span className={`font-bold ${CAPITAL_COLOR[plan.capitalTier]}`}>
                    {plan.capitalTier}
                  </span>
                  <span className="text-stone-700">·</span>
                  <span>{plan.capitalRange}</span>
                  <span className="text-stone-700">·</span>
                  <span>Time-to-signal · {plan.timeline}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-white/[0.06] text-stone-500 hover:text-white transition-colors"
                aria-label="Close workspace"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-12 gap-6 p-8">
                {/* 90-day sprint */}
                <Card icon={CalendarDays} title="90-day Sprint" tone="indigo" className="col-span-12 md:col-span-7">
                  <div className="relative pl-7 before:absolute before:inset-y-1.5 before:left-[10px] before:w-px before:bg-indigo-500/20">
                    {plan.ninetyDay.map((p, i) => (
                      <div key={i} className="relative mb-5 last:mb-0">
                        <span className="absolute -left-7 top-1 w-[20px] h-[20px] rounded-full bg-[#0c0c11] border-[2px] border-indigo-500/40 flex items-center justify-center text-[9px] font-semibold text-indigo-200">
                          {i + 1}
                        </span>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300 mb-1">
                          {p.phase}
                        </div>
                        <div className="text-[14px] font-semibold text-white mb-1 tracking-tight">
                          {p.milestone}
                        </div>
                        <div className="text-[12px] text-stone-400 font-[family-name:var(--font-signal-mono)] leading-relaxed">
                          ↳ {p.metric}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Decisive question */}
                <Card icon={HelpCircle} title="The decisive question" tone="amber" className="col-span-12 md:col-span-5 flex flex-col justify-between">
                  <p className="text-[15px] text-amber-100/90 leading-relaxed font-[family-name:var(--font-signal-mono)]">
                    {plan.decisiveQuestion}
                  </p>
                  <div className="mt-4 text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/70">
                    Answer this before raising — not after.
                  </div>
                </Card>

                {/* Burn ladder */}
                <Card icon={Wallet} title="Capital burn ladder" tone="violet" className="col-span-12 md:col-span-7">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-[0.16em] font-bold text-stone-500">
                        <th className="pb-2">Window</th>
                        <th className="pb-2">Spend Range</th>
                        <th className="pb-2">Required Signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {plan.burnLadder.map((b, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 font-semibold text-white tabular-nums w-[10ch]">
                            {b.month}
                          </td>
                          <td className="py-2 pr-3 text-violet-200 tabular-nums whitespace-nowrap">
                            {b.spendRange}
                          </td>
                          <td className="py-2 text-stone-300 leading-relaxed">{b.signal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                {/* Key hires */}
                <Card icon={UserPlus} title="Cohort 1 · Key hires" tone="cyan" className="col-span-12 md:col-span-5">
                  <div className="space-y-3">
                    {plan.keyHires.map((h, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-200 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <div className="text-[12.5px] font-semibold text-white tracking-tight">
                            {h.role}
                          </div>
                          <div className="text-[11px] text-stone-400 leading-relaxed font-[family-name:var(--font-signal-mono)] mt-0.5">
                            {h.rationale}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Regulatory checklist */}
                <Card
                  icon={ShieldAlert}
                  title="Regulatory · Must clear"
                  tone="rose"
                  className="col-span-12 md:col-span-7"
                >
                  <div className="space-y-2">
                    {plan.regulatoryChecklist.map((c, i) => {
                      const sevColor =
                        c.severity === "MUST"
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : c.severity === "SHOULD"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-stone-500/15 text-stone-300 border-stone-500/30";
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span className="flex-1 text-[12px] text-stone-200 leading-tight">
                            {c.item}
                          </span>
                          <span className="text-[9px] font-mono text-stone-500">{c.authority}</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded border ${sevColor}`}
                          >
                            {c.severity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Founder stack */}
                <Card icon={Cpu} title="Founder stack · Ready to deploy" tone="emerald" className="col-span-12 md:col-span-5">
                  <div className="space-y-2">
                    {plan.stack.length === 0 && (
                      <div className="text-[11px] text-stone-500 italic">
                        No vendor-side stack pre-mapped for this category. Open the playbook for
                        manual selection.
                      </div>
                    )}
                    {plan.stack.map((s, i) => {
                      const Inner = (
                        <>
                          <div className="text-[12px] font-semibold text-white">{s.name}</div>
                          <div className="text-[10.5px] text-stone-400 leading-snug mt-0.5">
                            {s.description}
                          </div>
                        </>
                      );
                      return s.url ? (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 hover:bg-emerald-500/[0.10] hover:border-emerald-500/40 transition-colors"
                        >
                          {Inner}
                        </a>
                      ) : (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15"
                        >
                          {Inner}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Footer */}
              <div className="px-8 pb-8">
                <div className="border-t border-white/[0.06] pt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-stone-500 font-bold">
                  <div className="flex items-center gap-2">
                    <Flame className="w-3 h-3 text-rose-400" />
                    Generated locally · zero network · {brain.sourceCatalog.length} episode corpus
                  </div>
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-3 h-3" />
                    Founder OS v1 · {plan.capitalTier}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Card({
  icon: Icon,
  title,
  tone,
  className = "",
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  tone: "indigo" | "violet" | "cyan" | "amber" | "rose" | "emerald";
  className?: string;
  children: React.ReactNode;
}) {
  const text: Record<string, string> = {
    indigo: "text-indigo-300",
    violet: "text-violet-300",
    cyan: "text-cyan-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    emerald: "text-emerald-300",
  };
  const ring: Record<string, string> = {
    indigo: "ring-indigo-500/20",
    violet: "ring-violet-500/20",
    cyan: "ring-cyan-500/20",
    amber: "ring-amber-500/20",
    rose: "ring-rose-500/20",
    emerald: "ring-emerald-500/20",
  };
  return (
    <div className={`bg-white/[0.02] ring-1 ${ring[tone]} rounded-2xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-3.5 h-3.5 ${text[tone]}`} />
        <Layers className="hidden" />
        <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${text[tone]}`}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

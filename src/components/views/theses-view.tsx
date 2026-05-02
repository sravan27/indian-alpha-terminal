"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  ChevronRight,
  Compass,
  Flame,
  Layers,
  Quote,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  buildTheses,
  type InvestmentThesis,
} from "@/lib/theses-engine";
import {
  SEVERITY_COLOR,
  operatorIQ,
} from "@/lib/intelligence-engine";
import type { BrainData, Episode, MasterPlaybook } from "@/lib/brain-types";

export function ThesesView({
  data,
  onOpenEpisode,
  onOpenPlaybook,
  onOpenWorkspace,
}: {
  data: BrainData;
  onOpenEpisode: (ep: Episode) => void;
  onOpenPlaybook: (pb: MasterPlaybook) => void;
  onOpenWorkspace: (t: InvestmentThesis) => void;
}) {
  const theses = useMemo(() => buildTheses(data, 12), [data]);
  const [activeId, setActiveId] = useState<string>(theses[0]?.id ?? "");

  const active = theses.find((t) => t.id === activeId) ?? theses[0];

  return (
    <div className="h-full w-full flex bg-[#06060a]">
      {/* Left rail — thesis index */}
      <aside className="w-[360px] shrink-0 border-r border-white/[0.04] overflow-y-auto custom-scrollbar bg-[#08080c]/40">
        <div className="px-5 pt-6 pb-4 sticky top-0 bg-[#08080c]/95 backdrop-blur-md border-b border-white/[0.04] z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">
              Investment Theses
            </span>
          </div>
          <div className="text-[20px] font-semibold text-white tracking-tight">
            {theses.length} live signals
          </div>
          <div className="text-[11px] text-stone-500 leading-relaxed mt-1">
            Cross-episode synthesis ranked by composite investability. Each thesis is grounded in
            ≥2 operator data points.
          </div>
        </div>
        <div className="py-2">
          {theses.map((t) => {
            const c = SEVERITY_COLOR[t.severity];
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left px-5 py-3 border-l-2 transition-colors ${
                  isActive
                    ? "border-indigo-400 bg-indigo-500/[0.05]"
                    : "border-transparent hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-mono text-stone-500 tabular-nums w-5 shrink-0">
                    #{String(t.rank).padStart(2, "0")}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-[0.16em] ${c.bg} ${c.text}`}
                  >
                    {t.severity}
                  </span>
                  <span className="ml-auto text-[10px] font-bold tabular-nums text-stone-300">
                    {t.investability}
                  </span>
                </div>
                <p className="text-[12px] text-white/90 leading-snug line-clamp-2 font-[family-name:var(--font-signal-display)]">
                  {t.headline}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[9px] text-stone-500 uppercase tracking-[0.12em] font-bold">
                  <span>{t.category}</span>
                  <span className="text-stone-700">·</span>
                  <span className="text-violet-300/80">{t.capital}</span>
                  <span className="text-stone-700">·</span>
                  <span className="text-emerald-300/80">{t.tam}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail pane */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {active && <ThesisDetail thesis={active} onOpenEpisode={onOpenEpisode} onOpenPlaybook={onOpenPlaybook} onOpenWorkspace={onOpenWorkspace} />}
      </div>
    </div>
  );
}

function ThesisDetail({
  thesis,
  onOpenEpisode,
  onOpenPlaybook,
  onOpenWorkspace,
}: {
  thesis: InvestmentThesis;
  onOpenEpisode: (ep: Episode) => void;
  onOpenPlaybook: (pb: MasterPlaybook) => void;
  onOpenWorkspace: (t: InvestmentThesis) => void;
}) {
  const c = SEVERITY_COLOR[thesis.severity];

  return (
    <motion.div
      key={thesis.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="max-w-[1100px] mx-auto px-10 pt-10 pb-16"
    >
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span className="text-stone-500">Thesis #{String(thesis.rank).padStart(2, "0")}</span>
          <span className="text-stone-700">·</span>
          <span className="text-stone-400">{thesis.category}</span>
          <span className="text-stone-700">·</span>
          <span className={`${c.text}`}>{thesis.severity}</span>
        </div>
        <h1 className="text-[36px] font-semibold text-white tracking-[-0.02em] leading-[1.1] mb-4">
          {thesis.headline}
        </h1>
        <p className="text-[15px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)] max-w-3xl">
          {thesis.hypothesis}
        </p>

        {/* Metric strip */}
        <div className="mt-7 grid grid-cols-5 gap-2.5 max-w-3xl">
          <Metric label="Investability" value={`${thesis.investability}`} sublabel="composite" tone="indigo" big />
          <Metric label="TAM" value={thesis.tam} sublabel="addressable" tone="emerald" />
          <Metric label="Capital" value={thesis.capital} sublabel={thesis.capitalRange} tone="violet" />
          <Metric label="Timeline" value={thesis.timeline} sublabel="to first signal" tone="cyan" />
          <Metric label="Reg" value={thesis.reg} sublabel="regulatory load" tone="rose" />
        </div>

        {/* Action buttons */}
        <div className="mt-7 flex items-center gap-2">
          <button
            onClick={() => onOpenWorkspace(thesis)}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-white text-black font-semibold text-[12px] hover:bg-stone-200 transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Initialize Workspace
          </button>
          {thesis.playbook && (
            <button
              onClick={() => onOpenPlaybook(thesis.playbook!)}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] font-medium text-[11px] transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-300" />
              {thesis.playbook.verified ? "Verified Playbook" : "Playbook"} · {thesis.playbook.title}
            </button>
          )}
        </div>
      </div>

      {/* Evidence */}
      <Section icon={Quote} title="Evidence · Operator-Verified" tone="emerald">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {thesis.evidence.map((ev, i) => (
            <button
              key={i}
              onClick={() => {
                const ep = thesis.supportingEpisodes.find((e) => e.id === ev.episodeId);
                if (ep) {
                  // open via the supporting episode - parent owns the brain
                  onOpenEpisode({ id: ev.episodeId, title: ev.episodeTitle } as unknown as Episode);
                }
              }}
              className="text-left bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] rounded-xl p-4 transition-colors group"
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300 mb-2">
                Insight 0{i + 1}
              </div>
              <p className="text-[12.5px] text-stone-200 leading-relaxed font-[family-name:var(--font-signal-mono)] mb-3">
                {ev.text}
              </p>
              <div className="text-[10px] text-stone-500 line-clamp-1 group-hover:text-stone-300 transition-colors">
                ↳ {ev.episodeTitle}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Operators */}
      <Section icon={Users} title={`Operators backing this thesis · ${thesis.operators.length}`} tone="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {thesis.operators.map((op) => {
            const iq = operatorIQ(op);
            return (
              <div
                key={op.id}
                className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold ${
                    op.isCrossShow
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                      : iq >= 60
                      ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-200"
                      : "bg-white/[0.04] border border-white/[0.08] text-stone-300"
                  }`}
                >
                  {op.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-white truncate">
                    {op.name}
                    {op.isCrossShow && (
                      <span className="ml-2 text-[9px] uppercase tracking-[0.14em] font-bold text-amber-300">
                        ★ Cross-Show
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {op.episodeCount} verified episode{op.episodeCount === 1 ? "" : "s"} ·{" "}
                    {op.categories.slice(0, 2).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-semibold text-white tabular-nums">{iq}</div>
                  <div className="text-[8px] uppercase tracking-[0.16em] text-stone-500 font-bold">
                    Op IQ
                  </div>
                </div>
              </div>
            );
          })}
          {thesis.operators.length === 0 && (
            <div className="col-span-full text-[11px] text-stone-500 italic">
              Single-source thesis — needs cross-validation before capital deployment.
            </div>
          )}
        </div>
      </Section>

      {/* Counter argument */}
      <Section icon={ShieldAlert} title="First-Principles Counter" tone="rose">
        <div className="bg-rose-500/[0.04] border border-rose-500/15 rounded-xl px-5 py-4">
          <p className="text-[13px] text-rose-100/90 leading-relaxed font-[family-name:var(--font-signal-mono)]">
            {thesis.counter}
          </p>
        </div>
      </Section>

      {/* Decisive question already shown in workspace; not repeated here */}

      {/* Supporting episodes */}
      <Section icon={Flame} title="Source episodes" tone="indigo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {thesis.supportingEpisodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => onOpenEpisode({ id: ep.id, title: ep.title } as unknown as Episode)}
              className="text-left flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] rounded-lg px-3 py-2.5 transition-colors group"
            >
              <ChevronRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-indigo-300 transition-colors" />
              <span className="text-[11.5px] text-stone-300 line-clamp-1 group-hover:text-white transition-colors">
                {ep.title}
              </span>
            </button>
          ))}
        </div>
      </Section>
    </motion.div>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Quote;
  title: string;
  tone: "emerald" | "amber" | "rose" | "indigo";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    indigo: "text-indigo-300",
  };
  return (
    <section className="mt-9">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-3.5 h-3.5 ${map[tone]}`} />
        <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${map[tone]}`}>
          {title}
        </span>
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  sublabel,
  tone,
  big,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: "indigo" | "emerald" | "violet" | "cyan" | "rose";
  big?: boolean;
}) {
  const text: Record<string, string> = {
    indigo: "text-indigo-200",
    emerald: "text-emerald-200",
    violet: "text-violet-200",
    cyan: "text-cyan-200",
    rose: "text-rose-200",
  };
  const ring: Record<string, string> = {
    indigo: "ring-indigo-500/20 bg-indigo-500/[0.05]",
    emerald: "ring-emerald-500/20 bg-emerald-500/[0.04]",
    violet: "ring-violet-500/20 bg-violet-500/[0.04]",
    cyan: "ring-cyan-500/20 bg-cyan-500/[0.04]",
    rose: "ring-rose-500/20 bg-rose-500/[0.04]",
  };
  return (
    <div className={`rounded-xl ring-1 px-3 py-2.5 ${ring[tone]}`}>
      <div className={`text-[8px] font-bold uppercase tracking-[0.18em] ${text[tone]} mb-1`}>
        {label}
      </div>
      <div className={`${big ? "text-[24px]" : "text-[16px]"} font-semibold text-white tabular-nums leading-none mb-1`}>
        {value}
      </div>
      <div className="text-[9px] text-stone-500 uppercase tracking-[0.14em] font-medium">
        {sublabel}
      </div>
    </div>
  );
}

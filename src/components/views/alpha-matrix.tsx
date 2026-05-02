"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Pin,
  PinOff,
  ArrowDownUp,
  Filter,
  Activity,
} from "lucide-react";
import {
  buildAlphaSignals,
  operatorIQ,
  SEVERITY_COLOR,
  SEVERITY_RANK,
  type AlphaSignal,
  type Severity,
} from "@/lib/intelligence-engine";
import type { BrainData, Episode, MasterPlaybook } from "@/lib/brain-types";

type SortKey = "investability" | "severity" | "tam" | "capital";

const TAM_RANK: Record<string, number> = {
  "₹10K Cr+": 5,
  "₹1K Cr": 4,
  "₹100 Cr": 3,
  "₹10 Cr": 2,
  "₹<10 Cr": 1,
};

const CAPITAL_RANK: Record<string, number> = {
  "PE": 6,
  "GROWTH": 5,
  "SERIES B+": 4,
  "SERIES A": 3,
  "SEED": 2,
  "PRE-SEED": 1,
};

export function AlphaMatrix({
  data,
  activeHost,
  activeCategory,
  searchTerm,
  creatorMap,
  onOpenEpisode,
  onOpenPlaybook,
}: {
  data: BrainData;
  activeHost: string;
  activeCategory: string;
  searchTerm: string;
  creatorMap: Record<string, string>;
  onOpenEpisode: (ep: Episode) => void;
  onOpenPlaybook: (pb: MasterPlaybook) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("investability");
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [hoverRow, setHoverRow] = useState<AlphaSignal | null>(null);

  const allSignals = useMemo(() => {
    return buildAlphaSignals(data, {
      creatorId:
        activeHost === "All"
          ? undefined
          : data.creators.find((c) => c.handle === activeHost)?.id,
      category: activeCategory === "All" ? undefined : activeCategory,
      query: searchTerm,
    });
  }, [data, activeHost, activeCategory, searchTerm]);

  const sorted = useMemo(() => {
    const arr = [...allSignals];
    arr.sort((a, b) => {
      if (sortKey === "investability") return b.investability - a.investability;
      if (sortKey === "severity") return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (sortKey === "tam") return TAM_RANK[b.profile.tam] - TAM_RANK[a.profile.tam];
      if (sortKey === "capital") return CAPITAL_RANK[b.profile.capital] - CAPITAL_RANK[a.profile.capital];
      return 0;
    });
    // Pinned rows float to top
    return arr.sort((a, b) => Number(pins.has(b.id)) - Number(pins.has(a.id)));
  }, [allSignals, sortKey, pins]);

  const stats = useMemo(() => {
    const sevCount: Record<Severity, number> = {
      CRITICAL: 0,
      URGENT: 0,
      FORMING: 0,
      EMERGENT: 0,
      MONITOR: 0,
    };
    sorted.forEach((s) => sevCount[s.severity]++);
    return sevCount;
  }, [sorted]);

  const togglePin = (id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-[#06060a]">
      {/* Live ticker */}
      <AlphaTicker signals={sorted.slice(0, 10)} />

      {/* Hero metrics row */}
      <div className="px-10 pt-5 pb-4 border-b border-white/[0.04] bg-gradient-to-b from-[#08080d] to-transparent">
        <div className="flex items-center justify-between gap-8 max-w-[1800px] mx-auto w-full">
          <h2 className="text-[28px] font-semibold text-white tracking-[-0.02em] leading-none flex items-center gap-3">
            Alpha Matrix
            <span className="bg-indigo-500/15 text-indigo-200 text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md border border-indigo-500/25">
              Sovereign · Live
            </span>
          </h2>
          <div className="flex items-center gap-3 shrink-0">
            {(Object.keys(stats) as Severity[]).map((sev) => {
              const c = SEVERITY_COLOR[sev];
              return (
                <div key={sev} className="text-center">
                  <div
                    className={`w-[52px] h-[52px] rounded-lg ${c.bg} ring-1 ${c.ring} flex items-center justify-center text-[20px] font-semibold ${c.text} tabular-nums`}
                  >
                    {stats[sev]}
                  </div>
                  <div className={`mt-1.5 text-[7px] font-bold uppercase tracking-[0.2em] ${c.text}`}>
                    {sev}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sort + filter bar */}
      <div className="px-10 py-2.5 border-b border-white/[0.04] bg-[#08080c]/50 flex items-center gap-2 max-w-[1800px] mx-auto w-full">
        <ArrowDownUp className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-stone-500">Sort</span>
        {(["investability", "severity", "tam", "capital"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`text-[10px] uppercase tracking-[0.14em] font-bold px-2.5 py-1 rounded-md transition-colors ${
              sortKey === key
                ? "bg-white/[0.08] text-white border border-white/[0.1]"
                : "text-stone-500 hover:text-stone-200"
            }`}
          >
            {key === "investability" ? "Investability" : key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <Filter className="w-3.5 h-3.5 text-stone-500" />
        <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500 font-bold">
          {sorted.length} Active Signals · {pins.size} Pinned
        </span>
      </div>

      {/* The matrix */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <div className="max-w-[1800px] mx-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-[#0a0a0e]/95 backdrop-blur-md z-10 font-[family-name:var(--font-signal-mono)]">
              <tr className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-500">
                <th className="px-4 py-3 border-b border-white/[0.06] w-10">#</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-[18ch]">Severity</th>
                <th className="px-4 py-3 border-b border-white/[0.06]">Exploitable Gap · Operator Source</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-[14ch]">TAM</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-[14ch]">Capital</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-[10ch]">Timeline</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-[14ch]">Reg Load</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-[12ch] text-right">Score</th>
                <th className="px-4 py-3 border-b border-white/[0.06] w-10 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sorted.map((row, i) => {
                const colors = SEVERITY_COLOR[row.severity];
                const pinned = pins.has(row.id);
                return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoverRow(row)}
                    onMouseLeave={() => setHoverRow((r) => (r?.id === row.id ? null : r))}
                    className={`group cursor-pointer transition-colors ${
                      pinned ? "bg-amber-500/[0.02]" : "hover:bg-white/[0.025]"
                    }`}
                    onClick={() => {
                      if (row.playbook) onOpenPlaybook(row.playbook);
                      else onOpenEpisode(row.episode);
                    }}
                  >
                    <td className="px-4 py-3.5 align-top text-[10px] font-mono text-stone-500 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-[0.16em] ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}
                      >
                        <span className={`w-1 h-1 rounded-full bg-current ${row.severity === "CRITICAL" ? "signal-pulse" : ""}`} />
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <p className="text-[13px] text-white/90 leading-snug font-[family-name:var(--font-signal-mono)] mb-1.5">
                        {row.gap}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-stone-500">
                        <span className="truncate max-w-[55ch]" title={row.episode.title}>{row.episode.title}</span>
                        <span className="text-stone-700">·</span>
                        <span className="text-stone-400">{creatorMap[row.episode.creatorId]}</span>
                        {row.operators.length > 0 && (
                          <>
                            <span className="text-stone-700">·</span>
                            <span className="flex items-center gap-1">
                              {row.operators.slice(0, 3).map((op, oi) => {
                                const iq = operatorIQ(op);
                                return (
                                  <span
                                    key={op.id}
                                    title={`${op.name} · IQ ${iq}`}
                                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold border ${
                                      op.isCrossShow
                                        ? "bg-amber-500/15 border-amber-500/30 text-amber-200"
                                        : iq >= 60
                                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-200"
                                        : "bg-white/[0.04] border-white/[0.08] text-stone-300"
                                    }`}
                                    style={{ marginLeft: oi === 0 ? 0 : -8 }}
                                  >
                                    {initials(op.name)}
                                  </span>
                                );
                              })}
                              {row.operators.length > 3 && (
                                <span className="text-[9px] text-stone-500 ml-0.5">
                                  +{row.operators.length - 3}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top text-[11px] font-semibold text-emerald-200 tabular-nums">
                      {row.profile.tam}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-[11px] font-semibold text-violet-200 tabular-nums">
                        {row.profile.capital}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-[11px] font-semibold text-cyan-200 tabular-nums">
                      {row.profile.timeline}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <RegBadge load={row.profile.reg} />
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      <ScoreBar score={row.investability} />
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(row.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          pinned
                            ? "text-amber-300 hover:bg-amber-500/10"
                            : "text-stone-700 hover:text-stone-300"
                        }`}
                        title={pinned ? "Unpin" : "Pin to top"}
                      >
                        {pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-10 py-20 text-center text-[12px] text-stone-500">
                    No alpha signals match this filter. Try clearing the search or selecting another sector.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom hover preview */}
      <AnimatePresence>
        {hoverRow && (
          <motion.div
            key={hoverRow.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-4 right-6 w-[420px] bg-[#0c0c10]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] p-4 z-30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-300">
                First-Principles Counter
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-stone-300 font-[family-name:var(--font-signal-mono)]">
              {hoverRow.counter}
            </p>
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-stone-500">
              <span>
                {hoverRow.operators.length} operator{hoverRow.operators.length === 1 ? "" : "s"} ·{" "}
                {hoverRow.episode.strategySnippets.length} strategies indexed
              </span>
              <span className="flex items-center gap-1 text-indigo-300">
                Open thesis <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Small UI primitives
// ---------------------------------------------------------------------------

function ScoreBar({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "from-rose-400 to-amber-300"
      : score >= 65
      ? "from-amber-300 to-indigo-300"
      : score >= 50
      ? "from-indigo-300 to-cyan-300"
      : "from-cyan-300 to-stone-400";
  return (
    <div className="inline-flex items-center gap-2 justify-end">
      <div className="w-[68px] h-[4px] rounded-full bg-white/[0.05] overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${tone}`}
          style={{ width: `${Math.max(6, Math.min(100, score))}%` }}
        />
      </div>
      <span className="text-[11px] font-bold tabular-nums text-stone-200 w-[2.5ch] text-right">
        {score}
      </span>
    </div>
  );
}

function RegBadge({ load }: { load: "NONE" | "LIGHT" | "MEDIUM" | "HEAVY" }) {
  const palette: Record<typeof load, string> = {
    HEAVY: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    LIGHT: "bg-indigo-500/15 text-indigo-200 border-indigo-500/30",
    NONE: "bg-stone-500/15 text-stone-300 border-stone-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.14em] border ${palette[load]}`}
    >
      {load}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
//  Live signal ticker that scrolls top alpha across the top
// ---------------------------------------------------------------------------

function AlphaTicker({ signals }: { signals: AlphaSignal[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(() => signals);
  useEffect(() => setItems(signals), [signals]);

  if (items.length === 0) return null;

  // Build a long string by repeating items 2x for seamless loop.
  const looped = [...items, ...items];

  return (
    <div className="relative h-9 border-b border-white/[0.04] bg-[#0a0a0e]/80 backdrop-blur-md overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0a0a0e] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0a0a0e] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 left-0 z-20 flex items-center pl-4 pr-3 bg-[#0a0a0e] border-r border-white/[0.04] gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 signal-pulse" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
          Live · Alpha Tape
        </span>
      </div>
      <div
        ref={trackRef}
        className="flex items-center gap-8 h-full ticker-track"
        style={{ paddingLeft: "180px" }}
      >
        {looped.map((s, i) => {
          const c = SEVERITY_COLOR[s.severity];
          return (
            <div
              key={`${s.id}-${i}`}
              className="flex items-center gap-2 shrink-0 text-[11px] font-[family-name:var(--font-signal-mono)]"
            >
              <span className={`text-[9px] font-bold tracking-[0.16em] ${c.text}`}>{s.severity}</span>
              <span className="text-stone-700">·</span>
              <span className="text-stone-300 whitespace-nowrap">{s.gap}</span>
              <span className="text-stone-700">·</span>
              <span className="text-emerald-300">{s.profile.tam}</span>
              <span className="text-stone-700">·</span>
              <span className="text-violet-300">{s.profile.capital}</span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .ticker-track {
          animation: ticker-marquee 60s linear infinite;
          width: max-content;
        }
        @keyframes ticker-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

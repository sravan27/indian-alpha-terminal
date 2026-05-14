"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, ChevronRight, ExternalLink, Layers,
  Link2, Lightbulb, Quote, Search, Sparkles, Target, Users, X,
} from "lucide-react";
import type {
  BrainData, Episode, GuestNode, MasterPlaybook, TopicCluster,
  FounderLibraryItem,
} from "@/lib/brain-types";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

interface ThreadResult {
  episodes: { episode: Episode; score: number }[];
  operators: GuestNode[];
  strategies: { text: string; episodeTitle: string; episodeId: string; timestamp?: string }[];
  marketGaps: { text: string; episodeTitle: string; category: string }[];
  playbooks: MasterPlaybook[];
  clusters: TopicCluster[];
  libraryItems: { item: FounderLibraryItem; section: string }[];
}

// ---------------------------------------------------------------------------
//  Scoring helpers
// ---------------------------------------------------------------------------

function tokenize(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
}

function score(blob: string, tokens: string[]): number {
  const lower = blob.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (lower.includes(t)) s += t.length > 4 ? 3 : 1;
  }
  return s;
}

function pullThread(query: string, data: BrainData): ThreadResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { episodes: [], operators: [], strategies: [], marketGaps: [], playbooks: [], clusters: [], libraryItems: [] };
  }

  // Episodes
  const episodeScores: { episode: Episode; score: number }[] = [];
  for (const ep of data.sourceCatalog ?? []) {
    const blob = [
      ep.title, ep.category, ...(ep.guests ?? []), ...(ep.tags ?? []),
      ...(ep.strategySnippets ?? []).map((s) => s.text),
      ...(ep.opportunitySnippets ?? []).map((s) => s.text),
    ].join(" ");
    const s = score(blob, tokens);
    if (s > 0) episodeScores.push({ episode: ep, score: s });
  }
  episodeScores.sort((a, b) => b.score - a.score);

  // Operators
  const ops: { g: GuestNode; s: number }[] = [];
  for (const g of data.guestNetwork ?? []) {
    const blob = [g.name, ...(g.categories ?? []), ...(g.coGuests ?? [])].join(" ");
    const s2 = score(blob, tokens);
    if (s2 > 0) ops.push({ g, s: s2 });
  }
  ops.sort((a, b) => b.s - a.s);

  // Strategies
  const strats: ThreadResult["strategies"] = [];
  for (const { episode } of episodeScores.slice(0, 15)) {
    for (const sn of episode.strategySnippets ?? []) {
      if (score(sn.text, tokens) > 0 || episodeScores[0]?.score > 5) {
        strats.push({ text: sn.text, episodeTitle: episode.title, episodeId: episode.id, timestamp: sn.timestamp });
      }
    }
  }

  // Market gaps
  const gaps: ThreadResult["marketGaps"] = [];
  for (const { episode } of episodeScores.slice(0, 15)) {
    for (const opp of episode.opportunitySnippets ?? []) {
      if (score(opp.text, tokens) > 0 || episodeScores[0]?.score > 5) {
        gaps.push({ text: opp.text, episodeTitle: episode.title, category: episode.category });
      }
    }
  }

  // Playbooks
  const pbs: { pb: MasterPlaybook; s: number }[] = [];
  for (const pb of data.masterPlaybooks ?? []) {
    const blob = [pb.title, pb.subtitle, pb.category ?? "", pb.thesis ?? "", ...(pb.steps ?? []).map((s) => s.detail)].join(" ");
    const s2 = score(blob, tokens);
    if (s2 > 0) pbs.push({ pb, s: s2 });
  }
  pbs.sort((a, b) => b.s - a.s);

  // Clusters
  const cls: { c: TopicCluster; s: number }[] = [];
  for (const c of data.topicClusters ?? []) {
    const blob = [c.category, ...(c.guests ?? []), ...(c.topStrategies ?? []), ...(c.marketGaps ?? [])].join(" ");
    const s2 = score(blob, tokens);
    if (s2 > 0) cls.push({ c, s: s2 });
  }
  cls.sort((a, b) => b.s - a.s);

  // Library items
  const libItems: ThreadResult["libraryItems"] = [];
  for (const section of data.founderLibrary?.sections ?? []) {
    for (const item of section.items) {
      const blob = [item.name, item.description, item.kind ?? ""].join(" ");
      if (score(blob, tokens) > 0) {
        libItems.push({ item, section: section.title });
      }
    }
  }

  return {
    episodes: episodeScores.slice(0, 12),
    operators: ops.slice(0, 8).map((o) => o.g),
    strategies: strats.slice(0, 10),
    marketGaps: gaps.slice(0, 8),
    playbooks: pbs.slice(0, 4).map((p) => p.pb),
    clusters: cls.slice(0, 4).map((c) => c.c),
    libraryItems: libItems.slice(0, 8),
  };
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export function ThreadView({
  data,
  initialQuery,
  onBack,
  onOpenEpisode,
  onOpenPlaybook,
}: {
  data: BrainData;
  initialQuery: string;
  onBack: () => void;
  onOpenEpisode: (ep: Episode) => void;
  onOpenPlaybook: (pb: MasterPlaybook) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);

  const result = useMemo(() => pullThread(query, data), [query, data]);

  const totalHits =
    result.episodes.length +
    result.operators.length +
    result.strategies.length +
    result.marketGaps.length +
    result.playbooks.length +
    result.libraryItems.length;

  const handleSearch = () => {
    const v = inputValue.trim();
    if (v) setQuery(v);
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar bg-[#06060a]">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-stone-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-300">
              Thread Pull
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-8">
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-indigo-500/40 transition-colors max-w-2xl">
            <Search className="w-4 h-4 text-stone-500 shrink-0" />
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Person, sector, strategy, market gap…"
              className="flex-1 bg-transparent text-[15px] placeholder-stone-600 focus:outline-none text-white"
              autoFocus
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors"
            >
              Pull Thread
            </button>
          </div>
          {query && (
            <p className="mt-2 text-[11px] text-stone-600">
              {totalHits > 0
                ? `${totalHits} connections found across ${result.episodes.length} episodes, ${result.operators.length} operators, ${result.strategies.length} strategies`
                : `No connections found for "${query}". Try a broader term.`}
            </p>
          )}
        </div>

        {/* Landing state — show when no query */}
        {!query && (
          <div className="mt-4">
            <h1 className="text-[32px] font-semibold text-white tracking-[-0.02em] leading-[1.1] mb-2">
              Pull any thread
            </h1>
            <p className="text-[13px] text-stone-500 mb-8 font-[family-name:var(--font-signal-mono)] max-w-2xl">
              Type a person, sector, strategy, or concept above. You'll get an intelligence dossier with every
              episode mention, every operator, every strategy, and every resource — across {data.sourceCatalog?.length ?? 0} episodes.
            </p>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 mb-3">
              Suggested threads
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {(data.topicClusters ?? []).slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setInputValue(c.category); setQuery(c.category); }}
                  className="text-left px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/20 hover:bg-indigo-500/[0.04] transition-colors group"
                >
                  <div className="text-[12px] font-semibold text-white group-hover:text-indigo-200 transition-colors">
                    {c.category}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {c.episodeCount} episodes · {c.guestCount} operators
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-600 mb-3">
              Try a name
            </div>
            <div className="flex flex-wrap gap-2">
              {(data.guestNetwork ?? [])
                .sort((a, b) => b.episodeCount - a.episodeCount)
                .slice(0, 8)
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setInputValue(g.name); setQuery(g.name); }}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/20 hover:bg-amber-500/[0.04] text-[11px] text-stone-400 hover:text-amber-200 transition-colors"
                  >
                    {g.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Thread title */}
        {totalHits > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <h1 className="text-[32px] font-semibold text-white tracking-[-0.02em] leading-[1.1] mb-1">
              Everything about "{query}"
            </h1>
            <p className="text-[13px] text-stone-500 mb-10 font-[family-name:var(--font-signal-mono)]">
              Intelligence dossier — every episode mention, strategy, market gap, operator, and resource.
            </p>
          </motion.div>
        )}

        {/* Operators */}
        {result.operators.length > 0 && (
          <Section icon={Users} title={`Operators · ${result.operators.length}`} tone="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.operators.map((op) => (
                <div key={op.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold ${
                    op.isCrossShow
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-200"
                      : "bg-indigo-500/15 border border-indigo-500/30 text-indigo-200"
                  }`}>
                    {op.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-white truncate">
                      {op.name}
                      {op.isCrossShow && (
                        <span className="ml-2 text-[9px] uppercase tracking-[0.14em] font-bold text-amber-300">★ Cross-Show</span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {op.episodeCount} episode{op.episodeCount === 1 ? "" : "s"} · {op.categories.slice(0, 3).join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Strategies */}
        {result.strategies.length > 0 && (
          <Section icon={Lightbulb} title={`Strategies · ${result.strategies.length}`} tone="emerald">
            <div className="space-y-2">
              {result.strategies.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const ep = data.sourceCatalog.find((e) => e.id === s.episodeId);
                    if (ep) onOpenEpisode(ep);
                  }}
                  className="w-full text-left bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] rounded-xl p-4 transition-colors group"
                >
                  <p className="text-[12.5px] text-stone-200 leading-relaxed font-[family-name:var(--font-signal-mono)] mb-2">
                    {s.text}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 group-hover:text-stone-300 transition-colors">
                    <ChevronRight className="w-3 h-3" />
                    <span className="line-clamp-1">{s.episodeTitle}</span>
                    {s.timestamp && <span className="text-emerald-400/60 ml-auto shrink-0">@ {s.timestamp}</span>}
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Market gaps */}
        {result.marketGaps.length > 0 && (
          <Section icon={Target} title={`Market Gaps · ${result.marketGaps.length}`} tone="rose">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.marketGaps.map((g, i) => (
                <div key={i} className="bg-rose-500/[0.04] border border-rose-500/15 rounded-xl p-4">
                  <p className="text-[12px] text-rose-100/90 leading-relaxed font-[family-name:var(--font-signal-mono)] mb-2">
                    {g.text}
                  </p>
                  <div className="text-[10px] text-stone-500">
                    {g.category} · {g.episodeTitle.slice(0, 60)}…
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Playbooks */}
        {result.playbooks.length > 0 && (
          <Section icon={Sparkles} title={`Playbooks · ${result.playbooks.length}`} tone="indigo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.playbooks.map((pb) => (
                <button
                  key={pb.id}
                  onClick={() => onOpenPlaybook(pb)}
                  className="text-left bg-indigo-500/[0.04] border border-indigo-500/15 hover:border-indigo-500/30 rounded-xl p-5 transition-colors group"
                >
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-300 mb-2">
                    {pb.verified ? "✓ Verified Playbook" : "Playbook"}
                  </div>
                  <h4 className="text-[14px] font-semibold text-white mb-1">{pb.title}</h4>
                  <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2">{pb.subtitle}</p>
                  <div className="mt-3 text-[10px] text-indigo-300/70 flex items-center gap-1 group-hover:text-indigo-200 transition-colors">
                    <ChevronRight className="w-3 h-3" /> {pb.steps?.length ?? 0} steps
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Episodes */}
        {result.episodes.length > 0 && (
          <Section icon={Layers} title={`Episodes · ${result.episodes.length}`} tone="indigo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.episodes.map(({ episode }) => (
                <button
                  key={episode.id}
                  onClick={() => onOpenEpisode(episode)}
                  className="text-left flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] rounded-lg px-4 py-3 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Layers className="w-3 h-3 text-indigo-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white line-clamp-1 group-hover:text-indigo-200 transition-colors">
                      {episode.title}
                    </p>
                    <div className="text-[10px] text-stone-500 flex items-center gap-2">
                      <span>{episode.category}</span>
                      {episode.guests?.length > 0 && (
                        <>
                          <span className="text-stone-700">·</span>
                          <span className="line-clamp-1">{episode.guests.slice(0, 2).join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {episode.sourceUrl && (
                    <ExternalLink className="w-3 h-3 text-stone-600 group-hover:text-indigo-300 shrink-0 transition-colors" />
                  )}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Library resources */}
        {result.libraryItems.length > 0 && (
          <Section icon={BookOpen} title={`Resources · ${result.libraryItems.length}`} tone="emerald">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.libraryItems.map(({ item, section }, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] rounded-xl p-4 transition-colors group"
                >
                  <Link2 className="w-3.5 h-3.5 text-emerald-400/60 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[12px] font-semibold text-white group-hover:text-emerald-200 transition-colors">
                      {item.name}
                    </div>
                    <p className="text-[10.5px] text-stone-400 leading-relaxed mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="text-[9px] text-stone-600 mt-1.5 uppercase tracking-[0.12em] font-bold">
                      {section} · {item.kind}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Connected clusters */}
        {result.clusters.length > 0 && (
          <Section icon={Layers} title="Connected Threads" tone="indigo">
            <div className="flex flex-wrap gap-2">
              {result.clusters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setInputValue(c.category);
                    setQuery(c.category);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05] text-[11px] text-stone-300 hover:text-indigo-200 transition-colors"
                >
                  {c.category} · {c.episodeCount} episodes
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Shared section component
// ---------------------------------------------------------------------------

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

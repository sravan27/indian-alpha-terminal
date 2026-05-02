"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search,
  Command,
  FileText,
  ChevronRight,
  Loader2,
  Sparkles,
  Layers,
  Users,
  TrendingUp,
  BookOpen,
  Slash,
  Presentation,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { detectNative, searchTranscripts } from "@/lib/tauri-client";
import {
  buildAlphaSignals,
  operatorIQ,
  SEVERITY_COLOR,
} from "@/lib/intelligence-engine";
import { buildTheses } from "@/lib/theses-engine";
import type { BrainData } from "@/lib/brain-types";

type ResultKind =
  | "thesis"
  | "episode"
  | "operator"
  | "playbook"
  | "gap"
  | "resource"
  | "command";

interface PaletteResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  payload?: unknown;
  /** for native FTS results, the preformatted snippet HTML */
  snippetHtml?: string;
}

export interface OmniAction {
  type: "open-episode" | "open-playbook" | "open-thesis" | "open-pitch" | "open-workspace" | "filter-category" | "open-library" | "open-library-resource";
  id?: string;
  url?: string;
}

const COMMANDS: { trigger: string; label: string; description: string; action: OmniAction }[] = [
  { trigger: "/pitch", label: "Enter Pitch Mode", description: "Cinematic auto-cycling presentation of the top theses", action: { type: "open-pitch" } },
  { trigger: "/library", label: "Open Founder Library", description: "Hand-curated, link-verified Indian-founder resource catalogue", action: { type: "open-library" } },
  { trigger: "/workspace", label: "Open Workspace · top thesis", description: "Compile a full Founder OS workspace from the #1 ranked thesis", action: { type: "open-workspace" } },
  { trigger: "/thesis", label: "Browse all theses", description: "Jump to the Investment Theses view", action: { type: "open-thesis" } },
];

export function OmniSearch({
  isOpen,
  onClose,
  data,
  onAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: BrainData;
  onAction: (action: OmniAction) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaletteResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const native = detectNative();

  const theses = useMemo(() => buildTheses(data, 12), [data]);
  const allSignals = useMemo(() => buildAlphaSignals(data), [data]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setActiveIdx(0);
    }
  }, [isOpen]);

  const buildLocalResults = useCallback(
    (q: string): PaletteResult[] => {
      const ql = q.toLowerCase().trim();
      const isCommand = ql.startsWith("/");
      const out: (PaletteResult & { _score: number })[] = [];

      // Relevance scoring: exact-match titles dominate, then prefix matches,
      // then substring, then partial. Keeps "Nikhil" surfacing the operator
      // node before tangentially-related theses or episodes.
      const score = (haystack: string | undefined, kind: ResultKind, base = 0): number => {
        if (!ql || !haystack) return 0;
        const h = haystack.toLowerCase();
        const KIND_BIAS: Record<ResultKind, number> = {
          operator: 60, // person lookups should win
          playbook: 45,
          thesis: 40,
          resource: 35,
          episode: 30,
          gap: 20,
          command: 100,
        };
        const bias = KIND_BIAS[kind];
        if (h === ql) return base + bias + 200;
        if (h.startsWith(ql)) return base + bias + 120;
        if (h.includes(` ${ql}`) || h.includes(`${ql} `)) return base + bias + 80;
        if (h.includes(ql)) return base + bias + 40;
        return 0;
      };

      if (isCommand) {
        const sub = ql.slice(1);
        COMMANDS.forEach((c) => {
          if (c.trigger.slice(1).startsWith(sub) || sub === "" || c.trigger.includes(sub)) {
            out.push({
              kind: "command",
              id: c.trigger,
              title: c.label,
              subtitle: c.description,
              meta: c.trigger,
              payload: c.action,
              _score: 100,
            });
          }
        });
        return out;
      }

      // Operators — score on name first, categories second
      data.guestNetwork.forEach((op) => {
        const s = Math.max(
          score(op.name, "operator"),
          score(op.categories.join(" "), "operator", -20),
        );
        if (!ql || s > 0) {
          out.push({
            kind: "operator",
            id: op.id,
            title: op.name,
            subtitle: `${op.episodeCount} episode${op.episodeCount === 1 ? "" : "s"} · ${op.categories.slice(0, 2).join(", ") || "—"}${op.isCrossShow ? " · ★ cross-show" : ""}`,
            meta: `IQ ${operatorIQ(op)}`,
            payload: op,
            _score: ql ? s : 30,
          });
        }
      });

      // Playbooks
      (data.masterPlaybooks ?? []).forEach((pb) => {
        const s = Math.max(
          score(pb.title, "playbook"),
          score(pb.subtitle, "playbook", -10),
          score(pb.category, "playbook", -10),
        );
        if (!ql || s > 0) {
          out.push({
            kind: "playbook",
            id: pb.id,
            title: pb.title,
            subtitle: pb.subtitle,
            meta: `${pb.steps.length} steps`,
            payload: pb,
            _score: ql ? s : 50,
          });
        }
      });

      // Theses
      theses.forEach((t) => {
        const s = Math.max(
          score(t.headline, "thesis"),
          score(t.hypothesis, "thesis", -10),
          score(t.category, "thesis", -10),
        );
        if (!ql || s > 0) {
          out.push({
            kind: "thesis",
            id: t.id,
            title: t.headline,
            subtitle: `${t.category} · ${t.capital} · ${t.tam} · score ${t.investability}`,
            meta: t.severity,
            payload: t,
            _score: ql ? s : 40,
          });
        }
      });

      // Episodes — score on title + guests
      data.sourceCatalog.forEach((ep) => {
        const s = Math.max(
          score(ep.title, "episode"),
          score(ep.category, "episode", -10),
          score(ep.guests.join(" "), "episode", -5),
        );
        if (!ql || s > 0) {
          out.push({
            kind: "episode",
            id: ep.id,
            title: ep.title,
            subtitle: `${ep.category} · ${ep.guests.slice(0, 3).join(", ")}`,
            meta: ep.duration,
            payload: ep,
            _score: ql ? s : 30,
          });
        }
      });

      // Founder library — verified resources
      const lib = data.founderLibrary;
      if (lib) {
        for (const section of lib.sections) {
          for (const item of section.items) {
            const s = Math.max(
              score(item.name, "resource"),
              score(item.description, "resource", -20),
              score(section.title, "resource", -15),
              score(item.tag ?? "", "resource", 10),
            );
            if (!ql || s > 0) {
              out.push({
                kind: "resource",
                id: `${section.id}-${item.name}`,
                title: item.name,
                subtitle: `${section.title} · ${item.description.slice(0, 80)}…`,
                meta: item.kind,
                payload: { url: item.url },
                _score: ql ? s : 35,
              });
            }
          }
        }
      }

      // Market gaps from alpha signals — last (lowest base bias)
      allSignals.slice(0, 80).forEach((s) => {
        const sc = Math.max(
          score(s.gap, "gap"),
          score(s.episode.category, "gap", -10),
        );
        if (!ql || sc > 0) {
          out.push({
            kind: "gap",
            id: s.id,
            title: s.gap,
            subtitle: `${s.episode.category} · ${s.profile.capital} · ${s.profile.tam}`,
            meta: s.severity,
            payload: s,
            _score: ql ? sc : 20,
          });
        }
      });

      // Sort by relevance, drop the score for downstream consumers
      out.sort((a, b) => b._score - a._score);
      return out.map(({ _score: _s, ...rest }) => rest);
    },
    [data, theses, allSignals],
  );

  // Compose native FTS results in addition to local index search
  useEffect(() => {
    let alive = true;
    const fetchResults = async () => {
      const q = query.trim();
      const local = buildLocalResults(q);

      if (q.startsWith("/") || !q) {
        if (alive) setResults(local);
        return;
      }

      setIsSearching(true);
      try {
        if (native === "native") {
          const hits = await searchTranscripts(q, 12);
          const ftsResults: PaletteResult[] = hits.map((r) => {
            const ep = data.sourceCatalog.find((e) => e.id === r.video_id);
            return {
              kind: "episode",
              id: `fts-${r.video_id}`,
              title: r.title,
              subtitle: r.category,
              meta: "FTS5",
              snippetHtml: r.snippet,
              payload: ep,
            };
          });
          // Native FTS results first, then local index ranks
          if (alive) setResults([...ftsResults, ...local]);
        } else {
          if (alive) setResults(local);
        }
      } finally {
        if (alive) setIsSearching(false);
      }
    };

    const debounce = window.setTimeout(fetchResults, 100);
    return () => {
      alive = false;
      window.clearTimeout(debounce);
    };
  }, [query, native, data, buildLocalResults]);

  // Group results by kind for sectioned display
  const grouped = useMemo(() => {
    const order: ResultKind[] = ["command", "thesis", "operator", "episode", "gap", "playbook", "resource"];
    const map = new Map<ResultKind, PaletteResult[]>();
    results.forEach((r) => {
      if (!map.has(r.kind)) map.set(r.kind, []);
      map.get(r.kind)!.push(r);
    });
    return order
      .map((k) => ({ kind: k, items: (map.get(k) ?? []).slice(0, k === "command" ? 6 : 4) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  // Flat list for keyboard navigation
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = flat[activeIdx];
        if (r) selectResult(r);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // selectResult is stable enough; not adding to deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flat, activeIdx, onClose]);

  function selectResult(r: PaletteResult) {
    if (r.kind === "command") {
      onAction(r.payload as OmniAction);
      onClose();
      return;
    }
    if (r.kind === "thesis") {
      onAction({ type: "open-thesis" });
      onClose();
      return;
    }
    if (r.kind === "playbook") {
      onAction({ type: "open-playbook", id: (r.payload as { id: string }).id });
      onClose();
      return;
    }
    if (r.kind === "episode") {
      const ep = (r.payload as { id: string } | undefined) ?? null;
      if (ep) onAction({ type: "open-episode", id: ep.id });
      onClose();
      return;
    }
    if (r.kind === "operator") {
      // Open the first episode of that operator
      const op = r.payload as { episodeIds: string[] };
      if (op?.episodeIds?.[0]) onAction({ type: "open-episode", id: op.episodeIds[0] });
      onClose();
      return;
    }
    if (r.kind === "gap") {
      const sig = r.payload as { episode: { id: string } };
      onAction({ type: "open-episode", id: sig.episode.id });
      onClose();
      return;
    }
    if (r.kind === "resource") {
      const url = (r.payload as { url?: string } | undefined)?.url;
      if (url) {
        onAction({ type: "open-library-resource", url });
      } else {
        onAction({ type: "open-library" });
      }
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#04040a]/75 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-[12vh] left-1/2 -translate-x-1/2 w-full max-w-[680px] bg-[#0c0c10]/95 border border-white/[0.08] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] rounded-2xl overflow-hidden z-[101] flex flex-col max-h-[78vh] backdrop-blur-2xl"
          >
            <div className="relative flex items-center px-4 py-4 border-b border-white/[0.06] shrink-0">
              {query.startsWith("/") ? (
                <Slash className="w-4 h-4 text-amber-300 absolute left-5" />
              ) : (
                <Search className="w-4 h-4 text-indigo-300 absolute left-5" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
                placeholder='Search theses, operators, gaps · type "/" for commands'
                className="w-full bg-transparent border-none outline-none text-white text-[15px] placeholder-stone-500 pl-9 pr-24 py-1 tracking-tight"
              />
              <div className="absolute right-5 flex items-center gap-1 text-[10px] text-stone-500 font-mono">
                <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded border border-white/[0.05]">esc</kbd>
              </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-2">
              {!query && (
                <PaletteHints />
              )}

              {query && isSearching && results.length === 0 && (
                <div className="px-4 py-8 text-center flex flex-col items-center">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mb-3" />
                  <p className="text-[12px] text-stone-500">Querying native index…</p>
                </div>
              )}

              {query && !isSearching && results.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[12px] text-stone-500">
                    No matches for <span className="text-white">&quot;{query}&quot;</span>. Try a
                    sector, operator, or capital tier.
                  </p>
                </div>
              )}

              {grouped.map((group) => {
                const items = group.items;
                let runningIdx = 0;
                // Compute the absolute flat index of this group's first item
                const baseIdx = (() => {
                  let idx = 0;
                  for (const g of grouped) {
                    if (g.kind === group.kind) break;
                    idx += g.items.length;
                  }
                  return idx;
                })();
                return (
                  <div key={group.kind} className="py-1">
                    <SectionHeader kind={group.kind} count={items.length} />
                    {items.map((r) => {
                      const flatIndex = baseIdx + runningIdx++;
                      const active = flatIndex === activeIdx;
                      return (
                        <ResultRow
                          key={r.id}
                          r={r}
                          active={active}
                          onHover={() => setActiveIdx(flatIndex)}
                          onClick={() => selectResult(r)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/[0.06] px-4 py-2.5 bg-[#08080c] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 text-[10px] text-stone-500 font-[family-name:var(--font-signal-mono)]">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 rounded bg-white/[0.05] border border-white/[0.05]">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 rounded bg-white/[0.05] border border-white/[0.05]">↩</kbd>
                  <span>Open</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 rounded bg-white/[0.05] border border-white/[0.05]">/</kbd>
                  <span>Commands</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                <Command className="w-3 h-3" />
                <span>{native === "native" ? "Native · SQLite FTS5" : "Web · JSON Index"}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ kind, count }: { kind: ResultKind; count: number }) {
  const map: Record<ResultKind, { label: string; icon: typeof Layers; tone: string }> = {
    command: { label: "Commands", icon: Slash, tone: "text-amber-300" },
    thesis: { label: "Investment Theses", icon: Layers, tone: "text-indigo-300" },
    operator: { label: "Verified Operators", icon: Users, tone: "text-amber-300" },
    episode: { label: "Episodes", icon: FileText, tone: "text-stone-300" },
    gap: { label: "Market Gaps", icon: TrendingUp, tone: "text-rose-300" },
    playbook: { label: "Verified Playbooks", icon: BookOpen, tone: "text-violet-300" },
    resource: { label: "Founder Library", icon: ExternalLink, tone: "text-emerald-300" },
  };
  const m = map[kind];
  const Icon = m.icon;
  return (
    <div className="flex items-center gap-1.5 px-3 pt-1.5 pb-1">
      <Icon className={`w-3 h-3 ${m.tone}`} />
      <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${m.tone}`}>
        {m.label}
      </span>
      <span className="ml-auto text-[9px] text-stone-600 font-mono">{count}</span>
    </div>
  );
}

function ResultRow({
  r,
  active,
  onClick,
  onHover,
}: {
  r: PaletteResult;
  active: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  const sevColor =
    r.kind === "thesis" || r.kind === "gap"
      ? SEVERITY_COLOR[r.meta as keyof typeof SEVERITY_COLOR]
      : null;
  return (
    <button
      onMouseEnter={onHover}
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
      }`}
    >
      <KindIcon kind={r.kind} active={active} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-white/95 truncate">{r.title}</span>
          {sevColor && (
            <span
              className={`text-[8px] font-bold uppercase tracking-[0.16em] ${sevColor.bg} ${sevColor.text} px-1.5 py-0.5 rounded`}
            >
              {r.meta}
            </span>
          )}
          {!sevColor && r.meta && (
            <span className="text-[9px] uppercase tracking-[0.14em] text-stone-500 px-1.5 py-0.5 bg-white/[0.04] rounded border border-white/[0.05]">
              {r.meta}
            </span>
          )}
        </div>
        {r.snippetHtml ? (
          <div
            className="text-[11.5px] text-stone-400 line-clamp-2 mt-0.5 leading-snug [&>mark]:bg-indigo-500/30 [&>mark]:text-white [&>mark]:rounded-sm [&>mark]:px-0.5"
            dangerouslySetInnerHTML={{ __html: r.snippetHtml }}
          />
        ) : (
          <div className="text-[11.5px] text-stone-400 line-clamp-1 mt-0.5">{r.subtitle}</div>
        )}
      </div>
      <ChevronRight
        className={`w-3.5 h-3.5 transition-colors ${active ? "text-indigo-300" : "text-stone-700"}`}
      />
    </button>
  );
}

function KindIcon({ kind, active }: { kind: ResultKind; active: boolean }) {
  const Icon =
    kind === "thesis"
      ? Layers
      : kind === "operator"
      ? Users
      : kind === "playbook"
      ? BookOpen
      : kind === "gap"
      ? TrendingUp
      : kind === "command"
      ? Slash
      : kind === "resource"
      ? ExternalLink
      : FileText;
  const tone =
    kind === "thesis"
      ? "indigo"
      : kind === "operator"
      ? "amber"
      : kind === "playbook"
      ? "violet"
      : kind === "gap"
      ? "rose"
      : kind === "command"
      ? "amber"
      : kind === "resource"
      ? "emerald"
      : "stone";
  const bg: Record<string, string> = {
    indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    violet: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    stone: "bg-white/[0.04] border-white/[0.08] text-stone-300",
  };
  return (
    <div
      className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 transition-colors ${bg[tone]} ${active ? "ring-1 ring-white/10" : ""}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

function PaletteHints() {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-indigo-300" />
        <h3 className="text-[12px] font-semibold text-white tracking-tight">
          Sovereign Index · what you can do
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <Hint label="aman gupta" desc="Find an operator across episodes" />
        <Hint label="d2c india" desc="Pull theses + gaps for a sector" />
        <Hint label="rainmatter" desc="Capital sources by name" tone="emerald" />
        <Hint label="mca" desc="Govt registration rails" tone="emerald" />
        <Hint label="/pitch" desc="Cinematic pitch deck" tone="amber" />
        <Hint label="/library" desc="Founder Library · 71 verified resources" tone="emerald" />
      </div>
      <div className="mt-5 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-2 text-[10px]">
        <FooterHint icon={Layers} label="Theses" tone="indigo" />
        <FooterHint icon={Users} label="Operators" tone="amber" />
        <FooterHint icon={TrendingUp} label="Gaps" tone="rose" />
        <FooterHint icon={BookOpen} label="Playbooks" tone="violet" />
        <FooterHint icon={Presentation} label="Pitch Deck" tone="amber" />
        <FooterHint icon={ExternalLink} label="Library" tone="emerald" />
      </div>
    </div>
  );
}

function Hint({
  label,
  desc,
  tone = "indigo",
}: {
  label: string;
  desc: string;
  tone?: "indigo" | "amber" | "emerald";
}) {
  const accent =
    tone === "amber" ? "text-amber-300" : tone === "emerald" ? "text-emerald-300" : "text-indigo-300";
  return (
    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-md px-2 py-1.5">
      <span className={`text-[11px] font-mono ${accent}`}>{label}</span>
      <span className="text-stone-500">·</span>
      <span className="text-stone-400 truncate">{desc}</span>
    </div>
  );
}

function FooterHint({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  tone: "indigo" | "amber" | "rose" | "violet" | "emerald";
}) {
  const map: Record<string, string> = {
    indigo: "text-indigo-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
  };
  return (
    <div className="flex items-center gap-1.5 text-stone-500">
      <Icon className={`w-3 h-3 ${map[tone]}`} />
      <span className="uppercase tracking-[0.14em] font-bold">{label}</span>
    </div>
  );
}

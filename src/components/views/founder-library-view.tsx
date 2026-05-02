"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Landmark,
  TrendingUp,
  Wrench,
  BookOpen,
  Scale,
  Users,
  GraduationCap,
  ExternalLink,
  Search,
  CheckCircle2,
  Layers,
  X,
} from "lucide-react";
import type { BrainData, FounderLibrarySection, FounderLibraryItem } from "@/lib/brain-types";

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "shield-check": ShieldCheck,
  landmark: Landmark,
  "trending-up": TrendingUp,
  wrench: Wrench,
  "book-open": BookOpen,
  scale: Scale,
  users: Users,
  "graduation-cap": GraduationCap,
};

const KIND_BADGE: Record<string, { label: string; tone: string }> = {
  gov: { label: "Govt portal", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  "gov-grant": { label: "Govt · Grant", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  "gov-loan": { label: "Govt · Loan", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  "gov-fund-of-funds": { label: "Govt · FoF", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  "gov-guarantee": { label: "Govt · Guarantee", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  vc: { label: "VC", tone: "bg-indigo-500/10 text-indigo-200 border-indigo-500/30" },
  "founder-fund": { label: "Founder fund", tone: "bg-violet-500/10 text-violet-200 border-violet-500/30" },
  grant: { label: "Grant", tone: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
  "seed-program": { label: "Seed program", tone: "bg-cyan-500/10 text-cyan-200 border-cyan-500/30" },
  incubator: { label: "Incubator", tone: "bg-cyan-500/10 text-cyan-200 border-cyan-500/30" },
  "venture-debt": { label: "Venture debt", tone: "bg-rose-500/10 text-rose-200 border-rose-500/30" },
  rbf: { label: "RBF", tone: "bg-rose-500/10 text-rose-200 border-rose-500/30" },
  ecommerce: { label: "Commerce", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  payments: { label: "Payments", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  logistics: { label: "Logistics", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  marketplace: { label: "Marketplace", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  ads: { label: "Ads", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  ops: { label: "Ops", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  hr: { label: "HR", tone: "bg-blue-500/10 text-blue-200 border-blue-500/30" },
  book: { label: "Book", tone: "bg-stone-500/10 text-stone-200 border-stone-500/30" },
  regulator: { label: "Regulator", tone: "bg-rose-600/10 text-rose-200 border-rose-600/30" },
  "industry-body": { label: "Industry body", tone: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
  community: { label: "Community", tone: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
  "think-tank": { label: "Think tank", tone: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
  protocol: { label: "Protocol", tone: "bg-amber-500/10 text-amber-200 border-amber-500/30" },
  accelerator: { label: "Accelerator", tone: "bg-cyan-500/10 text-cyan-200 border-cyan-500/30" },
  course: { label: "Course", tone: "bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/30" },
  guide: { label: "Guide", tone: "bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/30" },
  essays: { label: "Essays", tone: "bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/30" },
};

function getKindBadge(kind: string) {
  return KIND_BADGE[kind] ?? { label: kind, tone: "bg-white/[0.05] text-stone-300 border-white/[0.1]" };
}

const ALL_ID = "__all__";

export function FounderLibraryView({ data }: { data: BrainData }) {
  const lib = data.founderLibrary;
  const [activeSectionId, setActiveSectionId] = useState<string>(ALL_ID);
  const [query, setQuery] = useState("");

  const totalItems = useMemo(
    () => (lib?.sections.reduce((acc, s) => acc + s.items.length, 0) ?? 0),
    [lib],
  );

  const ql = query.trim().toLowerCase();
  const matchesQuery = (it: FounderLibraryItem, sectionTitle: string) =>
    !ql ||
    it.name.toLowerCase().includes(ql) ||
    it.description.toLowerCase().includes(ql) ||
    (it.tag ?? "").toLowerCase().includes(ql) ||
    it.kind.toLowerCase().includes(ql) ||
    sectionTitle.toLowerCase().includes(ql);

  const filteredCounts = useMemo(() => {
    if (!lib) return {} as Record<string, number>;
    const out: Record<string, number> = { [ALL_ID]: 0 };
    for (const s of lib.sections) {
      const c = s.items.filter((it) => matchesQuery(it, s.title)).length;
      out[s.id] = c;
      out[ALL_ID] += c;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib, ql]);

  if (!lib) {
    return (
      <div className="h-full w-full flex items-center justify-center text-stone-500">
        Founder Library not loaded.
      </div>
    );
  }

  // Decide which section(s) to render
  const sectionsToRender: { section: FounderLibrarySection; items: FounderLibraryItem[] }[] = [];
  if (activeSectionId === ALL_ID) {
    for (const s of lib.sections) {
      const items = s.items.filter((it) => matchesQuery(it, s.title));
      if (items.length > 0) sectionsToRender.push({ section: s, items });
    }
  } else {
    const s = lib.sections.find((x) => x.id === activeSectionId);
    if (s) {
      const items = s.items.filter((it) => matchesQuery(it, s.title));
      if (items.length > 0) sectionsToRender.push({ section: s, items });
    }
  }

  // If user searched and active section has no hits, fall back to All so they see something
  const renderingFallback = ql && sectionsToRender.length === 0 && activeSectionId !== ALL_ID;
  if (renderingFallback) {
    for (const s of lib.sections) {
      const items = s.items.filter((it) => matchesQuery(it, s.title));
      if (items.length > 0) sectionsToRender.push({ section: s, items });
    }
  }

  const totalRendered = sectionsToRender.reduce((acc, x) => acc + x.items.length, 0);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col md:flex-row bg-black">
      {/* Sidebar — sections (desktop) */}
      <aside className="hidden md:flex shrink-0 w-[260px] h-full border-r border-white/[0.06] flex-col bg-[#06060a]">
        {/* Brand strip */}
        <div className="shrink-0 px-5 pt-6 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.2em] text-emerald-300 font-bold mb-2">
            <CheckCircle2 className="w-3 h-3" /> Link-Verified
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight text-white leading-[1.1] mb-1">
            Indian Founder Library
          </h1>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            {totalItems} resources · curated from the WTF + BarberShop corpus
          </p>
        </div>

        {/* Sections nav */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <SectionNavRow
            id={ALL_ID}
            label="All resources"
            count={filteredCounts[ALL_ID] ?? 0}
            active={activeSectionId === ALL_ID}
            onClick={() => setActiveSectionId(ALL_ID)}
            icon={Layers}
          />
          <div className="my-2 border-t border-white/[0.04]" />
          {lib.sections.map((s) => {
            const Icon = ICON[s.icon] ?? CheckCircle2;
            const active = s.id === activeSectionId;
            const count = filteredCounts[s.id] ?? 0;
            return (
              <SectionNavRow
                key={s.id}
                id={s.id}
                label={s.title}
                count={count}
                active={active}
                onClick={() => setActiveSectionId(s.id)}
                icon={Icon}
                disabled={count === 0 && !!ql}
              />
            );
          })}
        </nav>

        {/* Footer rule */}
        <div className="shrink-0 px-5 py-3 border-t border-white/[0.04] text-[10px] text-stone-600 leading-relaxed">
          {lib._about?.rule ?? "Every entry has a verified URL on a stable domain."}
        </div>
      </aside>

      {/* Mobile section pills (visible only on small screens) */}
      <div className="md:hidden shrink-0 border-b border-white/[0.06] bg-[#06060a]">
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-emerald-300 font-bold mb-1.5">
            <CheckCircle2 className="w-3 h-3" /> Indian Founder Library · {totalItems}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar px-3 pb-3">
          <MobilePill label="All" count={filteredCounts[ALL_ID] ?? 0} active={activeSectionId === ALL_ID} onClick={() => setActiveSectionId(ALL_ID)} />
          {lib.sections.map((s) => (
            <MobilePill
              key={s.id}
              label={s.title.replace(/^Capital · /, "")}
              count={filteredCounts[s.id] ?? 0}
              active={s.id === activeSectionId}
              onClick={() => setActiveSectionId(s.id)}
              disabled={(filteredCounts[s.id] ?? 0) === 0 && !!ql}
            />
          ))}
        </div>
      </div>

      {/* Main pane */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Sticky search header */}
        <div className="shrink-0 px-4 sm:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06] bg-[#08080c]/80 backdrop-blur-xl z-10 relative">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex-1 max-w-2xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across MCA, SEBI, Razorpay, books, VC names…"
                className="w-full h-11 bg-[#0c0c10] border border-white/[0.08] rounded-xl pl-10 pr-10 text-[13px] text-white placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/[0.06] text-stone-500 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold tabular-nums whitespace-nowrap">
              {totalRendered} {totalRendered === 1 ? "resource" : "resources"}
              {ql && ` · "${query}"`}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 sm:px-8 py-5 sm:py-6 space-y-8 sm:space-y-10 max-w-[1280px] mx-auto">
            {renderingFallback && (
              <div className="text-[12px] text-amber-200/80 bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 rounded-lg">
                No matches in the active section. Showing matches across <strong className="text-white">all sections</strong>.
              </div>
            )}

            {sectionsToRender.map(({ section, items }) => {
              const SectionIcon = ICON[section.icon] ?? CheckCircle2;
              return (
                <motion.section
                  key={section.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                >
                  <div className="flex items-end justify-between gap-6 mb-4">
                    <div className="flex items-baseline gap-3">
                      <SectionIcon className="w-4 h-4 text-emerald-300 self-center" />
                      <h2 className="text-[18px] font-semibold tracking-tight text-white">
                        {section.title}
                      </h2>
                      <p className="text-[12px] text-stone-500 line-clamp-1 max-w-[60ch]">
                        {section.subtitle}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500 font-semibold tabular-nums shrink-0">
                      {items.length} {items.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <ResourceCard key={`${section.id}-${item.name}`} item={item} highlight={ql} />
                    ))}
                  </div>
                </motion.section>
              );
            })}

            {sectionsToRender.length === 0 && (
              <div className="mt-32 flex flex-col items-center justify-center text-center text-stone-500">
                <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.04] mb-4">
                  <Search className="h-7 w-7 text-stone-600" />
                </div>
                <p className="text-[13px]">No resources match <span className="text-white">{query}</span>.</p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-3 text-[11px] uppercase tracking-[0.18em] font-bold text-emerald-300 hover:text-white transition-colors"
                >
                  Clear search
                </button>
              </div>
            )}

            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionNavRow({
  label,
  count,
  active,
  onClick,
  icon: Icon,
  disabled,
}: {
  id: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all ${
        active
          ? "bg-white/[0.08] text-white"
          : disabled
          ? "text-stone-700 cursor-not-allowed"
          : "text-stone-400 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-emerald-300" : "text-stone-500"}`} />
      <span className={`flex-1 text-left truncate ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
      <span
        className={`text-[10px] tabular-nums font-mono ${
          active ? "text-stone-300" : disabled ? "text-stone-700" : "text-stone-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function MobilePill({
  label,
  count,
  active,
  onClick,
  disabled,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11px] font-medium whitespace-nowrap transition-all ${
        active
          ? "bg-white text-black border-white"
          : disabled
          ? "bg-white/[0.02] border-white/[0.04] text-stone-700"
          : "bg-white/[0.03] border-white/[0.08] text-stone-300 hover:border-emerald-500/30 hover:text-white"
      }`}
    >
      {label}
      <span className={`text-[9px] tabular-nums font-mono ${active ? "text-stone-700" : "text-stone-500"}`}>{count}</span>
    </button>
  );
}

function ResourceCard({ item, highlight }: { item: FounderLibraryItem; highlight: string }) {
  const badge = getKindBadge(item.kind);
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:border-emerald-500/40 hover:bg-white/[0.04] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="text-[13.5px] font-semibold text-white leading-tight tracking-tight pr-2 group-hover:text-emerald-100 transition-colors">
          <Highlighted text={item.name} q={highlight} />
        </h3>
        <ExternalLink className="w-3.5 h-3.5 text-stone-700 group-hover:text-emerald-300 shrink-0 mt-0.5 transition-colors" />
      </div>
      <p className="text-[11.5px] text-stone-400 leading-relaxed line-clamp-3 mb-3 grow">
        <Highlighted text={item.description} q={highlight} />
      </p>
      <div className="flex items-center gap-2 mt-auto">
        <span className={`text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded border ${badge.tone}`}>
          {badge.label}
        </span>
        {item.tag && (
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded border bg-amber-500/10 text-amber-200 border-amber-500/30">
            ★ {item.tag}
          </span>
        )}
        <span className="ml-auto text-[10px] text-stone-600 font-mono truncate max-w-[150px]">
          {hostnameFor(item.url)}
        </span>
      </div>
    </motion.a>
  );
}

function Highlighted({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const i = lower.indexOf(ql);
  if (i < 0) return <>{text}</>;
  const before = text.slice(0, i);
  const match = text.slice(i, i + q.length);
  const after = text.slice(i + q.length);
  return (
    <>
      {before}
      <mark className="bg-emerald-500/30 text-emerald-100 rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

function hostnameFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

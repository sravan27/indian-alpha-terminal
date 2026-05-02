"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  PlayCircle, Search, BookMarked, Briefcase, ExternalLink,
  Lightbulb, Compass, X, Users,
  BookOpen, ArrowRight, Sparkles, TrendingUp, ChevronRight, Link2,
  Bot, Layers, Presentation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralNetworkMap } from "./neural-brain";
import { OmniSearch, type OmniAction } from "./omni-search";
import { CopilotChat } from "./copilot-chat";
import { OfflineBadge } from "./offline-badge";
import { BootSequence } from "./boot-sequence";
import { AlphaMatrix } from "./views/alpha-matrix";
import { ThesesView } from "./views/theses-view";
import { FounderLibraryView } from "./views/founder-library-view";
import { detectNative } from "@/lib/tauri-client";
import { WorkspaceOverlay, type WorkspaceSeed } from "./workspace-overlay";
import { PitchMode } from "./pitch-mode";
import { buildTheses, type InvestmentThesis } from "@/lib/theses-engine";
import { profileFor } from "@/lib/intelligence-engine";
import type { BrainData, Episode, GuestNode, MasterPlaybook, TopicCluster } from "@/lib/brain-types";

// Category color system
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  "D2C": { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-300", dot: "bg-blue-400" },
  "Consumer": { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", dot: "bg-amber-400" },
  "Capital": { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-300", dot: "bg-purple-400" },
  "Health": { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400" },
  "Content": { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-300", dot: "bg-violet-400" },
  "AI": { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-300", dot: "bg-cyan-400" },
  "Founders": { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-300", dot: "bg-red-400" },
  "Platforms": { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-300", dot: "bg-indigo-400" },
  "EV": { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-300", dot: "bg-green-400" },
  "Hospitality": { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-300", dot: "bg-orange-400" },
  "Education": { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-300", dot: "bg-teal-400" },
  "RealEstate": { bg: "bg-stone-500/10", border: "border-stone-500/20", text: "text-stone-300", dot: "bg-stone-400" },
  "Climate": { bg: "bg-emerald-600/10", border: "border-emerald-600/20", text: "text-emerald-200", dot: "bg-emerald-500" },
  "Gaming": { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-300", dot: "bg-pink-400" },
  "M&A": { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-300", dot: "bg-rose-400" },
  "Brand Building": { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", text: "text-fuchsia-300", dot: "bg-fuchsia-400" },
  "Beauty": { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-300", dot: "bg-pink-400" },
  "E-commerce": { bg: "bg-sky-500/10", border: "border-sky-500/20", text: "text-sky-300", dot: "bg-sky-400" },
  "Creator Economy": { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-300", dot: "bg-violet-400" },
  "Category Creation": { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-300", dot: "bg-amber-400" },
  "Scale-Up": { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-300", dot: "bg-indigo-400" },
  "Entertainment": { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-300", dot: "bg-purple-400" },
  "Metaverse": { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-300", dot: "bg-cyan-400" },
};
const DEFAULT_COLOR = { bg: "bg-white/5", border: "border-white/10", text: "text-stone-300", dot: "bg-stone-400" };
const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || DEFAULT_COLOR;

type DetailPanel =
  | { type: "episode"; data: Episode }
  | { type: "playbook"; data: MasterPlaybook }
  | { type: "cluster"; data: TopicCluster }
  | { type: "guest"; data: GuestNode };

  export function ProjectSignalApp({ data }: { data: BrainData }) {
    const [activeHost, setActiveHost] = useState("All");
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    // Default view: "alpha" gives the strongest first impression — 21 critical
    // signals, ranked, sortable. Investors land here and immediately see scale.
    const [viewMode, setViewMode] = useState<"grid" | "neural" | "alpha" | "theses" | "library">("alpha");
    const [, setSelectedNode] = useState<unknown | null>(null);
    const [isOmniOpen, setIsOmniOpen] = useState(false);
    const [isCopilotOpen, setIsCopilotOpen] = useState(false);
    const [detailPanel, setDetailPanel] = useState<DetailPanel | null>(null);
    // Boot sequence is a native-shell flourish; skip on the web so click-from-DM
    // visitors see content instantly.
    const [booted, setBooted] = useState(() => {
      if (typeof window === "undefined") return false;
      return !((window as unknown as { __TAURI__?: unknown }).__TAURI__);
    });
    const [isPitchOpen, setIsPitchOpen] = useState(false);
    const [workspaceSeed, setWorkspaceSeed] = useState<WorkspaceSeed | null>(null);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [platform, setPlatform] = useState<"native" | "web" | "unknown">("unknown");

    // Detect runtime platform on mount so the footer provenance line is honest
    useEffect(() => {
      setPlatform(detectNative());
    }, []);

    const footerProvenance =
      platform === "native"
        ? "SQLite FTS5 · Rust IPC · Zero Network"
        : platform === "web"
        ? "Static · Bundled JSON Index · Zero Telemetry"
        : "Loading…";

    // Add global CMD+K (search), CMD+J (copilot), CMD+. (pitch) listeners
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          setIsOmniOpen(prev => !prev);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "j") {
          e.preventDefault();
          setIsCopilotOpen(prev => !prev);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === ".") {
          e.preventDefault();
          setIsPitchOpen(prev => !prev);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const openEpisodeById = useCallback((videoId: string) => {
      const ep = data.sourceCatalog.find((e) => e.id === videoId);
      if (ep) {
        setDetailPanel({ type: "episode", data: ep });
      }
    }, [data.sourceCatalog]);

    const openPlaybookById = useCallback((pbId: string) => {
      const pb = data.masterPlaybooks?.find((p) => p.id === pbId);
      if (pb) setDetailPanel({ type: "playbook", data: pb });
    }, [data.masterPlaybooks]);

    const openWorkspaceForThesis = useCallback((t: InvestmentThesis) => {
      setWorkspaceSeed({
        category: t.category,
        hypothesis: t.hypothesis,
        playbook: t.playbook ?? undefined,
        capital: t.capital,
        timeline: t.timeline,
        reg: t.reg,
      });
      setIsWorkspaceOpen(true);
    }, []);

    const handleOmniAction = useCallback((action: OmniAction) => {
      switch (action.type) {
        case "open-pitch":
          setIsPitchOpen(true);
          break;
        case "open-workspace": {
          const theses = buildTheses(data, 1);
          if (theses[0]) openWorkspaceForThesis(theses[0]);
          break;
        }
        case "open-thesis":
          setViewMode("theses");
          break;
        case "open-library":
          setViewMode("library");
          break;
        case "open-library-resource":
          if (action.url && typeof window !== "undefined") {
            window.open(action.url, "_blank", "noopener,noreferrer");
          } else {
            setViewMode("library");
          }
          break;
        case "open-episode":
          if (action.id) openEpisodeById(action.id);
          break;
        case "open-playbook":
          if (action.id) openPlaybookById(action.id);
          break;
        case "filter-category":
          if (action.id) setActiveCategory(action.id);
          break;
      }
    }, [data, openEpisodeById, openPlaybookById, openWorkspaceForThesis]);
  
    const creatorMap = useMemo(
      () => Object.fromEntries(data.creators.map((c) => [c.id, c.handle] as const)),
      [data.creators],
    );

    const categories = useMemo(() => {
      const cats = new Set<string>();
      data.sourceCatalog.forEach((ep) => cats.add(ep.category || "General"));
      return ["All", ...Array.from(cats).sort()];
    }, [data.sourceCatalog]);

    const filteredEpisodes = useMemo(() => {
      const q = searchTerm.toLowerCase();
      return data.sourceCatalog.filter((ep) => {
        const matchHost = activeHost === "All" || creatorMap[ep.creatorId] === activeHost;
        const matchCat = activeCategory === "All" || ep.category === activeCategory;
        const matchSearch =
          q === "" ||
          ep.title.toLowerCase().includes(q) ||
          ep.category?.toLowerCase().includes(q) ||
          ep.guests?.some((g) => g.toLowerCase().includes(q)) ||
          ep.resourceString?.toLowerCase().includes(q);
        return matchHost && matchCat && matchSearch;
      });
    }, [data.sourceCatalog, activeHost, activeCategory, searchTerm, creatorMap]);

    type AlphaRow = { gap: string; episode: Episode; playbook: MasterPlaybook | null };

    const alphaMatrixData: AlphaRow[] = useMemo(() => {
      const gaps: AlphaRow[] = [];
      const q = searchTerm.toLowerCase();
      const fallbackPlaybooks = data.masterPlaybooks || [];
      const getFallbackPb = (epCat: string, idx: number): MasterPlaybook | null => {
        if (!fallbackPlaybooks.length) return null;
        const hash = epCat.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return fallbackPlaybooks[(hash + idx) % fallbackPlaybooks.length];
      };

      data.sourceCatalog.forEach((ep, index) => {
        const matchHost = activeHost === "All" || creatorMap[ep.creatorId] === activeHost;
        const matchCat = activeCategory === "All" || ep.category === activeCategory;
        if (matchHost && matchCat && ep.opportunitySnippets) {
          ep.opportunitySnippets.forEach((opp) => {
            if (
              q === "" ||
              opp.text.toLowerCase().includes(q) ||
              ep.category?.toLowerCase().includes(q)
            ) {
              const related =
                fallbackPlaybooks.find(
                  (pb) => pb.category === ep.category || pb.id?.includes(ep.category.toLowerCase()),
                ) || getFallbackPb(ep.category || "General", index);
              gaps.push({ gap: opp.text, episode: ep, playbook: related });
            }
          });
        }
      });
      return gaps.sort((a, b) => b.gap.length - a.gap.length);
    }, [data, activeHost, activeCategory, searchTerm, creatorMap]);

    const stats = useMemo(
      () => ({
        episodes: data.sourceCatalog.length,
        guests: data.meta?.guestCount || data.guestNetwork.length,
        playbooks: data.masterPlaybooks?.length || 0,
        words: `${Math.round((data.meta?.totalWordsProcessed || 560244) / 1000)}K`,
      }),
      [data],
    );

    const openDetail = (panel: DetailPanel) => {
      setDetailPanel(panel);
    };

    const handleNodeSelect = (node: { type: string; originalData?: unknown }) => {
      setSelectedNode(node);
      if (node.type === "episode" && node.originalData) {
        openDetail({ type: "episode", data: node.originalData as Episode });
      } else if (node.type === "category" && node.originalData) {
        openDetail({ type: "cluster", data: node.originalData as TopicCluster });
      } else if (node.type === "guest" && node.originalData) {
        openDetail({ type: "guest", data: node.originalData as GuestNode });
      }
    };
  
    // ====== Render Functions ======
  
    const renderEpisodeCard = (ep: Episode) => {
      const colors = getCatColor(ep.category);
      const marketGap = ep.opportunitySnippets?.[0]?.text || "";

      return (
        <motion.div
          key={ep.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="lift-hover group flex flex-col bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.12] cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_-12px_rgba(91,108,255,0.18)]"
          onClick={() => openDetail({ type: "episode", data: ep })}
        >
          {/* Header */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${colors.text}`}>{ep.category}</span>
              <span className="text-[10px] text-stone-600 ml-auto">{creatorMap[ep.creatorId]}</span>
            </div>
            <h3 className="text-[15px] font-medium text-white/90 leading-tight line-clamp-2 group-hover:text-white transition-colors">
              {ep.title}
            </h3>
          </div>
  
          {/* Market Gap */}
          {marketGap && (
            <div className="px-5 pb-4">
              <div className="flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-[12px] text-stone-400 leading-relaxed line-clamp-2">{marketGap}</p>
              </div>
            </div>
          )}
  
          {/* Bottom bar */}
          <div className="mt-auto px-5 py-3 border-t border-white/[0.04] flex items-center gap-3">
            {ep.guests?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-600" />
                <span className="text-[11px] text-stone-500">{ep.guests.length} guests</span>
              </div>
            )}
            {ep.duration && (
              <span className="text-[11px] text-stone-600">{ep.duration}</span>
            )}
            <ChevronRight className="w-4 h-4 text-stone-700 ml-auto group-hover:text-stone-300 transition-colors" />
          </div>
        </motion.div>
      );
    };
  
    const renderPlaybookCard = (pb: MasterPlaybook) => (
      <motion.div
        key={pb.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="lift-hover group flex flex-col bg-gradient-to-br from-indigo-900/20 via-[#0c0c0e] to-violet-900/10 border border-indigo-500/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 cursor-pointer relative"
        onClick={() => openDetail({ type: "playbook", data: pb })}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/20">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">
              {pb.verified ? "Verified Playbook" : "Master Playbook"}
            </span>
            {pb.verified && (
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300 flex items-center gap-1 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Sourced
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white leading-tight mb-2 tracking-tight group-hover:text-indigo-100 transition-colors">{pb.title}</h3>
          <p className="text-[13px] text-stone-400 leading-relaxed font-[family-name:var(--font-signal-mono)] line-clamp-3">{pb.thesis || pb.subtitle}</p>
          {pb.creator && (
            <p className="text-[10px] uppercase tracking-[0.18em] font-medium text-stone-600 mt-3">
              {pb.creator}{pb.duration ? ` · ${pb.duration}` : ""}
            </p>
          )}
        </div>
        <div className="mt-auto px-6 py-4 border-t border-white/[0.04] flex items-center gap-3 relative z-10 bg-black/20">
          <span className="text-[11px] font-medium text-indigo-400">{pb.steps?.length || 0} Stage Synthesis</span>
          {pb.resources?.length > 0 && (
            <>
              <span className="text-[11px] text-stone-600">•</span>
              <span className="text-[11px] text-stone-500">{pb.resources.length} Resources</span>
            </>
          )}
          <div className="ml-auto w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <ArrowRight className="w-3 h-3 text-stone-500 group-hover:text-indigo-300" />
          </div>
        </div>
      </motion.div>
    );
  
    // ====== Detail Panel ======
    const renderDetailPanel = () => {
      if (!detailPanel) return null;

      const headingFor = (t: DetailPanel["type"]) =>
        t === "episode"
          ? "Intelligence Stream"
          : t === "playbook"
          ? "Execution Blueprint"
          : t === "cluster"
          ? "Market Vector"
          : "Operator Profile";

      return (
        <motion.div
          key={`detail-${detailPanel.type}-${detailPanel.data.id}`}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 60, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="w-[520px] shrink-0 h-full bg-[#0c0c10]/95 border-l border-white/[0.06] overflow-y-auto custom-scrollbar shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.7)] z-40 relative backdrop-blur-2xl"
        >
          <div className="sticky top-0 z-10 bg-[#0c0c10]/90 backdrop-blur-md px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              {headingFor(detailPanel.type)}
            </span>
            <button
              onClick={() => setDetailPanel(null)}
              className="p-1 rounded hover:bg-white/[0.06] text-stone-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {detailPanel.type === "episode" && renderEpisodeDetail(detailPanel.data)}
            {detailPanel.type === "playbook" && renderPlaybookDetail(detailPanel.data)}
            {detailPanel.type === "cluster" && renderClusterDetail(detailPanel.data)}
            {detailPanel.type === "guest" && renderGuestDetail(detailPanel.data)}
          </div>
        </motion.div>
      );
    };
  
    const renderEpisodeDetail = (ep: Episode) => {
      const colors = getCatColor(ep.category);
      return (
        <>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${colors.text}`}>{ep.category}</span>
              <span className="text-[11px] text-stone-600 ml-1">•</span>
              <span className="text-[11px] text-stone-500">{creatorMap[ep.creatorId]}</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-snug mb-4">{ep.title}</h2>
            <a href={ep.sourceUrl} target="_blank" rel="noopener noreferrer" 
              className="inline-flex items-center justify-center gap-2 text-[12px] font-bold text-black bg-white hover:bg-stone-200 px-4 py-2 rounded-lg transition-colors w-full mb-2">
              <PlayCircle className="w-4 h-4" /> Watch Source Stream 
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
  
          {/* Market Gap */}
          {ep.opportunitySnippets?.[0] && (
            <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">Unexploited Market Whitespace</span>
              </div>
              <p className="text-[14px] text-indigo-100/90 leading-relaxed relative z-10 font-[family-name:var(--font-signal-mono)]">{ep.opportunitySnippets[0].text}</p>
            </div>
          )}
  
          {/* Framework */}
          {ep.strategySnippets?.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Tactical Strategy</span>
              </div>
              <div className="space-y-4">
                {ep.strategySnippets.map((s: any, i: number) => (
                  <div key={i} className="flex gap-3 text-[13px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)]">
                    <span className="text-emerald-500/30 font-bold shrink-0 mt-0.5 w-4 text-right">0{i+1}.</span>
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
  
          {/* Guests */}
          {ep.guests?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Verified Operators</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ep.guests.map((g, i) => {
                  const guestData = data.guestNetwork?.find((gn) => gn.name === g);
                  return (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (guestData) openDetail({ type: "guest", data: guestData });
                      }}
                      className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[12px] font-medium text-stone-300 hover:bg-white/[0.08] hover:text-white transition-colors group"
                    >
                      <Users className="w-3 h-3 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
                      {g}
                      {guestData?.isCrossShow && (
                        <span className="text-[9px] text-amber-500 font-bold ml-1">★ REPEAT</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
  
          {/* Resources */}
          {ep.resourceString && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-4 h-4 text-sky-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-400">References</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ep.resourceString.split(", ").map((r, i) => (
                  <div key={i} className="inline-flex items-center gap-2 bg-sky-500/[0.05] border border-sky-500/10 rounded-lg px-3 py-2 text-[12px] font-mono text-sky-300/80">
                    <BookMarked className="w-3.5 h-3.5 text-sky-500/40" />
                    {r.trim()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    };
  
    const renderPlaybookDetail = (pb: MasterPlaybook) => (
        <>
          <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 -m-6 mb-6 rounded-b-2xl shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 noise-overlay opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="flex items-center gap-2 mb-4 relative z-10 flex-wrap">
              <span className="px-2.5 py-1 bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 backdrop-blur-md">
                {pb.verified ? "Verified Playbook" : "Execution Blueprint"}
              </span>
              {pb.verified && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-200 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Hand-Curated
                </span>
              )}
              {pb.category && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-indigo-100/70 font-medium">
                  · {pb.category}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight mb-3 relative z-10 shadow-sm">{pb.title}</h2>
            <p className="text-[14px] text-indigo-100 font-[family-name:var(--font-signal-mono)] relative z-10 leading-relaxed">{pb.thesis || pb.subtitle}</p>
            {(pb.creator || pb.duration || pb.published) && (
              <div className="mt-4 flex items-center gap-3 text-[11px] text-indigo-100/70 relative z-10 font-[family-name:var(--font-signal-mono)] flex-wrap">
                {pb.creator && <span>{pb.creator}</span>}
                {pb.duration && <><span>·</span><span>{pb.duration}</span></>}
                {pb.published && <><span>·</span><span>{pb.published}</span></>}
              </div>
            )}
          </div>

          {pb.sourceUrl && (
            <a
              href={pb.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mb-3 bg-white text-black hover:bg-stone-200"
            >
              <PlayCircle className="w-4 h-4" /> Watch the source episode
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
             onClick={() => {
               setWorkspaceSeed({
                 category: pb.category || "General",
                 hypothesis: pb.thesis || pb.subtitle,
                 playbook: pb,
               });
               setIsWorkspaceOpen(true);
             }}
             className="w-full font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mb-8 bg-white/10 hover:bg-white/15 border border-white/20 text-white"
          >
             <Briefcase className="w-4 h-4" /> Initialize Workspace
          </button>

          {pb.summary && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-stone-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">Summary</span>
              </div>
              <p className="text-[13px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)]">{pb.summary}</p>
            </div>
          )}

          {pb.audience && (
            <div className="mb-8 bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Who this is for</span>
              </div>
              <p className="text-[13px] text-stone-300 leading-relaxed">{pb.audience}</p>
            </div>
          )}

          {pb.marketGap && (
            <div className="mb-8 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">Market whitespace</span>
              </div>
              <p className="text-[13px] text-indigo-100/90 leading-relaxed relative z-10 font-[family-name:var(--font-signal-mono)]">{pb.marketGap}</p>
            </div>
          )}

          <div className="mb-2 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Framework</span>
          </div>
          <div className="space-y-7 relative pl-1 mt-4 before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-indigo-500/20 transition-all">
            {pb.steps?.map((step, idx) => (
              <div key={step.step} className="relative pl-12 group">
                <div className="absolute left-0 top-0.5 w-[32px] h-[32px] rounded-full bg-[#0c0c0e] border-[2px] border-indigo-500/40 group-hover:border-indigo-400 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center text-[11px] font-bold text-indigo-300">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <p className="text-[13px] text-stone-200 leading-relaxed font-[family-name:var(--font-signal-mono)] mt-1">{step.detail}</p>
              </div>
            ))}
          </div>

          {pb.tags && pb.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-1.5">
              {pb.tags.map((tag, i) => (
                <span key={i} className="text-[10px] font-mono text-stone-500 bg-white/[0.03] border border-white/[0.05] rounded px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {pb.resources?.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4">
                <BookMarked className="w-4 h-4 text-sky-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-300">Resource stack</span>
              </div>
              <div className="grid gap-2">
                {pb.resources.map((r, i) => {
                  const inner = (
                    <>
                      <div className="text-[12px] font-semibold text-white mb-0.5 flex items-center gap-2">
                        {r.name}
                        {r.url && <ExternalLink className="w-3 h-3 text-sky-400/60" />}
                      </div>
                      <div className="text-[11px] text-stone-400 leading-relaxed">{r.description}</div>
                    </>
                  );
                  return r.url ? (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-lg bg-sky-500/[0.04] border border-sky-500/10 hover:bg-sky-500/[0.08] hover:border-sky-500/30 transition-colors block"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={i} className="px-3 py-2.5 rounded-lg bg-sky-500/[0.04] border border-sky-500/10">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
    );
  
    const renderClusterDetail = (cl: TopicCluster) => (
      <>
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight mb-2">{cl.category}</h2>
          <p className="text-[12px] text-stone-500">
            {cl.episodeCount} correlated episodes · {cl.guestCount} verified operators
          </p>
        </div>
        {cl.topStrategies?.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300 mb-4 block">
              Synthesised Intelligence
            </span>
            <div className="space-y-3">
              {cl.topStrategies.map((s, i) => (
                <p
                  key={i}
                  className="text-[13px] text-stone-300 leading-relaxed pl-4 border-l-2 border-emerald-500/30 font-[family-name:var(--font-signal-mono)]"
                >
                  {s}
                </p>
              ))}
            </div>
          </div>
        )}
        {cl.marketGaps?.length > 0 && (
          <div className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-xl p-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300 mb-4 block">
              Market Gaps
            </span>
            <div className="space-y-3">
              {cl.marketGaps.map((g, i) => (
                <p
                  key={i}
                  className="text-[13px] text-indigo-100/80 leading-relaxed pl-4 border-l-2 border-indigo-500/30"
                >
                  {g}
                </p>
              ))}
            </div>
          </div>
        )}
      </>
    );
  
    const renderGuestDetail = (g: GuestNode) => {
      const guestEpisodes = data.sourceCatalog.filter(
        (ep) => g.episodeIds?.includes(ep.id) || ep.guests?.includes(g.name),
      );
      return (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-semibold text-white tracking-tight">{g.name}</h2>
              {g.isCrossShow && (
                <span className="text-[9px] bg-amber-500/20 text-amber-200 px-2.5 py-1 rounded-sm uppercase tracking-[0.15em] font-bold border border-amber-500/30">
                  Cross-Show Validator
                </span>
              )}
            </div>
            <p className="text-[13px] text-stone-400 font-[family-name:var(--font-signal-mono)]">
              {g.episodeCount} verified data point{g.episodeCount > 1 ? "s" : ""}
              {g.categories?.length ? ` · Focus: ${g.categories.join(", ")}` : ""}
            </p>
          </div>

          {guestEpisodes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-white/[0.08] pb-2">
                <Compass className="w-4 h-4 text-emerald-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300">
                  Operator Intelligence Trace
                </span>
              </div>
              <div className="space-y-4">
                {guestEpisodes.map((ep, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 hover:bg-white/[0.04] transition-colors cursor-pointer"
                    onClick={() => openDetail({ type: "episode", data: ep })}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-500">
                        {ep.category}
                      </span>
                      <span className="text-stone-600 text-[10px]">·</span>
                      <span className="text-[10px] font-mono text-stone-500 line-clamp-1">{ep.title}</span>
                    </div>
                    {ep.opportunitySnippets?.[0] ? (
                      <p className="text-[13px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)] line-clamp-3">
                        “{ep.opportunitySnippets[0].text}”
                      </p>
                    ) : (
                      <p className="text-[12px] text-stone-500 italic">No direct whitespace extracted.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    };
  
    // ====== Main Layout ======
    return (
      <div className="flex flex-col h-screen w-screen bg-[#07070a]/95 text-white overflow-hidden font-[family-name:var(--font-signal-display)] relative selection:bg-indigo-500/30">

        {viewMode !== "alpha" && viewMode !== "theses" && viewMode !== "library" && <div className="absolute top-0 left-1/4 w-1/2 h-40 bg-indigo-500/5 blur-[120px] pointer-events-none" />}

        {/* Native macOS title bar — drag region with traffic-light gutter */}
        <div
          className="app-drag-region shrink-0 h-[44px] border-b border-white/[0.04] bg-[#0a0a0e]/85 backdrop-blur-2xl flex items-center pl-4 sm:pl-[88px] pr-4"
        >
          <div className="app-no-drag flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-indigo-500 to-violet-600 flex items-center justify-center glow-accent border border-indigo-400/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-semibold tracking-tight text-white">India Alpha</span>
              <span className="hidden sm:block text-[9px] text-stone-500 tracking-[0.18em] uppercase font-medium mt-0.5">
                Sovereign Intel · Native
              </span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="app-no-drag flex items-center gap-2">
            <OfflineBadge />
            <button
              onClick={() => setIsCopilotOpen((v) => !v)}
              className={`hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[10px] font-bold uppercase tracking-[0.14em] border transition-all ${
                isCopilotOpen
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
                  : "bg-white/[0.03] border-white/[0.06] text-stone-300 hover:bg-white/[0.06] hover:text-white"
              }`}
              title="Toggle Alpha Copilot (⌘J)"
            >
              <Bot className="w-3 h-3" />
              Copilot
              <kbd className="ml-1 text-[9px] bg-white/[0.06] border border-white/[0.06] rounded px-1 py-0.5 font-mono text-stone-300">⌘J</kbd>
            </button>
          </div>
        </div>

        {/* Sub-header — search + view toggle */}
        <header className="shrink-0 border-b border-white/[0.04] bg-[#09090c]/70 backdrop-blur-xl z-20 relative">
          <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-6 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsOmniOpen(true)}
              className="flex-1 min-w-[160px] max-w-xl h-10 bg-[#0c0c10] hover:bg-white/[0.06] border border-white/[0.08] hover:border-indigo-500/40 rounded-xl px-3 sm:px-4 flex items-center justify-between group transition-all shadow-sm"
            >
              <div className="flex items-center gap-2 sm:gap-3 text-stone-500 group-hover:text-stone-200 transition-colors min-w-0">
                <Search className="w-4 h-4 shrink-0 text-indigo-400/80 group-hover:text-indigo-300 transition-colors" />
                <span className="text-[12px] sm:text-[13px] font-[family-name:var(--font-signal-mono)] truncate">
                  <span className="hidden sm:inline">Search {stats.words} words across WTF + BarberShop…</span>
                  <span className="sm:hidden">Search…</span>
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 opacity-70">
                <kbd className="text-[10px] bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono text-stone-300">⌘</kbd>
                <kbd className="text-[10px] bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono text-stone-300">K</kbd>
              </div>
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#09090c] border border-white/[0.08] rounded-xl p-1 shadow-inner h-9 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setViewMode("alpha")}
                className={`shrink-0 px-2.5 sm:px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 ${viewMode === "alpha" ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : "text-stone-500 hover:text-indigo-300"}`}
              >
                <Lightbulb className="w-3 h-3" /> <span className="hidden sm:inline">Alpha Matrix</span><span className="sm:hidden">Alpha</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`shrink-0 px-2.5 sm:px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center ${viewMode === "grid" ? "bg-white/[0.08] text-white" : "text-stone-500 hover:text-white"}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("theses")}
                className={`shrink-0 px-2.5 sm:px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 ${viewMode === "theses" ? "bg-white/[0.08] text-white" : "text-stone-500 hover:text-white"}`}
              >
                <Layers className="w-3 h-3" /> Theses
              </button>
              <button
                onClick={() => setViewMode("library")}
                className={`shrink-0 px-2.5 sm:px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 ${viewMode === "library" ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40" : "text-stone-500 hover:text-emerald-300"}`}
                title="Founder Library — verified Indian-founder resources"
              >
                <BookOpen className="w-3 h-3" /> Library
              </button>
              <button
                onClick={() => setViewMode("neural")}
                className={`shrink-0 px-2.5 sm:px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center ${viewMode === "neural" ? "bg-white/[0.08] text-white" : "text-stone-500 hover:text-white"}`}
              >
                Neural
              </button>
              <div className="w-px h-5 bg-white/[0.06] mx-1 shrink-0" />
              <button
                onClick={() => setIsPitchOpen(true)}
                className="shrink-0 px-2.5 sm:px-3 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <Presentation className="w-3 h-3" /> Pitch
                <kbd className="hidden sm:inline ml-0.5 text-[9px] bg-white/[0.05] border border-white/[0.06] rounded px-1 py-0.5 font-mono text-stone-400">⌘.</kbd>
              </button>
            </div>
          </div>
        </header>
  
        {/* Main body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Left sidebar — Filters (Hidden in Alpha Matrix + Theses) */}
          {viewMode !== "alpha" && viewMode !== "theses" && viewMode !== "library" && (
            <aside className="w-[240px] shrink-0 border-r border-white/[0.02] bg-white/[0.01] overflow-y-auto custom-scrollbar p-5 hidden lg:flex flex-col gap-8">
              
              {/* Exec Brief */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 mb-3 px-1">Engine Stats</h4>
                <div className="grid grid-cols-2 gap-2 bg-[#0a0a0c] p-3 rounded-xl border border-white/[0.03]">
                    <div>
                      <div className="text-[18px] font-bold tracking-tight text-white">{stats.episodes}</div>
                      <div className="text-[9px] text-stone-600 uppercase tracking-wider">Episodes</div>
                    </div>
                    <div>
                      <div className="text-[18px] font-bold tracking-tight text-white">{stats.guests}</div>
                      <div className="text-[9px] text-stone-600 uppercase tracking-wider">Operators</div>
                    </div>
                </div>
              </div>
    
              {/* Categories */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 mb-3 px-1">Market Vectors</h4>
                <div className="space-y-1">
                  {categories.map((cat) => {
                    const colors = getCatColor(cat);
                    const count = cat === "All" ? data.sourceCatalog.length : data.sourceCatalog.filter((e: any) => e.category === cat).length;
                    return (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all ${activeCategory === cat ? 'bg-white/[0.06] text-white shadow-sm border border-white/[0.04]' : 'text-stone-500 hover:text-white hover:bg-white/[0.02]'}`}>
                        <div className="flex items-center gap-2.5">
                          {cat !== "All" && <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} shadow-[0_0_8px_${colors.dot.replace('bg-', '')}]`} />}
                          <span className={activeCategory === cat ? "font-semibold tracking-tight" : "font-medium"}>{cat}</span>
                        </div>
                        <span className="text-[10px] text-stone-600 font-mono">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}
  
          {/* Center — Content */}
          <main className={`flex-1 min-w-0 overflow-hidden relative ${viewMode === 'grid' ? 'bg-[#09090b]' : viewMode === 'alpha' || viewMode === 'theses' || viewMode === 'library' ? 'bg-black' : ''}`}>
            
            {viewMode === "grid" && (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="max-w-[1600px] mx-auto p-6 md:p-10">
                  {/* Verified Playbooks Hero Row */}
                  {data.masterPlaybooks?.length > 0 && activeCategory === "All" && searchTerm === "" && (
                    <div className="mb-14">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-[16px] font-bold tracking-tight text-white">Verified Founder Playbooks</h3>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 flex items-center gap-1.5 ml-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {data.masterPlaybooks.length} hand-curated
                        </span>
                      </div>
                      <p className="text-[12px] text-stone-500 mb-6 font-[family-name:var(--font-signal-mono)] max-w-[68ch]">
                        Each playbook is a sourced dossier — thesis, framework, market whitespace, resource stack — derived directly from a single WTF or BarberShop episode.
                      </p>
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {data.masterPlaybooks.map((pb) => renderPlaybookCard(pb))}
                      </div>
                    </div>
                  )}
  
                  {/* Episodes Grid */}
                  <div className="flex items-center justify-between mb-6 border-b border-white/[0.04] pb-4">
                    <h3 className="text-[14px] font-bold tracking-tight text-white">
                      Raw Intelligence Streams
                    </h3>
                    <span className="text-[12px] text-stone-500 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.04]">{filteredEpisodes.length} Results</span>
                  </div>
  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    <AnimatePresence mode="popLayout">
                      {filteredEpisodes.map((ep: any) => renderEpisodeCard(ep))}
                    </AnimatePresence>
                  </div>
                  {filteredEpisodes.length === 0 && (
                    <div className="mt-32 flex flex-col items-center justify-center text-center">
                      <div className="p-4 rounded-full bg-white/[0.02] border border-white/[0.04] mb-4">
                        <Search className="h-8 w-8 text-stone-600" />
                      </div>
                      <h3 className="text-base font-medium text-stone-300">No signals detected</h3>
                      <p className="mt-2 text-[13px] text-stone-600 max-w-xs">Adjust your search parameters or query the Omni Search via Cmd+K.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {viewMode === "neural" && (
              <div className="h-full w-full relative">
                <NeuralNetworkMap 
                  data={data} 
                  activeFilter={activeCategory === "All" ? "" : activeCategory} 
                  onNodeSelect={handleNodeSelect}
                  searchTerm={searchTerm}
                />
              </div>
            )}

            {viewMode === "alpha" && (
              <AlphaMatrix
                data={data}
                activeHost={activeHost}
                activeCategory={activeCategory}
                searchTerm={searchTerm}
                creatorMap={creatorMap}
                onOpenEpisode={(ep) => openDetail({ type: "episode", data: ep })}
                onOpenPlaybook={(pb) => openDetail({ type: "playbook", data: pb })}
              />
            )}

            {viewMode === "theses" && (
              <ThesesView
                data={data}
                onOpenEpisode={(ep) => {
                  const found = data.sourceCatalog.find((e) => e.id === ep.id);
                  if (found) openDetail({ type: "episode", data: found });
                }}
                onOpenPlaybook={(pb) => openDetail({ type: "playbook", data: pb })}
                onOpenWorkspace={openWorkspaceForThesis}
              />
            )}

            {viewMode === "library" && <FounderLibraryView data={data} />}
  
          </main>
  
          {/* Right — Detail Panel */}
          <AnimatePresence>
            {detailPanel && renderDetailPanel()}
          </AnimatePresence>
        </div>
  
        {/* Omni-Search Global Terminal */}
        <OmniSearch
          isOpen={isOmniOpen}
          onClose={() => setIsOmniOpen(false)}
          data={data}
          onAction={handleOmniAction}
        />

        {/* Copilot Chat */}
        <CopilotChat
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          data={data}
          onSelectEpisode={openEpisodeById}
        />

        {/* Workspace Overlay */}
        <WorkspaceOverlay
          open={isWorkspaceOpen}
          brain={data}
          seed={workspaceSeed}
          onClose={() => setIsWorkspaceOpen(false)}
        />

        {/* Pitch Mode — fullscreen cinematic thesis cycling */}
        <PitchMode
          data={data}
          open={isPitchOpen}
          onClose={() => setIsPitchOpen(false)}
        />

        {/* Boot Sequence — cinematic cold start */}
        {!booted && (
          <BootSequence
            data={data}
            onComplete={() => setBooted(true)}
          />
        )}

        {/* Bottom status bar — pitch trust signal */}
        <footer className="app-drag-region shrink-0 h-[26px] border-t border-white/[0.04] bg-[#08080c]/85 backdrop-blur-xl flex items-center px-4 gap-4 text-[10px] tracking-[0.12em] uppercase font-medium text-stone-500">
          <span className="app-no-drag flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 signal-pulse" />
            Local Engine
          </span>
          <span className="text-stone-700">·</span>
          <span className="app-no-drag">{stats.episodes} Episodes</span>
          <span className="text-stone-700">·</span>
          <span className="app-no-drag">{stats.guests} Operators</span>
          <span className="text-stone-700">·</span>
          <span className="app-no-drag">{stats.playbooks} Playbooks</span>
          <div className="flex-1" />
          <span className="app-no-drag text-stone-600">{footerProvenance}</span>
        </footer>
      </div>
    );
  }

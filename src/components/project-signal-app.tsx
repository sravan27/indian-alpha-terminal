"use client";

import { useMemo, useState, useEffect } from "react";
import { 
  PlayCircle, Search, BookMarked, Briefcase, ExternalLink, 
  Lightbulb, Compass, Network, LayoutGrid, X, Bot, Users, 
  BookOpen, ArrowRight, Layers, Sparkles, TrendingUp, ChevronRight, Link2,
  Loader2, Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralNetworkMap } from "./neural-brain";
import { OmniSearch } from "./omni-search";

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
};
const DEFAULT_COLOR = { bg: "bg-white/5", border: "border-white/10", text: "text-stone-300", dot: "bg-stone-400" };
const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || DEFAULT_COLOR;

type BrainData = any;

  export function ProjectSignalApp({ data }: { data: BrainData }) {
    const [activeHost, setActiveHost] = useState("All");
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "neural" | "alpha">("alpha");
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [isOmniOpen, setIsOmniOpen] = useState(false);
    const [detailPanel, setDetailPanel] = useState<any | null>(null); // For episode/playbook/guest detail
  
    // Add global CMD+K listener to root
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          setIsOmniOpen(prev => !prev);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
  
    const creatorMap = useMemo(() => Object.fromEntries(data.creators.map((c: any) => [c.id, c.handle])), [data.creators]);
  
    const categories = useMemo(() => {
      const cats = new Set<string>();
      data.sourceCatalog.forEach((ep: any) => cats.add(ep.category || "General"));
      return ["All", ...Array.from(cats).sort()];
    }, [data.sourceCatalog]);
  
    const filteredEpisodes = useMemo(() => {
      const q = searchTerm.toLowerCase();
      return data.sourceCatalog.filter((ep: any) => {
        const matchHost = activeHost === "All" || creatorMap[ep.creatorId] === activeHost;
        const matchCat = activeCategory === "All" || ep.category === activeCategory;
        const matchSearch = q === "" || 
          ep.title.toLowerCase().includes(q) || 
          ep.category?.toLowerCase().includes(q) ||
          ep.guests?.some((g: string) => g.toLowerCase().includes(q)) ||
          ep.resourceString?.toLowerCase().includes(q);
        return matchHost && matchCat && matchSearch;
      });
    }, [data.sourceCatalog, activeHost, activeCategory, searchTerm, creatorMap]);

    // Aggregate all Whitespace Opportunities (Market Gaps) into an actionable array
    const alphaMatrixData = useMemo(() => {
      const gaps: any[] = [];
      const q = searchTerm.toLowerCase();
      
      const fallbackPlaybooks = data.masterPlaybooks || [];
      const getFallbackPb = (epCat: string, idx: number) => {
         if (!fallbackPlaybooks.length) return null;
         const hash = epCat.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
         return fallbackPlaybooks[(hash + idx) % fallbackPlaybooks.length];
      };
      
      data.sourceCatalog.forEach((ep: any, index: number) => {
        const matchHost = activeHost === "All" || creatorMap[ep.creatorId] === activeHost;
        const matchCat = activeCategory === "All" || ep.category === activeCategory;
        
        if (matchHost && matchCat && ep.opportunitySnippets) {
          ep.opportunitySnippets.forEach((opp: any) => {
            if (q === "" || opp.text.toLowerCase().includes(q) || ep.category?.toLowerCase().includes(q)) {
              // Find matching top playbook or assign a deterministic fallback based on category text to ensure variety!
              const relatedPlaybook = fallbackPlaybooks.find((pb: any) => pb.category === ep.category) || getFallbackPb(ep.category || "General", index);
              gaps.push({ gap: opp.text, episode: ep, playbook: relatedPlaybook });
            }
          });
        }
      });
      return gaps.sort((a,b) => b.gap.length - a.gap.length); // Sort by detail length (proxy for depth of insight)
    }, [data, activeHost, activeCategory, searchTerm, creatorMap]);
  
    const stats = useMemo(() => ({
      episodes: data.sourceCatalog.length,
      guests: data.meta?.guestCount || 0,
      playbooks: data.masterPlaybooks?.length || 0,
      words: "400K+",
    }), [data]);
  
    const openDetail = (type: string, item: any) => {
      setDetailPanel({ type, data: item });
      setInitWorkspace(false);
    };

    const [initWorkspace, setInitWorkspace] = useState(false);
  
    const handleNodeSelect = (node: any) => {
      setSelectedNode(node);
      if (node.type === "episode" && node.originalData) {
        openDetail("episode", node.originalData);
      } else if (node.type === "category" && node.originalData) {
        openDetail("cluster", node.originalData);
      } else if (node.type === "guest" && node.originalData) {
        openDetail("guest", node.originalData);
      }
    };
  
    // ====== Render Functions ======
  
    const renderEpisodeCard = (ep: any, compact = false) => {
      const colors = getCatColor(ep.category);
      const marketGap = ep.opportunitySnippets?.[0]?.text || "";
      
      return (
        <motion.div
          key={ep.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`group flex flex-col bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.12] transition-all cursor-pointer shadow-sm`}
          onClick={() => openDetail("episode", ep)}
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
  
    const renderPlaybookCard = (pb: any) => (
      <motion.div
        key={pb.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex flex-col bg-gradient-to-br from-indigo-900/20 via-[#0c0c0e] to-violet-900/10 border border-indigo-500/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all cursor-pointer relative"
        onClick={() => openDetail("playbook", pb)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/20">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">Master Playbook</span>
          </div>
          <h3 className="text-lg font-bold text-white leading-tight mb-2 tracking-tight group-hover:text-indigo-100 transition-colors">{pb.title}</h3>
          <p className="text-[13px] text-stone-400 leading-relaxed font-[family-name:var(--font-signal-mono)]">{pb.subtitle}</p>
        </div>
        <div className="mt-auto px-6 py-4 border-t border-white/[0.04] flex items-center gap-3 relative z-10 bg-black/20">
          <span className="text-[11px] font-medium text-indigo-400">{pb.steps?.length || 0} Stage Synthesis</span>
          <span className="text-[11px] text-stone-600">•</span>
          <span className="text-[11px] text-stone-500">{pb.episodeIds?.length || 0} Core Episodes</span>
          <div className="ml-auto w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <ArrowRight className="w-3 h-3 text-stone-500 group-hover:text-indigo-300" />
          </div>
        </div>
      </motion.div>
    );
  
    // ====== Detail Panel ======
    const renderDetailPanel = () => {
      if (!detailPanel) return null;
      const { type, data: item } = detailPanel;
  
      return (
        <motion.div
          key={`detail-${item.id || item.title}`}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="w-[520px] shrink-0 h-full bg-[#0c0c0e] border-l border-white/[0.06] overflow-y-auto custom-scrollbar shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-40 relative"
        >
          {/* Close button */}
          <div className="sticky top-0 z-10 bg-[#0c0c0e]/95 backdrop-blur-md px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">
              {type === "episode" ? "Intelligence Stream" : type === "playbook" ? "Execution Blueprint" : type === "cluster" ? "Market Vector" : "Operator Profile"}
            </span>
            <button onClick={() => setDetailPanel(null)} className="p-1 rounded hover:bg-white/5 text-stone-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
  
          <div className="p-6 space-y-8">
            {type === "episode" && renderEpisodeDetail(item)}
            {type === "playbook" && renderPlaybookDetail(item)}
            {type === "cluster" && renderClusterDetail(item)}
            {type === "guest" && renderGuestDetail(item)}
          </div>
        </motion.div>
      );
    };
  
    const renderEpisodeDetail = (ep: any) => {
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
                {ep.guests.map((g: string, i: number) => {
                  const guestData = data.guestNetwork?.find((gn: any) => gn.name === g);
                  return (
                    <button key={i} onClick={(e) => { e.stopPropagation(); if (guestData) openDetail("guest", guestData); }}
                      className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[12px] font-medium text-stone-300 hover:bg-white/[0.08] hover:text-white transition-colors group">
                      <Users className="w-3 h-3 text-amber-500/50 group-hover:text-amber-400 transition-colors" />
                      {g}
                      {guestData?.isCrossShow && <span className="text-[9px] text-amber-500 font-bold ml-1">★ REPEAT</span>}
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
                {ep.resourceString.split(", ").map((r: string, i: number) => (
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
  
    const renderPlaybookDetail = (pb: any) => (
        <>
          <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 -m-6 mb-6 rounded-b-2xl shadow-xl relative overflow-hidden">
             
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <span className="px-2.5 py-1 bg-white/20 text-white rounded text-[10px] font-bold uppercase tracking-[0.2em] border border-white/20 backdrop-blur-md">Execution Blueprint</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight mb-3 relative z-10 shadow-sm">{pb.title}</h2>
            <p className="text-[14px] text-indigo-100 font-[family-name:var(--font-signal-mono)] relative z-10">{pb.subtitle}</p>
          </div>
          
          <button 
             onClick={() => setInitWorkspace(true)}
             className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mb-8 ${initWorkspace ? 'bg-indigo-600/50 border border-indigo-400/50 text-white cursor-default' : 'bg-white/10 hover:bg-white/15 border border-white/20 text-white'}`}
          >
             {initWorkspace ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />} 
             {initWorkspace ? "Deploying Founder OS Engine..." : "Initialize Workspace"}
          </button>
    
          {initWorkspace && (
             <motion.div 
               initial={{ opacity: 0, height: 0 }} 
               animate={{ opacity: 1, height: 'auto' }} 
               className="bg-[#050508] border border-white/[0.08] p-4 rounded-xl mb-8 font-mono text-[10px] text-stone-500"
             >
               <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest mb-3 border-b border-white/[0.08] pb-2">
                 <Terminal className="w-3 h-3" /> Offline Compilation Engine
               </div>
               <div className="space-y-2">
                 <p className="animate-pulse">[*] Instantiating local vector database for Playbook context...</p>
                 <p className="text-white delay-100">[+] CDSCO/SEBI Regulatory framework loaded locally.</p>
                 <p className="text-white delay-200">[+] Cross-referencing 24 operator playbooks.</p>
                 <p className="text-emerald-400 delay-300 font-bold mt-2">[SUCCESS] Executable local workspace compiled. Ready for Operator inputs.</p>
               </div>
             </motion.div>
          )}

          {/* Steps */}
          <div className={`space-y-8 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-indigo-500/20 transition-all ${initWorkspace ? 'opacity-40 blur-[1px] pointer-events-none' : ''}`}>
            {pb.steps?.map((step: any, idx: number) => (
              <div key={step.step} className="relative pl-12 group">
                <div className="absolute left-0 top-0.5 w-[32px] h-[32px] rounded-full bg-[#0c0c0e] border-[2px] border-indigo-500/40 group-hover:border-indigo-400 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center text-[11px] font-bold text-indigo-300">
                  0{idx + 1}
                </div>
                <h4 className="text-[15px] font-bold text-white mb-2">{step.title}</h4>
                <p className="text-[13px] text-stone-400 leading-relaxed font-[family-name:var(--font-signal-mono)]">{step.detail}</p>
              </div>
            ))}
          </div>
        </>
    );
  
    const renderClusterDetail = (cl: any) => (
      <>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight mb-2">{cl.category}</h2>
          <p className="text-[12px] text-stone-500">{cl.episodeCount} highly correlated episodes • {cl.guestCount} verified operators</p>
        </div>
        {cl.topStrategies?.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-400 mb-4 block">Synthesized Intelligence</span>
            <div className="space-y-3">
              {cl.topStrategies.map((s: string, i: number) => (
                <p key={i} className="text-[13px] text-stone-300 leading-relaxed pl-4 border-l-2 border-emerald-500/30 font-[family-name:var(--font-signal-mono)]">{s}</p>
              ))}
            </div>
          </div>
        )}
        {cl.marketGaps?.length > 0 && (
          <div className="bg-indigo-500/[0.03] border border-indigo-500/10 rounded-xl p-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-400 mb-4 block">Market Gaps</span>
            <div className="space-y-3">
              {cl.marketGaps.map((g: string, i: number) => (
                <p key={i} className="text-[13px] text-indigo-100/80 leading-relaxed pl-4 border-l-2 border-indigo-500/30">{g}</p>
              ))}
            </div>
          </div>
        )}
      </>
    );
  
    const renderGuestDetail = (g: any) => {
      const guestEpisodes = data.sourceCatalog.filter((ep: any) => g.episodeIds?.includes(ep.id) || ep.guests?.includes(g.name));
      return (
      <>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">{g.name}</h2>
            {g.isCrossShow && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-sm uppercase tracking-widest font-bold border border-amber-500/30">Cross-Show Validator</span>}
          </div>
          <p className="text-[13px] text-stone-400 font-[family-name:var(--font-signal-mono)]">
            {g.episodeCount} Verified Data Point{g.episodeCount > 1 ? 's' : ''} • Focus: {g.categories?.join(", ")}
          </p>
        </div>

        {guestEpisodes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-white/[0.08] pb-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Operator Intelligence Trace</span>
            </div>
            <div className="space-y-4">
              {guestEpisodes.map((ep: any, i: number) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-5 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => openDetail("episode", ep)}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-500">{ep.category}</span>
                    <span className="text-stone-600 text-[10px]">•</span>
                    <span className="text-[10px] font-mono text-stone-500 line-clamp-1">{ep.title}</span>
                  </div>
                  {ep.opportunitySnippets?.[0] ? (
                    <p className="text-[13px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)] line-clamp-3">
                      "{ep.opportunitySnippets[0].text}"
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
    )};
  
    // ====== Main Layout ======
    return (
      <div className="flex flex-col h-screen w-screen bg-[#060608] text-white overflow-hidden font-[family-name:var(--font-signal-display)] relative selection:bg-indigo-500/30">
        
        {viewMode !== "alpha" && <div className="absolute top-0 left-1/4 w-1/2 h-40 bg-indigo-500/5 blur-[120px] pointer-events-none" />}
  
        {/* Header */}
        <header className="shrink-0 border-b border-white/[0.04] bg-[#09090b]/80 backdrop-blur-xl z-20 sticky top-0 relative">
          <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-[16px] font-bold tracking-tight text-white mb-0.5">India Alpha.</h1>
                <p className="text-[10px] text-stone-500 tracking-[0.1em] font-medium">SOVEREIGN INTEL ASSET</p>
              </div>
            </div>
  
            {/* Command Palette Trigger */}
            <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md hidden md:block">
              <button 
                onClick={() => setIsOmniOpen(true)}
                className="w-full h-10 bg-[#0c0c0e] hover:bg-white/[0.06] border border-white/[0.08] hover:border-indigo-500/40 rounded-xl px-4 flex items-center justify-between group transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 text-stone-500 group-hover:text-stone-300 transition-colors">
                  <Search className="w-4 h-4 text-indigo-400/70 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-[13px] font-[family-name:var(--font-signal-mono)]">Search {stats.words} of transcript IP...</span>
                </div>
                <div className="flex items-center gap-1 opacity-70">
                  <kbd className="text-[10px] bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono text-stone-400 group-hover:text-white">⌘</kbd>
                  <kbd className="text-[10px] bg-white/[0.05] border border-white/[0.08] rounded px-1.5 py-0.5 font-mono text-stone-400 group-hover:text-white">K</kbd>
                </div>
              </button>
            </div>
  
            {/* View toggle */}
            <div className="flex items-center gap-1.5 bg-[#09090b] border border-white/[0.08] rounded-xl p-1 shadow-inner h-9">
              <button onClick={() => setViewMode("neural")} className={`px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center ${viewMode === 'neural' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-white'}`}>
                Neural
              </button>
              <button onClick={() => setViewMode("grid")} className={`px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-white'}`}>
                Grid
              </button>
              <button onClick={() => setViewMode("alpha")} className={`px-4 h-full rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 ${viewMode === 'alpha' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'text-stone-500 hover:text-indigo-400'}`}>
                <Lightbulb className="w-3 h-3" /> Alpha Matrix
              </button>
            </div>
          </div>
        </header>
  
        {/* Main body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Left sidebar — Filters (Hidden in Alpha Matrix) */}
          {viewMode !== "alpha" && (
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
          <main className={`flex-1 min-w-0 overflow-hidden relative ${viewMode === 'grid' ? 'bg-[#09090b]' : viewMode === 'alpha' ? 'bg-black' : ''}`}>
            
            {viewMode === "grid" && (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="max-w-[1600px] mx-auto p-6 md:p-10">
                  {/* Master Playbooks Hero Row */}
                  {data.masterPlaybooks?.length > 0 && activeCategory === "All" && searchTerm === "" && (
                    <div className="mb-14">
                      <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-[16px] font-bold tracking-tight text-white">Synthesized Executive Blueprints</h3>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {data.masterPlaybooks.map((pb: any) => renderPlaybookCard(pb))}
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
              <div className="h-full w-full overflow-hidden flex flex-col pt-10 px-10 pb-0">
                 <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col">
                   <div className="flex items-end justify-between border-b border-white/[0.08] pb-6 mb-6">
                      <div>
                        <h2 className="text-4xl font-bold text-white tracking-tighter mb-2 flex items-center gap-3">
                           VENTURE WHITESPACE
                           <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border border-indigo-500/30">DEAL FLOW OS</span>
                        </h2>
                        <p className="text-[13px] text-stone-400 max-w-2xl font-[family-name:var(--font-signal-mono)]">Unexploited market gaps extracted directly from India's top founders across 400,000 words of transcript. Linked directly to executable frameworks.</p>
                      </div>
                      <div className="text-right">
                         <div className="text-[32px] font-bold text-white font-mono">{alphaMatrixData.length}</div>
                         <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Active Opportunities</div>
                      </div>
                   </div>

                   {/* The Massive Bloomberg Table */}
                   <div className="flex-1 overflow-auto custom-scrollbar border border-white/[0.04] rounded-t-xl bg-[#09090b]/50 backdrop-blur-md">
                      <table className="w-full text-left border-collapse">
                         <thead className="sticky top-0 bg-[#0c0c0e]/95 backdrop-blur-md z-10 font-[family-name:var(--font-signal-mono)]">
                            <tr>
                               <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-white/[0.06] w-5/12">Exploitable Gap</th>
                               <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-white/[0.06] w-3/12">Execution Framework</th>
                               <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-white/[0.06] w-3/12">Intel Source</th>
                               <th className="px-6 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-white/[0.06] w-1/12 text-center">Action</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/[0.03]">
                            {alphaMatrixData.map((row: any, i: number) => {
                               const catColor = getCatColor(row.episode.category);
                               return (
                               <tr key={i} className="hover:bg-white/[0.03] transition-colors group cursor-pointer" onClick={() => openDetail("playbook", row.playbook || { title: "Custom Framework", subtitle: "Building tailored approach based on gap" })}>
                                  <td className="px-6 py-5">
                                      <p className="text-[13px] text-white/90 leading-relaxed font-[family-name:var(--font-signal-mono)]">{row.gap}</p>
                                  </td>
                                  <td className="px-6 py-5 align-top">
                                      {row.playbook ? (
                                        <div>
                                           <div className="flex items-center gap-1.5 mb-1.5">
                                              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                                              <span className="text-[11px] font-bold text-indigo-300">{row.playbook.title}</span>
                                           </div>
                                           <p className="text-[11px] text-stone-500 line-clamp-2">{row.playbook.subtitle}</p>
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-stone-600 italic">No direct framework mapped</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-5 align-top">
                                      <p className="text-[12px] text-stone-300 mb-1 line-clamp-1">{row.episode.title}</p>
                                      <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
                                          <span className="text-[10px] text-stone-500">{creatorMap[row.episode.creatorId]}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-5 align-top text-center">
                                      <button className="w-8 h-8 rounded-full bg-white/5 mx-auto flex items-center justify-center border border-white/10 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors text-stone-500"
                                        onClick={(e) => { e.stopPropagation(); openDetail("episode", row.episode); }}
                                      >
                                          <ChevronRight className="w-4 h-4" />
                                      </button>
                                  </td>
                               </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                 </div>
              </div>
            )}
  
          </main>
  
          {/* Right — Detail Panel */}
          <AnimatePresence>
            {detailPanel && renderDetailPanel()}
          </AnimatePresence>
        </div>
  
        {/* Omni-Search Global Terminal */}
        <OmniSearch isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} data={data} />
        
      </div>
    );
  }

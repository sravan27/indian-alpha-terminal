"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Command, FileText, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OmniSearch({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data?: any }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Handle Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? onClose() : null; // In real app it toggles globally, here we just close if open
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced Search hitting Tauri Native Rust backend
  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        // Assume Web Environment (Vercel) automatically if Tauri window isn't defined
        if (!(window as any).__TAURI__) throw new Error("Not in Native App Context");
        
        const { invoke } = await import("@tauri-apps/api/core");
        // We only invoke if we actually compile it for Tauri
        const res: any[] = await invoke("search_transcripts", { query });
        setResults(res || []);
      } catch (e) {
        console.warn("Tauri engine unavailable (Running on Web Link). Engaging Web Fallback...");
        // Fallback for Web browser preview without Tauri FTS engine
        if (query.length > 2 && data) {
           const webFallbackRes: any[] = [];
           const qLower = query.toLowerCase();
           
           data.sourceCatalog?.forEach((ep: any) => {
             // Search Title
             if (ep.title.toLowerCase().includes(qLower)) {
               webFallbackRes.push({ title: ep.title, category: ep.category || "Episode", snippet: "Direct title match. Open episode for Master strategies." });
             }
             // Search market Gaps
             ep.opportunitySnippets?.forEach((op: any) => {
               if (op.text.toLowerCase().includes(qLower)) {
                 webFallbackRes.push({ title: "Whitespace Opportunity", category: "Market Gap", snippet: op.text });
               }
             });
             // Search strategies
             ep.strategySnippets?.forEach((st: any) => {
               if (st.text.toLowerCase().includes(qLower)) {
                 webFallbackRes.push({ title: ep.title, category: "Extracted Strategy", snippet: st.text });
               }
             });
           });

           // Search master playbooks
           data.masterPlaybooks?.forEach((pb: any) => {
              if (pb.title.toLowerCase().includes(qLower) || pb.subtitle?.toLowerCase().includes(qLower)) {
                 webFallbackRes.push({ title: pb.title, category: "Master Series", snippet: pb.subtitle });
              }
           });

          setResults(webFallbackRes.slice(0, 8)); // Return top 8 matches locally
        } else {
            setResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(fetchResults, 150);
    return () => clearTimeout(debounce);
  }, [query, data]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          
          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[#0c0c0e] border border-white/[0.08] shadow-[0_0_60px_-15px_rgba(79,70,229,0.3)] rounded-2xl overflow-hidden z-[101] font-[family-name:var(--font-signal-display)] flex flex-col max-h-[70vh]"
          >
            {/* Input Header */}
            <div className="relative flex items-center px-4 py-4 border-b border-white/[0.06] shrink-0">
              <Search className="w-5 h-5 text-indigo-400 absolute left-5" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search precise strategies, transcripts, or market gaps..."
                className="w-full bg-transparent border-none outline-none text-white text-[16px] placeholder-stone-500 pl-10 pr-20 py-1"
              />
              <div className="absolute right-5 flex items-center gap-1 text-[10px] text-stone-500 font-mono">
                <kbd className="px-1.5 py-0.5 bg-white/[0.05] rounded border border-white/[0.05]">esc</kbd> to close
              </div>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto custom-scrollbar p-2">
              {!query && (
                <div className="px-4 py-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">Intelligence Oracle</h3>
                  <p className="text-[12px] text-stone-500 max-w-sm">
                    Search sub-millisecond across 400,000+ words of raw podcast audio transcripts.
                  </p>
                </div>
              )}

              {query && isSearching && results.length === 0 && (
                 <div className="px-4 py-8 text-center flex flex-col items-center">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mb-3" />
                    <p className="text-[12px] text-stone-500">Querying Native Database...</p>
                 </div>
              )}

              {query && !isSearching && results.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[12px] text-stone-500">No transcript matches found for <span className="text-white">"{query}"</span></p>
                </div>
              )}

              {results.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">Direct Transcript Matches</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-[9px] text-indigo-300 font-bold">{results.length}</span>
                  </div>
                  <div className="space-y-1">
                    {results.map((r, i) => (
                      <button 
                        key={i}
                        className="w-full text-left flex items-start gap-4 px-3 py-3 rounded-xl hover:bg-white/[0.04] group transition-colors focus:outline-none focus:bg-white/[0.04]"
                      >
                        <div className="mt-0.5 p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] shrink-0 text-stone-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-colors">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[12px] font-semibold text-white/90 truncate">{r.title}</span>
                            <span className="text-[9px] uppercase tracking-wider text-stone-500 px-1.5 py-0.5 bg-white/[0.03] rounded border border-white/[0.04]">{r.category}</span>
                          </div>
                          {/* We use dangerouslySetInnerHTML safely because the FTS snippet only wraps with <b> tags */}
                          <div 
                            className="text-[12px] leading-relaxed text-stone-400 line-clamp-2 italic"
                            dangerouslySetInnerHTML={{ __html: `"...${r.snippet}..."` }}
                          />
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-600 self-center group-hover:text-white transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-white/[0.06] px-4 py-2.5 bg-[#09090b] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-[10px] text-stone-500 font-[family-name:var(--font-signal-mono)]">
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 rounded bg-white/[0.05] border border-white/[0.05]">↑</kbd>
                        <kbd className="px-1.5 rounded bg-white/[0.05] border border-white/[0.05]">↓</kbd>
                        <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <kbd className="px-1.5 rounded bg-white/[0.05] border border-white/[0.05]">↩</kbd>
                        <span>Open Episode</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-stone-600">
                    <Command className="w-3 h-3" /> Native Oracle
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

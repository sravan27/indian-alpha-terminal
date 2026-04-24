"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User, X, Send, Sparkles, BookOpen } from "lucide-react";
import brainData from "@/data/project-signal-brain.json";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_QUERIES = [
  "How to build a D2C brand in India?",
  "What did Aman Gupta say about boAt?",
  "D2C tools for founders",
  "Give me the fundraising playbook",
  "What are the biggest market gaps?",
  "Compare Nikhil vs Shantanu",
  "Health tools for founders",
  "Who are the cross-show guests?",
];

export function CopilotChat({ isOpen, onClose, initialContextNode }: { isOpen: boolean; onClose: () => void; initialContextNode?: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (msg?: string) => {
    const text = msg || input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Offline Native Tauri Database Query
      const { invoke } = await import('@tauri-apps/api/core');
      const results: any[] = await invoke('search_transcripts', { query: text });
      
      let responseText = "";
      if (results && results.length > 0) {
        responseText = "### Verified Transcripts Found:\n\n";
        results.forEach((r) => {
          responseText += `**${r.title} (${r.category})**\n> "...${r.snippet}..."\n\n`;
        });
      } else {
        responseText = "I searched 320,000+ words in the offline intelligence base but couldn't find a direct audio transcript match for that. Try phrasing it differently.";
      }
      
      const resp: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: responseText };
      setMessages(prev => [...prev, resp]);
    } catch (err) {
      console.error(err);
      // Fallback for purely web runs without Tauri Backend
      const resp: Message = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: `Warning: You are running this in a web browser without the local Tauri Rust backend connected. Please run the compiled local executable or \`npm run tauri dev\` to access the Offline SQLite Native Brain.`
      };
      setMessages(prev => [...prev, resp]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] z-50 flex flex-col bg-[#09090b] border-l border-white/[0.06] shadow-2xl">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#09090b]/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-white">Alpha Copilot</h3>
            <p className="text-[9px] text-emerald-400 font-medium tracking-wide">100% OFFLINE • {(brainData as any).sourceCatalog.length} episodes indexed</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/5 text-stone-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-[14px] font-semibold text-white mb-1">Ask the Alpha Brain</h3>
            <p className="text-[11px] text-stone-500 mb-6 leading-relaxed">
              Search across 36 episodes from Nikhil Kamath & Shantanu Deshpande. Ask about strategies, market gaps, guests, or request synthesized playbooks.
            </p>
            <div className="w-full space-y-2">
              {SUGGESTED_QUERIES.map((q, i) => (
                <button key={i} onClick={() => handleSend(q)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-stone-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tr-sm' : 'bg-indigo-500/[0.06] border border-indigo-500/10 rounded-2xl rounded-tl-sm'} px-3.5 py-2.5`}>
              <div className="text-[12px] leading-relaxed text-stone-200 whitespace-pre-wrap [&>h3]:text-[13px] [&>h3]:font-bold [&>h3]:text-indigo-300 [&>h3]:mt-2 [&>h3]:mb-1 [&>b]:text-indigo-200"
                dangerouslySetInnerHTML={{ __html: m.content
                  .replace(/^### (.*)$/gm, '<h3>$1</h3>')
                  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                  .replace(/^---$/gm, '<hr class="border-white/5 my-3" />')
                }} 
              />
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-stone-400" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="bg-indigo-500/[0.06] border border-indigo-500/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-indigo-500/30 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about strategies, guests, market gaps…"
            className="flex-1 bg-transparent text-[12px] placeholder-stone-600 focus:outline-none text-white"
          />
          <button onClick={() => handleSend()} className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-30" disabled={!input.trim()}>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== Intelligence Engine ======

function generateResponse(query: string): string {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const brain = brainData as any;

  // 1. Check for tools/resources queries
  if (q.includes("tool") || q.includes("resource") || q.includes("build") || q.includes("start")) {
    // Find category-specific tools
    const toolCats = brain.founderToolsByCategory || {};
    let matchedCat = "";
    for (const cat of Object.keys(toolCats)) {
      if (words.some(w => cat.toLowerCase().includes(w))) {
        matchedCat = cat;
        break;
      }
    }
    if (matchedCat && toolCats[matchedCat]?.length > 0) {
      let resp = `### Founder Tools for ${matchedCat}\nReal, verified tools to start building:\n\n`;
      toolCats[matchedCat].forEach((t: any) => {
        resp += `**${t.name}**\n${t.description}\n🔗 ${t.url}\n\n`;
      });
      return resp;
    }
  }

  // 2. Check for playbook requests
  if (q.includes("playbook") || q.includes("how to") || q.includes("guide") || q.includes("steps")) {
    const matchedPb = brain.masterPlaybooks?.find((pb: any) => 
      words.some(w => pb.title.toLowerCase().includes(w) || pb.subtitle.toLowerCase().includes(w))
    );
    if (matchedPb) {
      let resp = `### ${matchedPb.title}\n${matchedPb.subtitle}\n\n`;
      matchedPb.steps.forEach((s: any) => {
        resp += `**${s.step}. ${s.title}**\n${s.detail}\n\n`;
      });
      if (matchedPb.resources?.length) {
        resp += `---\n**Founder Tools:**\n`;
        matchedPb.resources.forEach((r: any) => resp += `• **${r.name}** — ${r.description}\n`);
      }
      return resp;
    }
  }

  // 3. Check for guest-specific queries
  const guestMatch = brain.guestNetwork?.find((g: any) => 
    g.name.toLowerCase().split(" ").some((part: string) => words.includes(part.toLowerCase()))
  );
  if (guestMatch) {
    let resp = `### ${guestMatch.name}\n`;
    resp += `Appeared in ${guestMatch.episodeCount} episode${guestMatch.episodeCount > 1 ? 's' : ''}`;
    if (guestMatch.isCrossShow) resp += ` (★ Cross-show guest)`;
    resp += `\n\n`;
    
    guestMatch.episodeIds.forEach((epId: string) => {
      const ep = brain.sourceCatalog.find((e: any) => e.id === epId);
      if (ep) {
        resp += `**${ep.title}**\n`;
        if (ep.opportunitySnippets?.[0]) {
          resp += `Market Gap: ${ep.opportunitySnippets[0].text}\n`;
        }
        if (ep.strategySnippets?.[0]) {
          resp += `Key Insight: ${ep.strategySnippets[0].text}\n`;
        }
        resp += `\n`;
      }
    });
    
    if (guestMatch.coGuests?.length > 0) {
      resp += `**Co-appeared with:** ${guestMatch.coGuests.slice(0,5).join(", ")}`;
    }
    return resp;
  }

  // 4. Check for comparison queries
  if (q.includes("compare") || q.includes("vs") || q.includes("difference")) {
    const nikhilEps = brain.sourceCatalog.filter((e: any) => e.creatorId === "nikhil-kamath");
    const shantanuEps = brain.sourceCatalog.filter((e: any) => e.creatorId === "shantanu-deshpande");
    
    let topicWord = words.find(w => !["compare", "nikhil", "shantanu", "between", "difference"].includes(w));
    
    let resp = `### Nikhil vs Shantanu${topicWord ? ` on ${topicWord}` : ''}\n\n`;
    resp += `**WTF with Nikhil Kamath** (${nikhilEps.length} episodes)\n`;
    resp += `Focus: Sector deep-dives with industry leaders. Each episode unpacks a specific industry (EV, Real Estate, AI, Health) with founders who built in that space.\n\n`;
    resp += `**The BarberShop with Shantanu** (${shantanuEps.length} episodes)\n`;
    resp += `Focus: Operator-grade founder conversations. Deep into psychology, wealth, M&A, and the personal journey of building durable brands.\n\n`;
    resp += `---\n**Key Difference:** Nikhil goes wide (${nikhilEps.length} different sectors) while Shantanu goes deep (founder psychology and operator playbooks).\n`;
    resp += `**Overlap:** Both cover D2C brand building, venture capital, and the founder journey — but from complementary angles.`;
    return resp;
  }

  // 5. Check for market gap queries
  if (q.includes("market gap") || q.includes("opportunity") || q.includes("whitespace")) {
    let resp = `### Top Market Gaps from the Podcast Corpus\n\n`;
    const gaps: string[] = [];
    brain.sourceCatalog.forEach((ep: any) => {
      if (ep.opportunitySnippets?.[0]) {
        gaps.push(`**${ep.category}:** ${ep.opportunitySnippets[0].text} _(${ep.title.slice(0,50)}…)_`);
      }
    });
    gaps.slice(0, 8).forEach(g => resp += `• ${g}\n\n`);
    return resp;
  }

  // 6. Check for cross-show guest query
  if (q.includes("cross") || q.includes("both show")) {
    const crossGuests = brain.crossShowGuests || [];
    if (crossGuests.length > 0) {
      let resp = `### Cross-Show Guests\nThese guests appeared on BOTH Nikhil's WTF and Shantanu's BarberShop:\n\n`;
      crossGuests.forEach((name: string) => {
        const g = brain.guestNetwork.find((gn: any) => gn.name === name);
        if (g) {
          resp += `**${name}** — ${g.episodeCount} episodes across ${g.shows.join(" & ")}\n`;
        }
      });
      return resp;
    }
  }

  // 7. General episode search
  const scored: { ep: any; score: number }[] = [];
  brain.sourceCatalog.forEach((ep: any) => {
    let score = 0;
    if (ep.title.toLowerCase().includes(q)) score += 15;
    words.forEach((w: string) => {
      if (ep.title.toLowerCase().includes(w)) score += 4;
      if (ep.category?.toLowerCase().includes(w)) score += 5;
      if (ep.tags?.some((t: string) => t.toLowerCase().includes(w))) score += 3;
      if (ep.resourceString?.toLowerCase().includes(w)) score += 2;
      ep.strategySnippets?.forEach((s: any) => { if (s.text.toLowerCase().includes(w)) score += 1; });
      ep.opportunitySnippets?.forEach((s: any) => { if (s.text.toLowerCase().includes(w)) score += 2; });
      ep.guests?.forEach((g: string) => { if (g.toLowerCase().includes(w)) score += 3; });
    });
    if (score > 0) scored.push({ ep, score });
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  if (top.length > 0 && top[0].score > 2) {
    const best = top[0].ep;
    let resp = `### ${best.title}\n\n`;
    
    if (best.opportunitySnippets?.[0]) {
      resp += `**Market Gap:**\n${best.opportunitySnippets[0].text}\n\n`;
    }
    if (best.strategySnippets?.length > 0) {
      resp += `**Framework:**\n`;
      best.strategySnippets.forEach((s: any, i: number) => resp += `${i+1}. ${s.text}\n`);
    }
    if (best.guests?.length > 0) {
      resp += `\n**Guests:** ${best.guests.join(", ")}\n`;
    }
    // Add founder tools for this category
    if (best.founderTools?.length > 0) {
      resp += `\n---\n**🛠 Founder Tools for ${best.category}:**\n`;
      best.founderTools.slice(0, 3).forEach((t: any) => resp += `• **${t.name}** — ${t.description}\n`);
    }
    if (top.length > 1) {
      resp += `\n---\n**Also relevant:**\n`;
      top.slice(1).forEach(m => resp += `• ${m.ep.title}\n`);
    }
    return resp;
  }

  return `I searched all ${brain.sourceCatalog.length} indexed episodes but couldn't find a strong match for "${query}". Try asking about:\n\n• **D2C brands** or **e-commerce**\n• **venture capital** or **fundraising**\n• **health** or **longevity**\n• A specific guest like **Aman Gupta** or **Vineeta Singh**\n• **tools** for a category (e.g., "D2C tools", "health tools")\n• Or request a **playbook** (e.g., "D2C playbook")`;
}

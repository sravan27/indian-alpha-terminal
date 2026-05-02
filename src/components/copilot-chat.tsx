"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, User, X, Send, Sparkles } from "lucide-react";
import { searchTranscripts, detectNative } from "@/lib/tauri-client";
import type { BrainData, Episode, GuestNode, MasterPlaybook } from "@/lib/brain-types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_QUERIES = [
  "Map the D2C playbook for India",
  "Show me the verified Brand Building playbook",
  "Government capital rails for Indian founders",
  "What did Aman Gupta say about boAt?",
  "Compare Nikhil and Shantanu's worldview",
  "Cross-show guests across both shows",
];

export function CopilotChat({
  isOpen,
  onClose,
  data,
  onSelectEpisode,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: BrainData;
  onSelectEpisode?: (videoId: string) => void;
}) {
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
    const text = (msg || input).trim();
    if (!text) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Concurrently: native FTS query against the SQLite index AND a structured
    // synthesis from the curated brain JSON. Combine them deterministically so
    // the answer is grounded in BOTH the raw transcript and the curated layer.
    const [native, synthesised] = await Promise.all([
      searchTranscripts(text, 4),
      Promise.resolve(synthesise(text, data)),
    ]);

    const sections: string[] = [];
    if (synthesised) sections.push(synthesised);
    if (native.length > 0) {
      const lines = ["", "### Verified Transcript Excerpts", ""];
      native.forEach((r) => {
        lines.push(`**${r.title}** _· ${r.category}_`);
        lines.push(`> ${r.snippet.replace(/<\/?mark>/g, "**")}`);
        lines.push("");
      });
      sections.push(lines.join("\n"));
    }
    if (sections.length === 0) {
      sections.push(
        `I searched all ${data.sourceCatalog.length} indexed episodes locally but found nothing for **${text}**. Try a category (D2C, Capital, AI), a guest name, or ask for a playbook.`,
      );
    }

    const reply: Message = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: sections.join("\n"),
    };
    setMessages((prev) => [...prev, reply]);
    setIsTyping(false);
  };

  if (!isOpen) return null;

  const native = detectNative();

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] z-50 flex flex-col bg-[#0a0a0e]/95 border-l border-white/[0.06] shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center glow-accent">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-white tracking-tight">Alpha Copilot</h3>
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-emerald-300/80">
              {native === "native" ? "Native · Local Synthesis" : "Web Edition · JSON Synthesis"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-white/[0.05] text-stone-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <h3 className="text-[14px] font-semibold text-white mb-1 tracking-tight">
              Ask the Sovereign Brain
            </h3>
            <p className="text-[11px] text-stone-500 mb-6 leading-relaxed">
              Cross-references {data.sourceCatalog.length} episodes, {data.guestNetwork.length}{" "}
              operators, {data.masterPlaybooks.length} verified playbooks, and{" "}
              {data.founderLibrary?.sections.reduce((a, s) => a + s.items.length, 0) ?? 0}{" "}
              link-verified founder resources — entirely on this machine.
            </p>
            <div className="w-full space-y-1.5">
              {SUGGESTED_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[11px] text-stone-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-indigo-300" />
              </div>
            )}
            <div
              className={`max-w-[85%] ${
                m.role === "user"
                  ? "bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tr-sm"
                  : "bg-indigo-500/[0.05] border border-indigo-500/15 rounded-2xl rounded-tl-sm"
              } px-3.5 py-2.5`}
            >
              <div
                className="text-[12px] leading-relaxed text-stone-200 whitespace-pre-wrap [&>h3]:text-[13px] [&>h3]:font-semibold [&>h3]:text-indigo-200 [&>h3]:mt-2 [&>h3]:mb-1 [&>b]:text-indigo-100"
                dangerouslySetInnerHTML={{
                  __html: m.content
                    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
                    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
                    .replace(/^---$/gm, '<hr class="border-white/5 my-3" />')
                    .replace(/^> (.*)$/gm, '<div class="pl-3 border-l-2 border-indigo-500/30 my-1.5 italic text-stone-300">$1</div>'),
                }}
              />
              {m.role === "assistant" && onSelectEpisode && extractEpisodeRefs(m.content, data).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {extractEpisodeRefs(m.content, data).map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => onSelectEpisode(ep.id)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 transition-colors"
                    >
                      Open episode →
                    </button>
                  ))}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-stone-300" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-indigo-300" />
            </div>
            <div className="bg-indigo-500/[0.05] border border-indigo-500/15 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-indigo-500/40 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about strategies, guests, market gaps…"
            className="flex-1 bg-transparent text-[12px] placeholder-stone-500 focus:outline-none text-white"
          />
          <button
            onClick={() => handleSend()}
            className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-30"
            disabled={!input.trim()}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Offline synthesis engine
// ---------------------------------------------------------------------------
//
// The brain JSON already contains hand-curated, high-signal intelligence
// (market gaps, strategies, playbooks, guest graph). We don't need a runtime
// LLM for the pitch — what we need is a confident, structured retrieval that
// stitches those pre-extracted pieces into a fluent answer. This function
// runs entirely on-device, in microseconds.

function synthesise(rawQuery: string, brain: BrainData): string | null {
  const q = rawQuery.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  // 1) Founder Library — link-verified curated resources by section
  //    Triggers: capital, government, mca, msme, gst, regulator, books, tooling, etc.
  if (brain.founderLibrary && /\b(capital|government|govt|grant|mca|msme|gst|sebi|rbi|cdsco|fssai|ipo|trademark|register|registration|regulator|fund|funds|book|books|tool|tools|stack|library|resource|community|communities|learning|course|essay|essays)\b/.test(q)) {
    const lib = brain.founderLibrary;
    const matches: { sectionTitle: string; items: { name: string; url: string; description: string }[] }[] = [];
    for (const section of lib.sections) {
      const titleLow = section.title.toLowerCase();
      const subtitleLow = section.subtitle.toLowerCase();
      const sectionMatch = words.some(
        (w) => titleLow.includes(w) || subtitleLow.includes(w),
      );
      const itemHits = section.items.filter((it) =>
        words.some(
          (w) =>
            it.name.toLowerCase().includes(w) ||
            it.description.toLowerCase().includes(w) ||
            it.kind.toLowerCase().includes(w),
        ),
      );
      if (sectionMatch && itemHits.length === 0) {
        matches.push({ sectionTitle: section.title, items: section.items.slice(0, 6) });
      } else if (itemHits.length > 0) {
        matches.push({ sectionTitle: section.title, items: itemHits.slice(0, 6) });
      }
    }
    if (matches.length > 0) {
      const lines: string[] = [];
      matches.slice(0, 3).forEach((m, i) => {
        if (i > 0) lines.push("---");
        lines.push(`### Founder Library · ${m.sectionTitle}`);
        lines.push("");
        m.items.forEach((it) => {
          lines.push(`**${it.name}** — ${it.description}`);
          if (it.url) lines.push(`_${it.url}_`);
          lines.push("");
        });
      });
      lines.push(`_Open the **Library** view (⌘K → /library) for the full ${lib.sections.reduce((a, s) => a + s.items.length, 0)}-resource catalogue._`);
      return lines.join("\n");
    }
  }

  // 1b) Generic "tools" fallthrough — keep original founderToolsByCategory path
  if (
    /\b(tool|tools|stack|resource|build|start|launch)\b/.test(q) &&
    brain.founderToolsByCategory
  ) {
    for (const cat of Object.keys(brain.founderToolsByCategory)) {
      if (words.some((w) => cat.toLowerCase().includes(w))) {
        const tools = brain.founderToolsByCategory[cat];
        if (tools && tools.length) {
          const lines = [`### Founder Stack · ${cat}`, ""];
          tools.forEach((t) => {
            lines.push(`**${t.name}** — ${t.description}`);
            if (t.url) lines.push(`_${t.url}_`);
            lines.push("");
          });
          return lines.join("\n");
        }
      }
    }
  }

  // 2) Playbook requests
  if (/\b(playbook|how to|guide|steps|framework)\b/.test(q)) {
    const matched: MasterPlaybook | undefined = brain.masterPlaybooks?.find((pb) =>
      words.some(
        (w) =>
          pb.title.toLowerCase().includes(w) ||
          pb.subtitle?.toLowerCase().includes(w) ||
          pb.id.toLowerCase().includes(w),
      ),
    );
    if (matched) {
      const lines = [`### ${matched.title}`, matched.subtitle, ""];
      matched.steps.forEach((s) => {
        lines.push(`**${s.step}. ${s.title}**`);
        lines.push(s.detail);
        lines.push("");
      });
      if (matched.resources?.length) {
        lines.push("---", "**Stack:**");
        matched.resources.forEach((r) =>
          lines.push(`• **${r.name}** — ${r.description}`),
        );
      }
      return lines.join("\n");
    }
  }

  // 3) Guest queries
  const guestMatch: GuestNode | undefined = brain.guestNetwork?.find((g) => {
    const parts = g.name.toLowerCase().split(/\s+/);
    return parts.some((p) => words.includes(p));
  });
  if (guestMatch) {
    const lines = [
      `### ${guestMatch.name}`,
      `${guestMatch.episodeCount} verified episode${guestMatch.episodeCount > 1 ? "s" : ""}${guestMatch.isCrossShow ? " · ★ cross-show validator" : ""}`,
      "",
    ];
    guestMatch.episodeIds.forEach((epId) => {
      const ep: Episode | undefined = brain.sourceCatalog.find((e) => e.id === epId);
      if (ep) {
        lines.push(`**${ep.title}**`);
        if (ep.opportunitySnippets?.[0]) {
          lines.push(`> Market gap: ${ep.opportunitySnippets[0].text}`);
        }
        if (ep.strategySnippets?.[0]) {
          lines.push(`> Insight: ${ep.strategySnippets[0].text}`);
        }
        lines.push("");
      }
    });
    if (guestMatch.coGuests?.length) {
      lines.push(`**Co-appeared with:** ${guestMatch.coGuests.slice(0, 5).join(", ")}`);
    }
    return lines.join("\n");
  }

  // 4) Compare creators
  if (/\b(compare|vs|versus|difference|nikhil.*shantanu|shantanu.*nikhil)\b/.test(q)) {
    const nikhil = brain.sourceCatalog.filter((e) => e.creatorId === "nikhil-kamath");
    const shantanu = brain.sourceCatalog.filter((e) => e.creatorId === "shantanu-deshpande");
    return [
      "### Nikhil Kamath vs. Shantanu Deshpande",
      "",
      `**WTF with Nikhil Kamath** · ${nikhil.length} episodes`,
      "Wide-angle sector deep-dives with operators in EV, real estate, AI, health, capital markets.",
      "",
      `**The BarberShop with Shantanu** · ${shantanu.length} episodes`,
      "Operator-grade founder conversations. Psychology, wealth, M&A, durable consumer brands.",
      "",
      `**Edge:** Nikhil goes wide across ${new Set(nikhil.map((e) => e.category)).size} sectors. Shantanu goes deep into founder psychology.`,
    ].join("\n");
  }

  // 5) Market gap roundup
  if (/\b(market gap|opportunity|whitespace|gaps)\b/.test(q)) {
    const lines = ["### Top Market Gaps · Curated Index", ""];
    let count = 0;
    for (const ep of brain.sourceCatalog) {
      if (count >= 8) break;
      const gap = ep.opportunitySnippets?.[0]?.text;
      if (gap) {
        lines.push(`• **${ep.category}** — ${gap}`);
        lines.push(`  _${ep.title.slice(0, 70)}…_`);
        lines.push("");
        count++;
      }
    }
    return lines.join("\n");
  }

  // 6) Cross-show
  if (/\b(cross|both shows?|repeat guest)\b/.test(q)) {
    const cross = brain.crossShowGuests || [];
    if (cross.length === 0) {
      return "### Cross-Show Guests\nNo cross-show validators have been indexed yet — every guest currently sits in a single show's stream.";
    }
    const lines = ["### Cross-Show Guests", "Appeared on **both** WTF and BarberShop:", ""];
    cross.forEach((name) => {
      const g = brain.guestNetwork.find((gn) => gn.name === name);
      if (g) lines.push(`• **${name}** — ${g.episodeCount} episodes across ${g.shows.join(" + ")}`);
    });
    return lines.join("\n");
  }

  // 7) Topic-cluster scoring
  const scored: { ep: Episode; score: number }[] = [];
  brain.sourceCatalog.forEach((ep) => {
    let score = 0;
    if (ep.title.toLowerCase().includes(q)) score += 20;
    words.forEach((w) => {
      if (ep.title.toLowerCase().includes(w)) score += 5;
      if (ep.category?.toLowerCase().includes(w)) score += 6;
      if (ep.tags?.some((t) => t.toLowerCase().includes(w))) score += 3;
      ep.strategySnippets?.forEach((s) => {
        if (s.text.toLowerCase().includes(w)) score += 2;
      });
      ep.opportunitySnippets?.forEach((s) => {
        if (s.text.toLowerCase().includes(w)) score += 3;
      });
      ep.guests?.forEach((g) => {
        if (g.toLowerCase().includes(w)) score += 4;
      });
    });
    if (score > 0) scored.push({ ep, score });
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);
  if (top.length === 0 || top[0].score < 3) return null;

  const best = top[0].ep;
  const lines = [`### ${best.title}`, ""];
  if (best.opportunitySnippets?.[0]) {
    lines.push("**Market Gap:**");
    lines.push(`> ${best.opportunitySnippets[0].text}`);
    lines.push("");
  }
  if (best.strategySnippets?.length) {
    lines.push("**Framework:**");
    best.strategySnippets.slice(0, 4).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.text}`);
    });
    lines.push("");
  }
  if (best.guests?.length) {
    lines.push(`**Operators in the room:** ${best.guests.join(", ")}`);
  }
  if (top.length > 1) {
    lines.push("", "---", "**Also relevant:**");
    top.slice(1).forEach((m) => lines.push(`• ${m.ep.title}`));
  }
  return lines.join("\n");
}

function extractEpisodeRefs(content: string, brain: BrainData) {
  const titles = new Set<string>();
  const re = /\*\*([^*]+?)\*\*/g;
  let m;
  while ((m = re.exec(content)) !== null) titles.add(m[1].trim());
  return brain.sourceCatalog.filter((ep) => titles.has(ep.title)).slice(0, 4);
}

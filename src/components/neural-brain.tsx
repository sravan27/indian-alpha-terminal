"use client";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  Eye,
  EyeOff,
  Filter,
  Focus,
  Link2,
  RotateCcw,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type {
  BrainData,
  Episode,
  GuestNode,
  MasterPlaybook,
  TopicCluster,
} from "@/lib/brain-types";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type NodeKind = "creator" | "category" | "episode" | "playbook" | "guest" | "strategy" | "resource";

type GraphNode = {
  id: string;
  name: string;
  /** sphere size */
  val: number;
  color: string;
  type: NodeKind;
  originalData: unknown;
  /** populated by force-graph at runtime */
  x?: number;
  y?: number;
  z?: number;
};

type GraphLink = {
  source: string;
  target: string;
  color: string;
  /** semantic label that explains why this edge exists */
  kind:
    | "episode-creator"
    | "episode-cluster"
    | "guest-episode"
    | "guest-bridge"
    | "playbook-episode"
    | "playbook-cluster"
    | "co-guest"
    | "strategy-episode"
    | "strategy-cluster"
    | "resource-creator"
    | "resource-cluster";
};

type ToggleState = {
  episodes: boolean;
  guests: boolean;
  playbooks: boolean;
  clusters: boolean;
  /** cross-show only — hide single-show guests + their episodes */
  crossShowOnly: boolean;
  /** show direct guest↔guest edges from episode co-appearances */
  coGuests: boolean;
  /** show top-extracted strategies as their own tier */
  strategies: boolean;
  /** show Founder Library resources anchored to creators / clusters */
  resources: boolean;
};

const DEFAULT_TOGGLES: ToggleState = {
  episodes: true,
  guests: true,
  playbooks: true,
  clusters: true,
  crossShowOnly: false,
  coGuests: false,
  strategies: false,
  resources: false,
};

// Visual identities — each kind has one consistent palette
const KIND: Record<NodeKind, { color: string; ring: string; label: string }> = {
  creator: { color: "#818cf8", ring: "#6366f1", label: "Host" },
  category: { color: "#34d399", ring: "#10b981", label: "Cluster" },
  episode: { color: "#f472b6", ring: "#ec4899", label: "Episode" },
  playbook: { color: "#a78bfa", ring: "#8b5cf6", label: "Verified Playbook" },
  guest: { color: "#94a3b8", ring: "#64748b", label: "Guest" },
  strategy: { color: "#fda4af", ring: "#f43f5e", label: "Strategy" },
  resource: { color: "#7dd3fc", ring: "#0ea5e9", label: "Resource" },
};

const CROSS_SHOW_COLOR = "#fbbf24";

const LINK_COLOR: Record<GraphLink["kind"], string> = {
  "episode-creator": "rgba(99, 102, 241, 0.18)",
  "episode-cluster": "rgba(16, 185, 129, 0.20)",
  "guest-episode": "rgba(148, 163, 184, 0.18)",
  // bright gold — cross-show guest connecting both creators
  "guest-bridge": "rgba(251, 191, 36, 0.55)",
  "playbook-episode": "rgba(167, 139, 250, 0.55)",
  "playbook-cluster": "rgba(167, 139, 250, 0.20)",
  "co-guest": "rgba(244, 114, 182, 0.20)",
  "strategy-episode": "rgba(244, 63, 94, 0.30)",
  "strategy-cluster": "rgba(244, 63, 94, 0.12)",
  "resource-creator": "rgba(14, 165, 233, 0.40)",
  "resource-cluster": "rgba(14, 165, 233, 0.18)",
};

// ---------------------------------------------------------------------------
//  Title cleaner — short, honest, episode-id-aware labels
// ---------------------------------------------------------------------------

function shortEpisodeLabel(ep: Episode): string {
  const t = ep.title;
  // WTF Ep#NN
  const wtf = t.match(/Ep[#.\s]*([0-9]+)/i);
  if (ep.creatorId === "nikhil-kamath" && wtf) {
    const guest = ep.guests?.[0];
    return guest ? `WTF Ep${wtf[1]} · ${guest.split(" ").slice(0, 2).join(" ")}` : `WTF Ep${wtf[1]}`;
  }
  // BarberShop S1Ex
  const s1 = t.match(/S1E([0-9]+)/i);
  if (ep.creatorId === "shantanu-deshpande" && s1) {
    const guest = ep.guests?.[0];
    return guest ? `BS S1E${s1[1]} · ${guest.split(" ").slice(0, 2).join(" ")}` : `BS S1E${s1[1]}`;
  }
  // Fallback — strip ceremony, use first guest if available
  if (ep.guests?.[0]) {
    return `${ep.creatorId === "nikhil-kamath" ? "WTF" : "BS"} · ${ep.guests[0]}`;
  }
  const cleaned = t
    .replace(/^(WTF is |WTF are |WTF does |Full episode\s*\|?\s*)/i, "")
    .replace(/\| Ft\..*$/i, "")
    .replace(/\| S1.*$/i, "")
    .trim()
    .slice(0, 36);
  return cleaned;
}

function shortPlaybookLabel(pb: MasterPlaybook): string {
  // Pull the most distinctive phrase — usually after "WTF is" or "How to"
  const t = pb.title
    .replace(/^(WTF goes into building |WTF is |WTF does |WTF are |WTF |How to |How can )/i, "")
    .replace(/\?$/, "");
  return t.length > 32 ? t.slice(0, 30) + "…" : t;
}

// ---------------------------------------------------------------------------
//  The view
// ---------------------------------------------------------------------------

export function NeuralNetworkMap({
  data,
  activeFilter,
  onNodeSelect,
  searchTerm,
}: {
  data: BrainData;
  activeFilter: string;
  onNodeSelect: (node: GraphNode) => void;
  searchTerm?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [SpriteText, setSpriteText] = useState<any>(null);
  const [toggles, setToggles] = useState<ToggleState>(DEFAULT_TOGGLES);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    import("three-spritetext").then((mod) => {
      setSpriteText(() => mod.default);
    });
  }, []);

  useEffect(() => {
    const parent = document.getElementById("neural-container");
    if (!parent) return;
    const update = () =>
      setDimensions({
        width: parent.clientWidth,
        height: parent.clientHeight || 600,
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // -------------------------------------------------------------------------
  // Build graph data — fully memoised against toggles + filter + searchTerm
  // -------------------------------------------------------------------------
  const fullGraph = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const ids = new Set<string>();
    const add = (n: GraphNode) => {
      if (!ids.has(n.id)) {
        ids.add(n.id);
        nodes.push(n);
      }
    };

    // Hosts — always present
    data.creators.forEach((c) => {
      add({
        id: c.id,
        name: c.show || c.handle,
        val: 60,
        color: KIND.creator.color,
        type: "creator",
        originalData: c,
      });
    });

    // Topic clusters
    if (toggles.clusters) {
      (data.topicClusters || []).forEach((cl) => {
        if (activeFilter && activeFilter !== "All" && cl.category !== activeFilter) return;
        add({
          id: cl.id,
          name: cl.category,
          val: 12 + cl.episodeCount * 4,
          color: KIND.category.color,
          type: "category",
          originalData: cl,
        });
      });
    }

    // Episodes
    const episodeIdsInGraph = new Set<string>();
    if (toggles.episodes) {
      data.sourceCatalog.forEach((ep) => {
        if (activeFilter && activeFilter !== "All" && ep.category !== activeFilter) return;
        episodeIdsInGraph.add(ep.id);
        add({
          id: ep.id,
          name: shortEpisodeLabel(ep),
          val: 11,
          color: KIND.episode.color,
          type: "episode",
          originalData: ep,
        });
        // → host
        links.push({
          source: ep.creatorId,
          target: ep.id,
          color: LINK_COLOR["episode-creator"],
          kind: "episode-creator",
        });
        // → cluster
        if (toggles.clusters) {
          const clusterId = `cluster-${(ep.category || "general").toLowerCase().replace(/[& ]+/g, "-")}`;
          if (ids.has(clusterId)) {
            links.push({
              source: ep.id,
              target: clusterId,
              color: LINK_COLOR["episode-cluster"],
              kind: "episode-cluster",
            });
          }
        }
      });
    }

    // Verified playbooks (8 dossier-grade nodes)
    if (toggles.playbooks) {
      (data.masterPlaybooks || []).forEach((pb) => {
        if (
          activeFilter &&
          activeFilter !== "All" &&
          (pb.category || "").toLowerCase() !== activeFilter.toLowerCase()
        )
          return;
        add({
          id: pb.id,
          name: shortPlaybookLabel(pb),
          val: 18,
          color: KIND.playbook.color,
          type: "playbook",
          originalData: pb,
        });
        // anchor playbook to source episode if it's in the graph
        if (pb.videoId && episodeIdsInGraph.has(pb.videoId)) {
          links.push({
            source: pb.id,
            target: pb.videoId,
            color: LINK_COLOR["playbook-episode"],
            kind: "playbook-episode",
          });
        }
        // also bridge to topic cluster
        if (toggles.clusters && pb.category) {
          const clusterId = `cluster-${pb.category.toLowerCase().replace(/[& ]+/g, "-")}`;
          if (ids.has(clusterId)) {
            links.push({
              source: pb.id,
              target: clusterId,
              color: LINK_COLOR["playbook-cluster"],
              kind: "playbook-cluster",
            });
          }
        }
      });
    }

    // Guests — repeats and cross-show
    if (toggles.guests) {
      (data.guestNetwork || []).forEach((g) => {
        const interesting = g.episodeCount >= 2 || g.isCrossShow;
        if (!interesting) return;
        if (toggles.crossShowOnly && !g.isCrossShow) return;

        // Only add if at least one of their episodes survived filtering
        const visibleEpIds = g.episodeIds.filter((id) => episodeIdsInGraph.has(id));
        if (visibleEpIds.length === 0 && !g.isCrossShow) return;

        const isBridge = g.isCrossShow;
        add({
          id: g.id,
          name: g.name + (isBridge ? "  ★" : ""),
          val: isBridge ? 20 : 7 + g.episodeCount * 2,
          color: isBridge ? CROSS_SHOW_COLOR : KIND.guest.color,
          type: "guest",
          originalData: g,
        });
        visibleEpIds.forEach((epId) => {
          links.push({
            source: g.id,
            target: epId,
            color: isBridge ? LINK_COLOR["guest-bridge"] : LINK_COLOR["guest-episode"],
            kind: isBridge ? "guest-bridge" : "guest-episode",
          });
        });
      });
    }

    // Strategies — each surviving high-signal strategy becomes a node
    //   strategy → its source episode (always)
    //   strategy → its category cluster (if cluster on)
    if (toggles.strategies) {
      const cap = 4;       // top-N strategies per episode (avoid hairball)
      const labelMax = 70; // truncate long lines
      data.sourceCatalog.forEach((ep) => {
        if (!episodeIdsInGraph.has(ep.id)) return;
        const taken = (ep.strategySnippets || []).slice(0, cap);
        taken.forEach((s, i) => {
          const sid = `strategy-${ep.id}-${i}`;
          const text = (s.text || "").trim();
          if (!text) return;
          const short = text.length > labelMax ? text.slice(0, labelMax - 1) + "…" : text;
          add({
            id: sid,
            name: short,
            val: 4,
            color: KIND.strategy.color,
            type: "strategy",
            originalData: { ...s, episodeId: ep.id, episodeTitle: ep.title, category: ep.category },
          });
          links.push({
            source: sid,
            target: ep.id,
            color: LINK_COLOR["strategy-episode"],
            kind: "strategy-episode",
          });
          if (toggles.clusters) {
            const clusterId = `cluster-${(ep.category || "general").toLowerCase().replace(/[& ]+/g, "-")}`;
            if (ids.has(clusterId)) {
              links.push({
                source: sid,
                target: clusterId,
                color: LINK_COLOR["strategy-cluster"],
                kind: "strategy-cluster",
              });
            }
          }
        });
      });
    }

    // Founder Library resources — sky-blue tier, anchored to host (if tagged) + cluster (best-fit)
    //   resource → creator if its `tag` mentions WTF/BarberShop
    //   resource → topic cluster if its kind/section maps cleanly
    if (toggles.resources && data.founderLibrary) {
      const sectionToCluster: Record<string, string> = {
        "Capital · Government rails": "Capital",
        "Capital · Private funds": "Capital",
        "Operator stack": "D2C",
        "Books named on the shows": "Founders",
        "Compliance & sectoral regulators": "Capital",
        "Founder communities": "Founders",
        "Free learning paths": "Founders",
        "Register the company": "Founders",
      };
      data.founderLibrary.sections.forEach((section) => {
        section.items.forEach((item, idx) => {
          const rid = `resource-${section.id}-${idx}`;
          const labelName = item.name.length > 28 ? item.name.slice(0, 26) + "…" : item.name;
          add({
            id: rid,
            name: labelName,
            val: 5,
            color: KIND.resource.color,
            type: "resource",
            originalData: { ...item, sectionTitle: section.title, sectionId: section.id },
          });
          // Anchor to creator if tagged as WTF / BarberShop fund
          const tag = (item.tag || "").toLowerCase();
          if (tag.includes("wtf")) {
            links.push({
              source: rid,
              target: "nikhil-kamath",
              color: LINK_COLOR["resource-creator"],
              kind: "resource-creator",
            });
          } else if (tag.includes("barbershop")) {
            links.push({
              source: rid,
              target: "shantanu-deshpande",
              color: LINK_COLOR["resource-creator"],
              kind: "resource-creator",
            });
          }
          // Anchor to a topic cluster if its section maps to one
          if (toggles.clusters) {
            const targetCat = sectionToCluster[section.title];
            if (targetCat) {
              const clusterId = `cluster-${targetCat.toLowerCase().replace(/[& ]+/g, "-")}`;
              if (ids.has(clusterId)) {
                links.push({
                  source: rid,
                  target: clusterId,
                  color: LINK_COLOR["resource-cluster"],
                  kind: "resource-cluster",
                });
              }
            }
          }
        });
      });
    }

    // Co-guest network — direct guest↔guest links for episode co-appearances
    if (toggles.coGuests) {
      const guestById = new Map<string, GuestNode>();
      (data.guestNetwork || []).forEach((g) => {
        if (g.episodeCount >= 2 || g.isCrossShow) guestById.set(g.id, g);
      });
      const epToGuests = new Map<string, GuestNode[]>();
      guestById.forEach((g) => {
        g.episodeIds.forEach((epId) => {
          if (!episodeIdsInGraph.has(epId)) return;
          if (!epToGuests.has(epId)) epToGuests.set(epId, []);
          epToGuests.get(epId)!.push(g);
        });
      });
      const seen = new Set<string>();
      epToGuests.forEach((gs) => {
        for (let i = 0; i < gs.length; i++) {
          for (let j = i + 1; j < gs.length; j++) {
            const a = gs[i].id;
            const b = gs[j].id;
            const key = a < b ? `${a}|${b}` : `${b}|${a}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (ids.has(a) && ids.has(b)) {
              links.push({
                source: a,
                target: b,
                color: LINK_COLOR["co-guest"],
                kind: "co-guest",
              });
            }
          }
        }
      });
    }

    return { nodes, links };
  }, [data, toggles, activeFilter]);

  // -------------------------------------------------------------------------
  //  Focus mode + search dim — derive the "highlighted" set
  // -------------------------------------------------------------------------
  const highlight = useMemo(() => {
    const matchSet = new Set<string>();
    const q = (searchTerm || "").toLowerCase().trim();

    if (focusId) {
      matchSet.add(focusId);
      fullGraph.links.forEach((l) => {
        const s = typeof l.source === "string" ? l.source : (l.source as { id?: string }).id;
        const t = typeof l.target === "string" ? l.target : (l.target as { id?: string }).id;
        if (s === focusId && t) matchSet.add(t as string);
        if (t === focusId && s) matchSet.add(s as string);
      });
    } else if (q) {
      fullGraph.nodes.forEach((n) => {
        if (n.name.toLowerCase().includes(q)) matchSet.add(n.id);
      });
      // expand to direct neighbours
      const seedIds = new Set(matchSet);
      fullGraph.links.forEach((l) => {
        const s = typeof l.source === "string" ? l.source : (l.source as { id?: string }).id;
        const t = typeof l.target === "string" ? l.target : (l.target as { id?: string }).id;
        if (seedIds.has(s as string) && t) matchSet.add(t as string);
        if (seedIds.has(t as string) && s) matchSet.add(s as string);
      });
    }
    return matchSet;
  }, [focusId, searchTerm, fullGraph]);

  const isDimmed = useCallback(
    (nodeId: string) => highlight.size > 0 && !highlight.has(nodeId),
    [highlight],
  );

  // -------------------------------------------------------------------------
  //  Sprite labels
  // -------------------------------------------------------------------------
  const nodeThreeObject = useCallback(
    (rawNode: object) => {
      if (!SpriteText) return undefined;
      const node = rawNode as GraphNode;
      const dim = isDimmed(node.id);
      const sprite = new SpriteText(node.name);
      sprite.fontFace = "Inter, -apple-system, sans-serif";
      sprite.padding = 2;
      sprite.borderRadius = 3;

      switch (node.type) {
        case "creator":
          sprite.color = "#e0e7ff";
          sprite.textHeight = 6;
          sprite.fontWeight = "bold";
          sprite.backgroundColor = "rgba(99, 102, 241, 0.4)";
          break;
        case "category":
          sprite.color = "#d1fae5";
          sprite.textHeight = 4.4;
          sprite.fontWeight = "bold";
          sprite.backgroundColor = "rgba(16, 185, 129, 0.28)";
          break;
        case "playbook":
          sprite.color = "#ede9fe";
          sprite.textHeight = 3.6;
          sprite.fontWeight = "bold";
          sprite.backgroundColor = "rgba(139, 92, 246, 0.3)";
          break;
        case "episode":
          sprite.color = "#fce7f3";
          sprite.textHeight = 2.7;
          sprite.backgroundColor = "rgba(236, 72, 153, 0.18)";
          break;
        case "guest": {
          const g = node.originalData as GuestNode;
          if (g?.isCrossShow) {
            sprite.color = "#fef3c7";
            sprite.textHeight = 4.2;
            sprite.fontWeight = "bold";
            sprite.backgroundColor = "rgba(251, 191, 36, 0.3)";
          } else {
            sprite.color = "#cbd5e1";
            sprite.textHeight = 3;
            sprite.backgroundColor = "rgba(100, 116, 139, 0.18)";
          }
          break;
        }
        case "strategy":
          sprite.color = "#fecdd3";
          sprite.textHeight = 1.9;
          sprite.backgroundColor = "rgba(244, 63, 94, 0.18)";
          break;
        case "resource":
          sprite.color = "#bae6fd";
          sprite.textHeight = 2.4;
          sprite.backgroundColor = "rgba(14, 165, 233, 0.22)";
          break;
      }

      if (dim) {
        sprite.material.opacity = 0.18;
        sprite.material.transparent = true;
      }
      sprite.position.y = node.val * 0.6 + 3;
      return sprite;
    },
    [SpriteText, isDimmed],
  );

  // -------------------------------------------------------------------------
  //  Click handler — focus mode + bubble up
  // -------------------------------------------------------------------------
  const handleNodeClick = useCallback(
    (rawNode: object) => {
      const node = rawNode as GraphNode;
      // Resource nodes are external URLs — open the URL on click
      if (node.type === "resource") {
        const r = node.originalData as { url?: string };
        if (r.url && typeof window !== "undefined") {
          window.open(r.url, "_blank", "noopener,noreferrer");
        }
      }
      setFocusId((prev) => (prev === node.id ? null : node.id));
      onNodeSelect(node);
      if (fgRef.current) {
        const distance = 180;
        const dist = Math.hypot(node.x || 0, node.y || 0, node.z || 0) || 1;
        const ratio = 1 + distance / dist;
        fgRef.current.cameraPosition(
          {
            x: (node.x || 0) * ratio,
            y: (node.y || 0) * ratio,
            z: (node.z || 0) * ratio,
          },
          node,
          1100,
        );
      }
    },
    [onNodeSelect],
  );

  const resetView = useCallback(() => {
    setFocusId(null);
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 600 }, { x: 0, y: 0, z: 0 }, 900);
    }
  }, []);

  // -------------------------------------------------------------------------
  //  Stats
  // -------------------------------------------------------------------------
  const stats = useMemo(() => {
    const out = {
      nodes: fullGraph.nodes.length,
      links: fullGraph.links.length,
      crossShow: fullGraph.nodes.filter(
        (n) => n.type === "guest" && (n.originalData as GuestNode)?.isCrossShow,
      ).length,
      playbooks: fullGraph.nodes.filter((n) => n.type === "playbook").length,
      bridges: fullGraph.links.filter((l) => l.kind === "guest-bridge").length,
      strategies: fullGraph.nodes.filter((n) => n.type === "strategy").length,
      resources: fullGraph.nodes.filter((n) => n.type === "resource").length,
    };
    return out;
  }, [fullGraph]);

  // -------------------------------------------------------------------------
  //  Render
  // -------------------------------------------------------------------------
  return (
    <div
      id="neural-container"
      className="w-full h-full min-h-[600px] bg-[#050508] relative rounded-2xl overflow-hidden border border-white/5"
    >
      {/* TOP-LEFT: Lens controls */}
      <div className="absolute top-4 left-4 z-10 bg-black/85 backdrop-blur-xl px-3 py-3 rounded-xl border border-white/10 shadow-2xl w-[220px]">
        <h3 className="text-white text-[10px] font-bold uppercase tracking-[0.18em] mb-3 flex items-center gap-2">
          <Compass className="w-3 h-3 text-indigo-300" /> Lens
        </h3>
        <div className="space-y-1">
          <ToggleRow
            label="Episodes"
            count={data.sourceCatalog.length}
            on={toggles.episodes}
            color={KIND.episode.color}
            onClick={() => setToggles({ ...toggles, episodes: !toggles.episodes })}
          />
          <ToggleRow
            label="Guests"
            count={(data.guestNetwork || []).filter((g) => g.episodeCount >= 2 || g.isCrossShow).length}
            on={toggles.guests}
            color={KIND.guest.color}
            onClick={() => setToggles({ ...toggles, guests: !toggles.guests })}
          />
          <ToggleRow
            label="Verified Playbooks"
            count={(data.masterPlaybooks || []).length}
            on={toggles.playbooks}
            color={KIND.playbook.color}
            onClick={() => setToggles({ ...toggles, playbooks: !toggles.playbooks })}
          />
          <ToggleRow
            label="Topic Clusters"
            count={(data.topicClusters || []).length}
            on={toggles.clusters}
            color={KIND.category.color}
            onClick={() => setToggles({ ...toggles, clusters: !toggles.clusters })}
          />
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
          <div className="text-[8.5px] uppercase tracking-[0.18em] text-stone-600 px-2 mb-1 font-bold">Deep layers</div>
          <ToggleRow
            label="Strategies"
            count={data.meta?.totalStrategies ?? 0}
            on={toggles.strategies}
            color={KIND.strategy.color}
            onClick={() => setToggles({ ...toggles, strategies: !toggles.strategies })}
          />
          <ToggleRow
            label="Library Resources"
            count={data.founderLibrary?.sections.reduce((a, s) => a + s.items.length, 0) ?? 0}
            on={toggles.resources}
            color={KIND.resource.color}
            onClick={() => setToggles({ ...toggles, resources: !toggles.resources })}
          />
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
          <div className="text-[8.5px] uppercase tracking-[0.18em] text-stone-600 px-2 mb-1 font-bold">Filters</div>
          <ToggleRow
            label="Cross-show only"
            on={toggles.crossShowOnly}
            color={CROSS_SHOW_COLOR}
            badge={`${data.crossShowGuests?.length ?? 0}`}
            onClick={() => setToggles({ ...toggles, crossShowOnly: !toggles.crossShowOnly })}
            icon={Star}
          />
          <ToggleRow
            label="Co-guest links"
            on={toggles.coGuests}
            color="#f472b6"
            onClick={() => setToggles({ ...toggles, coGuests: !toggles.coGuests })}
            icon={Link2}
          />
        </div>
        <button
          onClick={resetView}
          className="w-full mt-3 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-stone-400 hover:text-white py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.06]"
        >
          <RotateCcw className="w-3 h-3" /> Reset view
        </button>
      </div>

      {/* TOP-RIGHT: Stats + focus indicator */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
        <div className="bg-black/85 backdrop-blur-xl px-3 py-2 rounded-xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] font-semibold flex-wrap">
            <StatChip label="nodes" value={stats.nodes} tone="stone" />
            <StatChip label="edges" value={stats.links} tone="stone" />
            <StatChip label="bridges" value={stats.bridges} tone="amber" />
            <StatChip label="playbooks" value={stats.playbooks} tone="violet" />
            {stats.strategies > 0 && <StatChip label="strategies" value={stats.strategies} tone="rose" />}
            {stats.resources > 0 && <StatChip label="resources" value={stats.resources} tone="sky" />}
          </div>
        </div>
        {focusId && (
          <button
            onClick={() => setFocusId(null)}
            className="bg-amber-500/20 border border-amber-500/40 backdrop-blur-xl px-3 py-1.5 rounded-md text-[10px] uppercase tracking-[0.14em] font-bold text-amber-200 hover:bg-amber-500/30 transition-colors flex items-center gap-1.5"
          >
            <Focus className="w-3 h-3" /> Focused · clear
          </button>
        )}
      </div>

      {/* BOTTOM-LEFT: Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/85 backdrop-blur-xl px-3 py-2.5 rounded-xl border border-white/10 shadow-2xl">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] uppercase tracking-[0.1em] font-semibold max-w-[460px]">
          <Dot color={KIND.creator.color} label="Host" />
          <Dot color={KIND.category.color} label="Cluster" />
          <Dot color={KIND.episode.color} label="Episode" />
          <Dot color={KIND.playbook.color} label="Playbook" />
          <Dot color={KIND.guest.color} label="Guest" />
          <Dot color={CROSS_SHOW_COLOR} label="★ Cross-show" />
          {toggles.strategies && <Dot color={KIND.strategy.color} label="Strategy" />}
          {toggles.resources && <Dot color={KIND.resource.color} label="Resource" />}
        </div>
      </div>

      {/* BOTTOM-RIGHT: Hint */}
      <div className="absolute bottom-4 right-4 z-10 text-[9px] uppercase tracking-[0.16em] text-stone-600 font-medium">
        Click a node to focus its neighbourhood · drag to rotate · scroll to zoom
      </div>

      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={fullGraph}
        nodeLabel={(rawNode: object) => {
          const node = rawNode as GraphNode;
          const meta = KIND[node.type];
          let body = "";
          if (node.type === "episode") {
            const ep = node.originalData as Episode;
            body = `<div style="font-size:11px;color:#a1a1aa;margin-top:6px;">${ep.category} · ${ep.guests?.slice(0, 3).join(", ") || "—"}</div>`;
            if (ep.opportunitySnippets?.[0]?.text) {
              body += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#e2e8f0;line-height:1.45;">${ep.opportunitySnippets[0].text.slice(0, 180)}</div>`;
            }
          } else if (node.type === "guest") {
            const g = node.originalData as GuestNode;
            const tag = g.isCrossShow
              ? `<span style="color:${CROSS_SHOW_COLOR};font-weight:bold;">★ Cross-show validator · </span>`
              : "";
            body = `<div style="font-size:11px;color:#a1a1aa;margin-top:6px;">${tag}${g.episodeCount} episode${g.episodeCount === 1 ? "" : "s"} · ${g.categories?.slice(0, 2).join(", ") || "—"}</div>`;
          } else if (node.type === "category") {
            const cl = node.originalData as TopicCluster;
            body = `<div style="font-size:11px;color:#a1a1aa;margin-top:6px;">${cl.episodeCount} episodes · ${cl.guests?.length ?? 0} operators</div>`;
            if (cl.topStrategies?.[0]) {
              body += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#d1fae5;line-height:1.45;">${cl.topStrategies[0].slice(0, 160)}</div>`;
            }
          } else if (node.type === "playbook") {
            const pb = node.originalData as MasterPlaybook;
            body = `<div style="font-size:11px;color:#a1a1aa;margin-top:6px;">${pb.category ?? ""} · ${pb.creator ?? ""}</div>`;
            if (pb.thesis) {
              body += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#ede9fe;line-height:1.45;">${pb.thesis.slice(0, 200)}</div>`;
            }
          } else if (node.type === "strategy") {
            const s = node.originalData as { text?: string; speaker?: string; episodeTitle?: string; category?: string };
            body = `<div style="font-size:11px;color:#a1a1aa;margin-top:6px;">${s.category ?? "Strategy"}${s.speaker ? " · " + s.speaker : ""}</div>`;
            if (s.text) {
              body += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#fecdd3;line-height:1.45;">${s.text.slice(0, 220)}</div>`;
            }
            if (s.episodeTitle) {
              body += `<div style="margin-top:8px;font-size:10px;color:#71717a;">${s.episodeTitle.slice(0, 80)}</div>`;
            }
          } else if (node.type === "resource") {
            const r = node.originalData as { description?: string; url?: string; sectionTitle?: string; tag?: string; kind?: string };
            body = `<div style="font-size:11px;color:#a1a1aa;margin-top:6px;">${r.sectionTitle ?? "Founder Library"}${r.tag ? " · ★ " + r.tag : ""}</div>`;
            if (r.description) {
              body += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#bae6fd;line-height:1.45;">${r.description.slice(0, 220)}</div>`;
            }
            if (r.url) {
              try {
                const host = new URL(r.url).hostname.replace(/^www\./, "");
                body += `<div style="margin-top:8px;font-size:10px;font-family:'SF Mono',Menlo,monospace;color:#7dd3fc;">${host}</div>`;
              } catch {
                /* ignore */
              }
            }
          }
          return `<div style="padding:10px 12px;background:rgba(9,9,11,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:8px;backdrop-filter:blur(8px);font-family:Inter,sans-serif;max-width:280px;">
            <div style="font-size:10px;font-weight:bold;color:${meta.ring};text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">${meta.label}</div>
            <div style="font-size:13px;font-weight:bold;color:white;line-height:1.3;">${node.name}</div>
            ${body}
          </div>`;
        }}
        nodeColor={(rawNode: object) => {
          const n = rawNode as GraphNode;
          if (isDimmed(n.id)) return "rgba(80, 80, 100, 0.18)";
          return n.color;
        }}
        nodeVal={(rawNode: object) => (rawNode as GraphNode).val}
        nodeOpacity={0.9}
        nodeThreeObject={SpriteText ? nodeThreeObject : undefined}
        nodeThreeObjectExtend={true}
        linkColor={(rawLink: object) => {
          const l = rawLink as GraphLink;
          const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
          const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
          if (highlight.size > 0 && (!highlight.has(s) || !highlight.has(t))) {
            return "rgba(60, 60, 80, 0.06)";
          }
          return l.color;
        }}
        linkWidth={(rawLink: object) => {
          const l = rawLink as GraphLink;
          if (l.kind === "guest-bridge") return 1.6;
          if (l.kind === "playbook-episode") return 1.4;
          return 0.8;
        }}
        linkOpacity={0.7}
        linkDirectionalParticles={(rawLink: object) => {
          const l = rawLink as GraphLink;
          // particles only on the bridges + playbook anchors — actually meaningful
          if (l.kind === "guest-bridge") return 4;
          if (l.kind === "playbook-episode") return 3;
          return 0;
        }}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={(rawLink: object) => {
          const l = rawLink as GraphLink;
          if (l.kind === "guest-bridge") return CROSS_SHOW_COLOR;
          return "rgba(255, 255, 255, 0.7)";
        }}
        backgroundColor="#050508"
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => setFocusId(null)}
        enableNodeDrag={false}
        nodeResolution={24}
        showNavInfo={false}
        warmupTicks={80}
        cooldownTicks={120}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Lens row — toggle for one node kind
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  count,
  on,
  color,
  onClick,
  badge,
  icon: Icon,
}: {
  label: string;
  count?: number;
  on: boolean;
  color: string;
  onClick: () => void;
  badge?: string;
  icon?: typeof Eye;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md transition-colors ${
        on ? "bg-white/[0.06] hover:bg-white/[0.1]" : "hover:bg-white/[0.04]"
      }`}
    >
      <div className="relative w-3 h-3 flex items-center justify-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: on ? color : "transparent", border: `1px solid ${color}` }}
        />
      </div>
      <span
        className={`flex-1 text-[10.5px] uppercase tracking-[0.1em] font-semibold ${
          on ? "text-white" : "text-stone-500"
        }`}
      >
        {label}
      </span>
      {Icon && (
        <Icon
          className={`w-3 h-3 ${on ? "text-white" : "text-stone-600"}`}
          aria-hidden="true"
        />
      )}
      {(count !== undefined || badge) && (
        <span
          className={`text-[9px] tabular-nums font-mono ${
            on ? "text-stone-300" : "text-stone-600"
          }`}
        >
          {badge ?? count}
        </span>
      )}
      {!Icon &&
        (on ? (
          <Eye className="w-3 h-3 text-stone-500" />
        ) : (
          <EyeOff className="w-3 h-3 text-stone-700" />
        ))}
    </button>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "stone" | "amber" | "violet" | "emerald" | "rose" | "sky";
}) {
  const map: Record<string, string> = {
    stone: "text-stone-300",
    amber: "text-amber-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    sky: "text-sky-300",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-stone-600">{label}</span>
      <span className={`font-bold tabular-nums ${map[tone]}`}>{value}</span>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-stone-400">{label}</span>
    </div>
  );
}

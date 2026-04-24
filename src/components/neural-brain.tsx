"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

type Node = {
  id: string;
  name: string;
  val: number;
  color: string;
  type: "creator" | "category" | "episode" | "resource" | "guest";
  originalData?: any;
};

type Link = {
  source: string;
  target: string;
  color?: string;
};

export function NeuralNetworkMap({ 
  data, 
  activeFilter, 
  onNodeSelect,
  searchTerm
}: { 
  data: any; 
  activeFilter: string;
  onNodeSelect: (node: Node) => void;
  searchTerm?: string;
}) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [SpriteText, setSpriteText] = useState<any>(null);

  // Dynamically import SpriteText (it uses THREE which needs window)
  useEffect(() => {
    import("three-spritetext").then(mod => {
      setSpriteText(() => mod.default);
    });
  }, []);

  useEffect(() => {
    const parent = document.getElementById('neural-container');
    if (parent) {
      setDimensions({ width: parent.clientWidth, height: parent.clientHeight || 600 });
      const handleResize = () => {
        setDimensions({ width: parent.clientWidth, height: parent.clientHeight || 600 });
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Smooth auto-rotation
  useEffect(() => {
    if (!fgRef.current) return;
    let angle = 0;
    const distance = 550;
    const interval = setInterval(() => {
      if (fgRef.current) {
        fgRef.current.cameraPosition({
          x: distance * Math.sin(angle),
          z: distance * Math.cos(angle)
        });
        angle += Math.PI / 2400;
      }
    }, 25);
    return () => clearInterval(interval);
  }, [fgRef]);

  const graphData = useMemo(() => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeIds = new Set<string>();

    const addNode = (n: Node) => {
      if (!nodeIds.has(n.id)) {
        nodeIds.add(n.id);
        nodes.push(n);
      }
    };

    // Creators — large hub nodes
    data.creators.forEach((c: any) => {
      addNode({ id: c.id, name: c.show || c.handle, val: 55, color: "#6366f1", type: "creator", originalData: c });
    });

    // Topic clusters — medium nodes
    (data.topicClusters || []).forEach((cl: any) => {
      addNode({ 
        id: cl.id, 
        name: cl.category, 
        val: 8 + cl.episodeCount * 5, 
        color: cl.color || "#10b981", 
        type: "category", 
        originalData: cl 
      });
    });

    // Episodes
    data.sourceCatalog.forEach((ep: any) => {
      const isFilteredOut = activeFilter && activeFilter !== "All" &&
                            activeFilter !== ep.category;
      if (isFilteredOut) return;

      const clusterId = `cluster-${(ep.category || "general").toLowerCase().replace(/[& ]/g, '-')}`;
      
      // Truncate episode name to first meaningful words
      const shortName = ep.title
        .replace(/^(WTF is |WTF are |WTF does |Ep[#.\s]*\d+\s*\|?\s*)/i, '')
        .replace(/\| Ft\..*$/i, '')
        .replace(/\| S1.*$/i, '')
        .trim()
        .slice(0, 30);
      
      addNode({ id: ep.id, name: shortName, val: 10, color: "#ec4899", type: "episode", originalData: ep });
      
      // Episode → Creator
      links.push({ source: ep.creatorId, target: ep.id, color: "rgba(99, 102, 241, 0.12)" });
      
      // Episode → Topic Cluster
      if (nodeIds.has(clusterId)) {
        links.push({ source: ep.id, target: clusterId, color: "rgba(16, 185, 129, 0.2)" });
      }
    });

    // Guests — only those with 2+ appearances or cross-show
    (data.guestNetwork || []).forEach((g: any) => {
      if (g.episodeCount >= 2 || g.isCrossShow) {
        addNode({ 
          id: g.id, 
          name: g.name, 
          val: 5 + g.episodeCount * 3, 
          color: g.isCrossShow ? "#f59e0b" : "#94a3b8", 
          type: "guest", 
          originalData: g 
        });
        
        g.episodeIds.forEach((epId: string) => {
          if (nodeIds.has(epId)) {
            links.push({ source: g.id, target: epId, color: "rgba(245, 158, 11, 0.15)" });
          }
        });
      }
    });

    return { nodes, links };
  }, [data, activeFilter]);

  // Custom node rendering with text labels
  const nodeThreeObject = useCallback((node: any) => {
    if (!SpriteText) return undefined;

    const sprite = new SpriteText(node.name);
    
    // Style based on node type
    switch (node.type) {
      case 'creator':
        sprite.color = '#c7d2fe';
        sprite.textHeight = 6;
        sprite.fontWeight = 'bold';
        sprite.backgroundColor = 'rgba(99, 102, 241, 0.3)';
        sprite.padding = 3;
        sprite.borderRadius = 4;
        break;
      case 'category':
        sprite.color = '#a7f3d0';
        sprite.textHeight = 4.5;
        sprite.fontWeight = 'bold';
        sprite.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        sprite.padding = 2;
        sprite.borderRadius = 3;
        break;
      case 'episode':
        sprite.color = '#fce7f3';
        sprite.textHeight = 2.5;
        sprite.backgroundColor = 'rgba(236, 72, 153, 0.15)';
        sprite.padding = 1.5;
        sprite.borderRadius = 2;
        break;
      case 'guest':
        sprite.color = node.originalData?.isCrossShow ? '#fde68a' : '#cbd5e1';
        sprite.textHeight = 3;
        sprite.backgroundColor = node.originalData?.isCrossShow 
          ? 'rgba(245, 158, 11, 0.2)' 
          : 'rgba(148, 163, 184, 0.1)';
        sprite.padding = 1.5;
        sprite.borderRadius = 2;
        break;
      default:
        sprite.color = '#e2e8f0';
        sprite.textHeight = 2.5;
    }

    sprite.fontFace = 'Inter, -apple-system, sans-serif';
    
    // Position label above the node sphere
    sprite.position.y = node.val * 0.6 + 3;
    
    return sprite;
  }, [SpriteText]);

  const handleNodeClick = useCallback((node: any) => {
    onNodeSelect(node);
    if (fgRef.current) {
      const distance = 150;
      const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
      fgRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node, 
        1500
      );
    }
  }, [onNodeSelect]);

  return (
    <div id="neural-container" className="w-full h-full min-h-[600px] bg-[#050508] relative rounded-2xl overflow-hidden border border-white/5">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-xl p-3 rounded-lg border border-white/10">
        <h3 className="text-white text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5 flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
           Knowledge Graph
        </h3>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> <span className="text-[9px] text-stone-400">Show</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> <span className="text-[9px] text-stone-400">Topic Cluster</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" /> <span className="text-[9px] text-stone-400">Episode</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> <span className="text-[9px] text-stone-400">Cross-Show Guest</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" /> <span className="text-[9px] text-stone-400">Repeat Guest</span></div>
        </div>
        <div className="mt-3 pt-2 border-t border-white/5 text-[9px] text-stone-600">
          Click any node for details
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-xl px-3 py-2 rounded-lg border border-white/10">
        <div className="flex items-center gap-4 text-[10px]">
          <div><span className="text-stone-500">Nodes</span> <span className="text-white font-bold ml-1">{graphData.nodes.length}</span></div>
          <div><span className="text-stone-500">Links</span> <span className="text-white font-bold ml-1">{graphData.links.length}</span></div>
        </div>
      </div>

      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel={(node: any) => {
          let content = `<div style="padding: 10px; background: rgba(9, 9, 11, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; backdrop-filter: blur(8px); font-family: Inter, sans-serif; max-width: 250px;">`;
          if (node.type === "creator") {
             content += `<div style="font-size: 10px; font-weight: bold; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Host Network</div>`;
             content += `<div style="font-size: 14px; font-weight: bold; color: white;">${node.name}</div>`;
             content += `<div style="font-size: 11px; color: #a1a1aa; margin-top: 4px;">Central Intelligence Hub</div>`;
          } else if (node.type === "episode") {
             content += `<div style="font-size: 10px; font-weight: bold; color: #ec4899; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Intelligence Stream</div>`;
             content += `<div style="font-size: 13px; font-weight: bold; color: white; line-height: 1.3;">${node.name}</div>`;
             if (node.originalData?.opportunitySnippets?.[0]) {
                content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #e2e8f0;">${node.originalData.opportunitySnippets[0].text}</div>`;
             }
          } else if (node.type === "guest") {
             content += `<div style="font-size: 10px; font-weight: bold; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Verified Operator</div>`;
             content += `<div style="font-size: 14px; font-weight: bold; color: white;">${node.name}</div>`;
             content += `<div style="font-size: 11px; color: #a1a1aa; margin-top: 4px;">${node.originalData?.episodeCount || 1} Data Points</div>`;
          } else if (node.type === "category") {
             content += `<div style="font-size: 10px; font-weight: bold; color: #10b981; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Market Vector</div>`;
             content += `<div style="font-size: 14px; font-weight: bold; color: white;">${node.name}</div>`;
             content += `<div style="font-size: 11px; color: #a1a1aa; margin-top: 4px;">${node.originalData?.episodeCount || 0} Correlated Episodes</div>`;
             if (node.originalData?.topStrategies?.[0]) {
                content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #d1fae5;">${node.originalData.topStrategies[0]}</div>`;
             }
          }
          content += `</div>`;
          return content;
        }}
        nodeColor={(node: any) => node.color}
        nodeVal={(node: any) => node.val}
        nodeOpacity={0.85}
        nodeThreeObject={SpriteText ? nodeThreeObject : undefined}
        nodeThreeObjectExtend={true}
        linkColor={(link: any) => link.color}
        linkWidth={0.8}
        linkOpacity={0.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => "rgba(255, 255, 255, 0.8)"}
        backgroundColor="#050508"
        onNodeClick={handleNodeClick}
        enableNodeDrag={false}
        nodeResolution={24}
        showNavInfo={false}
        warmupTicks={80}
        cooldownTicks={100}
      />
    </div>
  );
}

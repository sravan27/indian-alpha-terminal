"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Database, ShieldCheck, Cpu } from "lucide-react";
import type { BrainData } from "@/lib/brain-types";
import { compactCount } from "@/lib/intelligence-engine";

/**
 * 1.6-second cold-start sequence. Sets the tone: this is not a web app,
 * it is a piece of local infrastructure that takes a beat to load its
 * own brain. The metrics flash in real-time so the audience sees the
 * scale before anything else.
 *
 * Skippable on click anywhere or after the timer.
 */

interface BootStep {
  label: string;
  icon: typeof Sparkles;
  metric: string;
}

export function BootSequence({
  data,
  onComplete,
}: {
  data: BrainData;
  onComplete: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  const totalWords = data.meta?.totalWordsProcessed ?? 373129;

  const steps: BootStep[] = [
    {
      label: "Loading sovereign index",
      icon: Database,
      metric: `${data.sourceCatalog.length} episodes · ${compactCount(totalWords)} words`,
    },
    {
      label: "Verifying operator graph",
      icon: Cpu,
      metric: `${data.guestNetwork.length} operators · ${data.topicClusters?.length ?? 0} clusters`,
    },
    {
      label: "Sealing offline perimeter",
      icon: ShieldCheck,
      metric: "Zero outbound · 100% local",
    },
  ];

  useEffect(() => {
    const stepDuration = 420;
    const timers: number[] = [];
    steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStepIdx(i), i * stepDuration));
    });
    timers.push(
      window.setTimeout(() => {
        setDone(true);
        window.setTimeout(onComplete, 320);
      }, steps.length * stepDuration + 80),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // steps is constant per mount; we intentionally exclude it from deps
    // to avoid restarting the timer across re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[200] bg-[#06060a] flex items-center justify-center"
          onClick={() => {
            setDone(true);
            window.setTimeout(onComplete, 200);
          }}
        >
          {/* Background hairlines + grid */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-indigo-500/10 blur-[120px] pointer-events-none" />

          <div className="relative w-full max-w-md px-8">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
              className="flex items-center gap-3 mb-10"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-indigo-500 to-violet-600 flex items-center justify-center glow-accent border border-indigo-400/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-[16px] font-semibold tracking-tight text-white leading-none mb-1.5">
                  India Alpha
                </div>
                <div className="text-[9px] text-stone-500 tracking-[0.22em] uppercase font-medium leading-none">
                  Sovereign Intel · Native
                </div>
              </div>
            </motion.div>

            <div className="space-y-3 mb-8">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const active = i === stepIdx;
                const past = i < stepIdx;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.05 * i }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${
                      active
                        ? "border-indigo-500/30 bg-indigo-500/[0.06]"
                        : past
                        ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        active ? "text-indigo-300" : past ? "text-emerald-300" : "text-stone-500"
                      }`}
                    />
                    <span className="flex-1 text-[12px] font-[family-name:var(--font-signal-mono)] text-stone-300">
                      {step.label}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-wide ${
                        past ? "text-emerald-300" : active ? "text-indigo-200" : "text-stone-500"
                      }`}
                    >
                      {past ? "✓ ready" : active ? step.metric : "—"}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Progress hairline */}
            <div className="relative h-px bg-white/[0.04] overflow-hidden rounded-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-violet-400"
              />
            </div>
            <div className="mt-3 text-center text-[9px] tracking-[0.2em] uppercase text-stone-600 font-medium">
              Tap anywhere to skip
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { ProjectSignalApp } from "@/components/project-signal-app";
import brainData from "@/data/project-signal-brain.json";
import type { BrainData } from "@/lib/brain-types";

export default function Home() {
  return <ProjectSignalApp data={brainData as unknown as BrainData} />;
}

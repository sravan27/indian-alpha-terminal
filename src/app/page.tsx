import { ProjectSignalApp } from "@/components/project-signal-app";
import brainData from "@/data/project-signal-brain.json";

export default function Home() {
  return <ProjectSignalApp data={brainData as any} />;
}

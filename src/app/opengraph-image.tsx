import { ImageResponse } from "next/og";
import brain from "@/data/project-signal-brain.json";

export const dynamic = "force-static";
export const revalidate = false;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "India Alpha — sovereign founder intelligence terminal";

export default function OGImage() {
  const meta = (brain as { meta: { indexedEpisodeCount: number; guestCount: number; verifiedPlaybookCount?: number; playbookCount: number; totalLibraryResources?: number } }).meta;
  const episodes = meta.indexedEpisodeCount;
  const operators = meta.guestCount;
  const playbooks = meta.verifiedPlaybookCount ?? meta.playbookCount;
  const resources = meta.totalLibraryResources ?? 71;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #050508 0%, #0a0a14 50%, #1a1030 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Subtle grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Top — eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 18,
            color: "#34d399",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            zIndex: 2,
          }}
        >
          <span>● Built for</span>
          <span style={{ color: "#a8a29e" }}>Nikhil Kamath</span>
          <span style={{ color: "#525252" }}>·</span>
          <span style={{ color: "#a8a29e" }}>Shantanu Deshpande</span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 56,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              color: "#ffffff",
            }}
          >
            India Alpha
          </span>
          <span
            style={{
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#a8a29e",
              marginTop: 16,
              maxWidth: 980,
            }}
          >
            Sovereign founder intelligence — distilled from
            <span style={{ color: "#ffffff" }}> WTF </span>
            and
            <span style={{ color: "#ffffff" }}> The BarberShop</span>.
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 56,
            zIndex: 2,
          }}
        >
          <Stat n={episodes} label="Episodes" tone="#818cf8" />
          <Stat n={playbooks} label="Verified Playbooks" tone="#34d399" />
          <Stat n={operators} label="Operators" tone="#a78bfa" />
          <Stat n={resources} label="Library Resources" tone="#7dd3fc" />
        </div>

        {/* Bottom URL bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 48,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: 22,
              color: "#a8a29e",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            indian-alpha.vercel.app
          </span>
          <span
            style={{
              fontSize: 16,
              color: "#34d399",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            ✓ Link-verified · Hand-curated
          </span>
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.0,
          color: tone,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "#737373",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
}

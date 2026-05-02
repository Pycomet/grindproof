import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const TIER_COLORS: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  purple: "#a855f7",
};

const ALLOWED_TIERS = new Set([
  "Slacking",
  "Warming",
  "Grinding",
  "Locked",
  "Proven",
]);

function clampInt(raw: string | null, min: number, max: number): number {
  const n = Math.floor(Number(raw ?? "0"));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const streak = clampInt(searchParams.get("streak"), 0, 9999);
  const score = clampInt(searchParams.get("score"), 0, 100);
  const tierRaw = searchParams.get("tier") ?? "Slacking";
  const tier = ALLOWED_TIERS.has(tierRaw) ? tierRaw : "Slacking";
  const colorKey = searchParams.get("color") ?? "red";

  const tierColor = TIER_COLORS[colorKey] ?? TIER_COLORS.red;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "monospace",
        }}
      >
        {/* Top-left wordmark */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "48px",
            color: "#ffffff",
            fontSize: "18px",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
          }}
        >
          GrindProof
        </div>

        {/* Bottom-right domain */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "48px",
            color: "#52525b",
            fontSize: "16px",
            fontFamily: "monospace",
          }}
        >
          grindproof.app
        </div>

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Big streak number */}
          <div
            style={{
              color: "#ffffff",
              fontSize: "120px",
              fontWeight: "bold",
              lineHeight: 1,
              fontFamily: "monospace",
            }}
          >
            {`🔥 ${streak}`}
          </div>

          {/* "day streak" label */}
          <div
            style={{
              color: "#a1a1aa",
              fontSize: "28px",
            }}
          >
            day streak
          </div>

          {/* Tier badge pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#18181b",
              border: `1.5px solid ${tierColor}40`,
              borderRadius: "9999px",
              padding: "8px 28px",
              marginTop: "4px",
            }}
          >
            <span
              style={{
                color: tierColor,
                fontSize: "18px",
                fontWeight: "700",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {tier}
            </span>
          </div>

          {/* Accountability score */}
          <div
            style={{
              color: "#d4d4d8",
              fontSize: "20px",
              marginTop: "4px",
            }}
          >
            {`Accountability Score: ${score}`}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}

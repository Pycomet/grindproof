import { NextResponse } from "next/server";
import { getRoastCount } from "@/lib/marketing/roast-count";

export const runtime = "nodejs";
// Cache the response on Vercel's edge for an hour. Spec: "at least once per 24h".
export const revalidate = 3600;

export async function GET() {
  try {
    const result = await getRoastCount();
    return NextResponse.json(
      {
        display: result.display,
        generatedAt: result.generatedAt,
      },
      {
        headers: {
          "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[public/roast-count] failed:", err);
    return NextResponse.json({ display: { mode: "hidden" } }, { status: 200 });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return NextResponse.json(
    {
      key: key ?? null,
      apiHost: "https://us.i.posthog.com",
    },
    {
      headers: {
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

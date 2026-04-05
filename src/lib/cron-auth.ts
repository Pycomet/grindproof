import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { timingSafeEqual } from "crypto";

export function verifyCronSecret(authHeader: string | null): NextResponse | null {
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!authHeader || authHeader.length !== expected.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);

  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // auth passed
}

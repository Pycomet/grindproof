import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

// Evaluated per request so the guard cannot be baked out by prerendering.
export const dynamic = "force-dynamic";

export default function DesignQAPage() {
  if (process.env.NEXT_PUBLIC_QA_MOCK !== "1") redirect("/");

  return <DashboardShell />;
}

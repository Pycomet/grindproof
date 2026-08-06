import DashboardLayout from "@/app/dashboard/layout";

/**
 * Design-QA harness route.
 *
 * Renders the real dashboard against in-memory fixtures so light mode, empty
 * states and breakpoints can be reviewed without a Supabase session. It lives
 * outside `/dashboard` on purpose: the proxy matcher only guards
 * `/dashboard/:path*` and `/auth/:path*` (src/proxy.ts), so this route needs
 * no auth bypass of any kind.
 *
 * Redirects to the landing page unless NEXT_PUBLIC_QA_MOCK=1, so the harness
 * is inert in a normal build. `redirect` rather than `notFound` because a
 * build-time-prerendered `notFound()` was still being served with a 200.
 */
// Evaluated per request rather than at build time, so the guard returns a real
// 404 status instead of a statically prerendered not-found page served as 200.
export const dynamic = "force-dynamic";

export default function DesignQALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

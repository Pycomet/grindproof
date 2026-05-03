"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, MessageCircle, Settings } from "lucide-react";

const TABS = [
  { label: "Today",   href: "/dashboard",          icon: Home          },
  { label: "Score",   href: "/dashboard/stats",     icon: TrendingUp    },
  { label: "Coach",   href: "/dashboard/coach",     icon: MessageCircle },
  { label: "Profile", href: "/dashboard/settings",  icon: Settings      },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
              isActive(tab.href)
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label={tab.label}
          >
            <tab.icon size={22} />
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "orchestration", href: "/orchestration" },
  { label: "sponsor",       href: "/sponsor" },
  { label: "dashboard",     href: "/dashboard" },
];

export default function ConsoleHeader() {
  const pathname = usePathname();
  const isCase = pathname?.startsWith("/case/");

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-[var(--c-line)] bg-[var(--c-bg)]/80">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-6 h-6 border border-[var(--c-accent)] accent flex items-center justify-center mono text-[10px]">
            GS
          </span>
          <span className="mono text-[11px] tracking-[0.18em] uppercase">
            gitsplits<span className="ink-faint">.maestro</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (isCase && item.href === "/sponsor");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mono text-[11px] tracking-wider uppercase px-2.5 py-1 transition-colors ${
                  active ? "accent" : "ink-soft hover:text-[var(--c-ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/agent"
            className="mono text-[11px] tracking-wider uppercase px-2.5 py-1 ink-faint hover:text-[var(--c-ink)] border-l border-[var(--c-line)] ml-1 pl-3"
          >
            contributors →
          </Link>
        </nav>
      </div>
    </header>
  );
}

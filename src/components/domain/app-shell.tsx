"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard", label: "Home", emoji: "🏠" },
  { href: "/map", label: "Lessons", emoji: "🗺️" },
  { href: "/practice", label: "Practice", emoji: "🎯" },
  { href: "/tutor", label: "Tutor", emoji: "🦊" },
  { href: "/plan", label: "Plan", emoji: "📅" },
  { href: "/reports", label: "Reports", emoji: "📈" },
  { href: "/search", label: "Search", emoji: "🔎" },
  { href: "/saved", label: "Saved", emoji: "🔖" },
] as const;

export function AppShell({
  displayName,
  avatar,
  xp,
  streak,
  children,
}: {
  displayName: string;
  avatar: string;
  xp: number;
  streak: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("leo-theme", next ? "dark" : "light");
    } catch {
      /* private mode */
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-craie bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-4 px-4">
          <Link
            href="/dashboard"
            className="font-display text-xl font-bold text-bleu"
            aria-label="Léo — home"
          >
            Léo <span aria-hidden="true">🦊</span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`wiggle-hover flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold transition-all duration-150 ${
                    active
                      ? "bg-bleu text-white shadow-[0_3px_0_rgba(17,38,140,0.9)]"
                      : "text-ink2 hover:-translate-y-0.5 hover:bg-craie/60 hover:text-ink"
                  }`}
                >
                  <span className="wiggle-target" aria-hidden="true">{item.emoji}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className="wiggle-hover inline-flex h-9 items-center gap-1.5 rounded-full border border-brioche/40 bg-brioche/15 px-3 font-mono text-sm font-bold text-ink"
              title="Total XP"
            >
              <span className="wiggle-target" aria-hidden="true">⚡</span>
              <span>
                {xp.toLocaleString()} <span className="sr-only">total </span>XP
              </span>
            </span>
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-groseille/30 bg-groseille/10 px-3 font-mono text-sm font-bold text-ink"
              title={`${streak}-day streak`}
            >
              <span className={streak > 0 ? "flame" : "opacity-50"} aria-hidden="true">🔥</span>
              <span>
                {streak} <span className="sr-only">day streak</span>
              </span>
            </span>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="chunky flex h-11 w-11 items-center justify-center rounded-full border border-craie bg-card text-xl"
                title={displayName}
              >
                <span aria-hidden="true">{avatar || "🙂"}</span>
                <span className="sr-only">Account menu for {displayName}</span>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-card border border-craie bg-card p-2 shadow-card"
                >
                  <p className="px-3 py-2 text-sm font-extrabold">{displayName}</p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={toggleTheme}
                    className="w-full rounded-input px-3 py-2 text-left text-sm font-semibold hover:bg-craie/50"
                  >
                    {dark ? "Switch to light mode" : "Switch to dark mode"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full rounded-input px-3 py-2 text-left text-sm font-semibold text-groseille hover:bg-groseille/10"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

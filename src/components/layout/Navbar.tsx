"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-[var(--color-border)] bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <span className="text-xl font-bold text-[var(--color-primary)]">
                CycloPower
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          {session && (
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/activities"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors font-medium"
              >
                Attività
              </Link>
              <Link
                href="/analytics"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors font-medium"
              >
                Analytics
              </Link>
              <Link
                href="/settings"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors font-medium"
              >
                Impostazioni
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
              >
                Esci
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          {session && (
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md text-[var(--color-text-secondary)]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && session && (
        <div className="sm:hidden border-t border-[var(--color-border)] bg-white">
          <div className="px-4 py-3 space-y-2">
            <Link href="/dashboard" className="block py-2 text-[var(--color-text-secondary)]" onClick={() => setMenuOpen(false)}>Dashboard</Link>
            <Link href="/activities" className="block py-2 text-[var(--color-text-secondary)]" onClick={() => setMenuOpen(false)}>Attività</Link>
            <Link href="/analytics" className="block py-2 text-[var(--color-text-secondary)]" onClick={() => setMenuOpen(false)}>Analytics</Link>
            <Link href="/settings" className="block py-2 text-[var(--color-text-secondary)]" onClick={() => setMenuOpen(false)}>Impostazioni</Link>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="block py-2 text-[var(--color-error)]">Esci</button>
          </div>
        </div>
      )}
    </nav>
  );
}

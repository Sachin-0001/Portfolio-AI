'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkle } from './Icons';

const LINKS = [
  { href: '/#experience', label: 'Experience' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#stack', label: 'Stack' },
  { href: '/#achievements', label: 'Achievements' },
  { href: '/duel', label: 'Duel me' },
];

export default function SiteNav({ resumeUrl }: { resumeUrl: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid ? 'border-b border-line bg-bg/90 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" className="font-mono text-sm tracking-tight text-fg">
          sachin<span className="text-accent">.</span>suresh
        </Link>

        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          {LINKS.map(l => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
          <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg">
            Résumé
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chatbot"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform hover:scale-[1.03]"
          >
            <Sparkle className="h-3.5 w-3.5" />
            <span className="max-[359px]:sr-only">Ask my AI</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-fg hover:bg-white/5 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="animate-fade-up border-t border-line px-5 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {LINKS.map(l => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-3.5 text-base text-fg"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block py-3.5 text-base text-fg"
              >
                Résumé
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

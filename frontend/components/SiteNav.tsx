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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? 'border-b border-line bg-bg/75 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
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

        <Link
          href="/chatbot"
          className="group inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform hover:scale-[1.03]"
        >
          <Sparkle className="h-3.5 w-3.5" />
          Ask my AI
        </Link>
      </nav>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DuelResult, Side } from '@/lib/duel';
import { SIDE_COLOR, firstName } from '@/lib/duel';
import { ArrowRight, Download, Mail, Sparkle } from '@/components/Icons';
import Reveal from '@/components/Reveal';
import FighterCard from './FighterCard';
import RoundCard from './RoundCard';
import RadarChart from './RadarChart';
import SkillsOverlap from './SkillsOverlap';
import TaleOfTheTape from './TaleOfTheTape';
import FightCard, { verdictText } from './FightCard';

const INTRO_MS = 2600;
const ROUND_MS = 3000;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Two "health bars" that grow from the centre as rounds are revealed. */
function Scoreboard({ result, revealed, names }: { result: DuelResult; revealed: number; names: Record<Side, string> }) {
  const shown = result.rounds.slice(0, revealed);
  const avg = (side: Side) => (shown.length ? shown.reduce((sum, r) => sum + r[side].score, 0) / result.rounds.length : 0);
  const wins = (side: Side) => shown.filter(r => r.winner === side).length;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between font-mono text-xs">
        <span style={{ color: SIDE_COLOR.challenger }}>
          {names.challenger} · {wins('challenger')} {wins('challenger') === 1 ? 'round' : 'rounds'}
        </span>
        <span className="text-faint">
          {revealed}/{result.rounds.length}
        </span>
        <span style={{ color: SIDE_COLOR.sachin }}>
          {wins('sachin')} {wins('sachin') === 1 ? 'round' : 'rounds'} · {names.sachin}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(['challenger', 'sachin'] as Side[]).map(side => (
          <div key={side} className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`score-fill h-full rounded-full ${side === 'challenger' ? 'ml-auto' : ''}`}
              style={{ width: `${avg(side)}%`, background: SIDE_COLOR[side] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DuelArena({ result, onRematch }: { result: DuelResult; onRematch: () => void }) {
  const total = result.rounds.length;
  const [reduced] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(reduced ? total : 0);
  const [introDone, setIntroDone] = useState(reduced);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  const names = useMemo<Record<Side, string>>(
    () => ({ challenger: firstName(result.fighters.challenger.name), sachin: 'Sachin' }),
    [result]
  );
  const finished = revealed >= total;
  const verdict = verdictText(result, names);

  // Auto-play: face-off intro, then one round at a time
  useEffect(() => {
    if (finished) return;
    const t = setTimeout(
      () => (introDone ? setRevealed(r => r + 1) : setIntroDone(true)),
      introDone ? (revealed === 0 ? 300 : ROUND_MS) : INTRO_MS
    );
    return () => clearTimeout(t);
  }, [introDone, revealed, finished]);

  useEffect(() => {
    if (finished && !reduced) finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [finished, reduced]);

  const skip = () => {
    setIntroDone(true);
    setRevealed(total);
  };
  const replay = () => {
    setIntroDone(false);
    setRevealed(0);
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  const download = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const opts = { pixelRatio: 1, cacheBust: true, backgroundColor: '#08090b' };
      let url: string;
      try {
        url = await toPng(cardRef.current, opts);
      } catch {
        // A remote avatar without CORS headers can taint the canvas; retry without images
        url = await toPng(cardRef.current, { ...opts, filter: node => (node as HTMLElement).tagName !== 'IMG' });
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = `duel-${names.challenger.toLowerCase()}-vs-sachin.png`;
      a.click();
    } catch (e) {
      console.error('Fight card export failed', e);
    } finally {
      setExporting(false);
    }
  };

  const challengerWon = result.winner === 'challenger';

  return (
    <div>
      {/* Face-off */}
      <section className="relative">
        <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <FighterCard fighter={result.fighters.challenger} side="challenger" corner="Challenger" className="animate-slide-in-left" />
          <div className="flex justify-center">
            <span className="animate-slam inline-block" style={{ animationDelay: '450ms' }}>
              <span className="animate-pulse-ring flex h-20 w-20 items-center justify-center rounded-full border border-line-strong bg-surface font-serif text-4xl italic text-fg">
                vs
              </span>
            </span>
          </div>
          <FighterCard fighter={result.fighters.sachin} side="sachin" corner="Reigning champion" className="animate-slide-in-right" />
        </div>
        <p className="animate-fade-up mx-auto mt-8 max-w-3xl text-center font-serif text-xl italic leading-snug text-fg/90 sm:text-2xl" style={{ animationDelay: '900ms' }}>
          {result.announcer}
        </p>
      </section>

      {/* Controls + scoreboard */}
      <div className="sticky top-16 z-30 mt-10 bg-bg/80 py-3 backdrop-blur-xl">
        <Scoreboard result={result} revealed={revealed} names={names} />
        <div className="mt-2 flex justify-end gap-2">
          {!finished ? (
            <button onClick={skip} className="rounded-full border border-line-strong px-4 py-1.5 text-sm text-fg hover:bg-white/5">
              Skip to result
            </button>
          ) : (
            <button onClick={replay} className="rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:text-fg">
              Replay
            </button>
          )}
        </div>
      </div>

      {/* Rounds */}
      <section className="mt-4 space-y-5">
        {!introDone && (
          <p className="py-10 text-center font-mono text-sm uppercase tracking-[0.3em] text-faint">
            <span className="caret">Get ready…</span>
          </p>
        )}
        {result.rounds.slice(0, revealed).map((r, i) => (
          <RoundCard key={r.key} round={r} index={i} names={names} />
        ))}
      </section>

      {/* Final verdict */}
      {finished && (
        <section ref={finalRef} className="mt-14">
          <div className="card animate-fade-up relative overflow-hidden p-8 text-center sm:p-12">
            <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
            <div aria-hidden className="glow pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[50rem] -translate-x-1/2" />
            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-faint">Final verdict</p>
              <div className={result.decision === 'ko' ? 'animate-shake' : ''} style={{ animationDelay: '600ms' }}>
                <h2
                  className="animate-slam mt-4 font-serif text-6xl italic sm:text-8xl"
                  style={{ color: result.winner === 'draw' ? 'var(--fg)' : SIDE_COLOR[result.winner as Side] }}
                >
                  {verdict.big}
                </h2>
              </div>
              <p className="mt-3 text-muted">{verdict.small}</p>

              <div className="mx-auto mt-8 flex max-w-sm items-center justify-center gap-8 font-mono">
                {(['challenger', 'sachin'] as Side[]).map(side => (
                  <div key={side}>
                    <p className="text-4xl font-medium tabular-nums" style={{ color: SIDE_COLOR[side] }}>
                      {result.totals[side]}
                    </p>
                    <p className="mt-1 text-xs text-faint">{names[side]}</p>
                  </div>
                ))}
              </div>

              <p className="mx-auto mt-8 max-w-xl text-fg">
                {challengerWon
                  ? 'Respect. You beat me fair and square. Sounds like we should be building something together.'
                  : result.winner === 'draw'
                    ? 'Evenly matched. Imagine what we could ship on the same team.'
                    : 'Good fight. Every round is a list of things worth learning next, for both of us.'}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="mailto:sachin.samprit@gmail.com?subject=We%20duelled%20on%20your%20portfolio"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform hover:scale-[1.03]"
                >
                  <Mail className="h-4 w-4" /> Let’s talk
                </a>
                <button
                  onClick={download}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-sm text-fg hover:bg-white/5 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> {exporting ? 'Rendering…' : 'Download fight card'}
                </button>
                <button
                  onClick={onRematch}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:text-fg"
                >
                  Rematch
                </button>
              </div>
            </div>
          </div>

          {/* What each could learn */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(
              [
                ['challenger', `What ${names.challenger} could pick up from Sachin`, result.learn.challenger_from_sachin],
                ['sachin', `What Sachin could pick up from ${names.challenger}`, result.learn.sachin_from_challenger],
              ] as [Side, string, string][]
            ).map(([side, title, body]) => (
              <Reveal key={side} className="card p-6">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: SIDE_COLOR[side] }}>
                  {title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted">{body}</p>
              </Reveal>
            ))}
          </div>

          {/* Breakdown */}
          <div className="mt-20 space-y-16">
            <Reveal>
              <h3 className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-faint">
                <span className="text-accent">01</span> · Shape of the fight
              </h3>
              <div className="card p-6">
                <RadarChart rounds={result.rounds} names={names} />
              </div>
            </Reveal>
            <Reveal>
              <h3 className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-faint">
                <span className="text-accent">02</span> · Skills overlap
              </h3>
              <SkillsOverlap skills={result.skills} names={names} />
            </Reveal>
            <Reveal>
              <h3 className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-faint">
                <span className="text-accent">03</span> · Tale of the tape
              </h3>
              <TaleOfTheTape result={result} names={names} />
              {!result.github_lookup.found && (
                <p className="mt-3 text-sm text-faint">
                  {result.github_lookup.username
                    ? `Couldn't load github.com/${result.github_lookup.username}, so the open-source round scored zero for ${names.challenger}.`
                    : `No GitHub link found on the résumé, so the open-source round scored zero for ${names.challenger}. Add your username and rematch.`}
                </p>
              )}
            </Reveal>
            <Reveal className="text-center">
              <Link href="/chatbot" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
                <Sparkle className="h-4 w-4 text-accent" /> Ask my AI how I’d approach your stack <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* Off-screen source for the PNG export */}
      <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
        <FightCard ref={cardRef} result={result} names={names} />
      </div>
    </div>
  );
}

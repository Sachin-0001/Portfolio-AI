'use client';

import { useEffect, useRef, useState } from 'react';
import SiteNav from '@/components/SiteNav';
import DuelArena from '@/components/duel/DuelArena';
import { Avatar } from '@/components/duel/FighterCard';
import DuelWall from '@/components/duel/DuelWall';
import { ArrowRight, GitHub } from '@/components/Icons';
import { portfolio } from '@/lib/portfolio';
import type { DuelEvent, DuelResult } from '@/lib/duel';

const MAX_MB = 5;
const SACHIN_AVATAR = 'https://avatars.githubusercontent.com/u/168210869?v=4';

type Stage = 'reading' | 'github' | 'judging';
type State =
  | { kind: 'idle' }
  | { kind: 'running'; stage: Stage; username?: string | null }
  | { kind: 'result'; result: DuelResult }
  | { kind: 'error'; message: string };

const STEPS: { stage: Stage; label: (s: State) => string }[] = [
  { stage: 'reading', label: () => 'Reading your résumé' },
  {
    stage: 'github',
    label: s => (s.kind === 'running' && s.username ? `Scouting @${s.username} on GitHub` : 'Looking for your GitHub'),
  },
  { stage: 'judging', label: () => 'Judges deliberating, blind' },
];

async function runDuel(file: File, github: string, onEvent: (e: DuelEvent) => void) {
  const form = new FormData();
  form.append('file', file);
  form.append('github', github);
  const res = await fetch('/api/duel', { method: 'POST', body: form });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? 'The arena is unavailable right now. Please try again shortly.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as DuelEvent;
      if (event.stage === 'done' || event.stage === 'error') finished = true;
      onEvent(event);
    }
    if (done) break;
  }
  if (!finished) throw new Error('The connection dropped mid-fight. Please try again.');
}

function Loading({ state, fileName }: { state: State; fileName: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const current = state.kind === 'running' ? STEPS.findIndex(s => s.stage === state.stage) : 0;

  return (
    <div className="card mx-auto max-w-xl p-8 text-center sm:p-10">
      <div className="flex items-center justify-center gap-6">
        <div className="animate-slide-in-left">
          <Avatar name={fileName.replace(/\.pdf$/i, '') || 'You'} side="challenger" size={64} />
        </div>
        <span className="animate-slam font-serif text-3xl italic text-fg" style={{ animationDelay: '300ms' }}>
          vs
        </span>
        <div className="animate-slide-in-right">
          <Avatar name="Sachin Suresh" url={SACHIN_AVATAR} side="sachin" size={64} />
        </div>
      </div>
      <ol className="mx-auto mt-9 max-w-xs space-y-3 text-left">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.stage} className={`flex items-center gap-3 text-sm ${done || active ? 'text-fg' : 'text-faint'}`}>
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <span className="text-accent">✓</span>
                ) : active ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-faint" />
                )}
              </span>
              {step.label(state)}
              {active && '…'}
            </li>
          );
        })}
      </ol>
      <p className="mt-8 font-mono text-xs text-faint">{seconds}s · usually 10 to 30s · your résumé is never stored</p>
    </div>
  );
}

export default function DuelPage() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [file, setFile] = useState<File | null>(null);
  const [github, setGithub] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Please choose a PDF.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`That file is over ${MAX_MB} MB.`);
      return;
    }
    setFileError('');
    setFile(f);
  };

  const start = async () => {
    if (!file) return;
    setState({ kind: 'running', stage: 'reading' });
    window.scrollTo({ top: 0 });
    try {
      await runDuel(file, github, event => {
        if (event.stage === 'done') setState({ kind: 'result', result: event.result });
        else if (event.stage === 'error') setState({ kind: 'error', message: event.message });
        else setState({ kind: 'running', stage: event.stage, username: event.stage === 'github' ? event.username : undefined });
      });
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong. Please try again.' });
    }
  };

  const reset = () => {
    setState({ kind: 'idle' });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <SiteNav resumeUrl={portfolio.profile.resume_url} />
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 h-[44rem]" />
      <div aria-hidden className="glow pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2" />

      <main className="relative mx-auto max-w-6xl px-5 pb-28 pt-28 sm:px-8 md:pt-32">
        {state.kind === 'result' ? (
          <>
            <DuelArena result={state.result} onRematch={reset} />
            <DuelWall refreshKey={1} highlightId={state.result.shared?.id} />
          </>
        ) : state.kind === 'running' ? (
          <div className="pt-10">
            <Loading state={state} fileName={file?.name ?? ''} />
          </div>
        ) : (
          <>
            <section className="text-center">
              <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.2em] text-faint">
                <span className="text-accent">Portfolio duel</span> · résumé vs résumé
              </p>
              <h1
                className="animate-fade-up mx-auto mt-5 max-w-3xl text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-fg sm:text-6xl"
                style={{ animationDelay: '80ms' }}
              >
                Think you can <span className="font-serif font-normal italic text-accent">out-build</span> me?
              </h1>
              <p className="animate-fade-up mx-auto mt-5 max-w-xl text-lg text-muted" style={{ animationDelay: '160ms' }}>
                Drop your résumé. I’ll pull your GitHub, and an AI panel scores us head to head across five rounds.
              </p>
            </section>

            {state.kind === 'error' && (
              <div className="card mx-auto mt-10 max-w-2xl border-red-400/30 p-5 text-center">
                <p className="text-fg">{state.message}</p>
              </div>
            )}

            <section className="mt-12 grid items-stretch gap-5 lg:grid-cols-[1.25fr_1fr]">
              {/* Upload */}
              <div className="card animate-slide-in-left flex flex-col p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">Challenger</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={e => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragging(false);
                    pick(e.dataTransfer.files[0]);
                  }}
                  className={`mt-4 flex min-h-[13rem] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                    dragging ? 'border-signal bg-signal/5' : file ? 'border-signal/50' : 'border-line-strong hover:border-signal/60'
                  }`}
                >
                  {file ? (
                    <>
                      <span className="font-mono text-xs text-signal">ready</span>
                      <span className="mt-2 max-w-full truncate text-lg text-fg">{file.name}</span>
                      <span className="mt-1 text-sm text-faint">
                        {(file.size / 1024).toFixed(0)} KB · click to swap
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-strong font-mono text-xl text-signal">
                        ↑
                      </span>
                      <span className="mt-4 text-lg text-fg">Drop your résumé here</span>
                      <span className="mt-1 text-sm text-faint">or click to browse · PDF up to {MAX_MB} MB</span>
                    </>
                  )}
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={e => pick(e.target.files?.[0])}
                />
                {fileError && <p className="mt-3 text-sm text-red-300">{fileError}</p>}

                <label className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-bg/40 px-4 py-3 focus-within:border-signal/60">
                  <GitHub className="h-4 w-4 shrink-0 text-faint" />
                  <span className="font-mono text-sm text-faint">github.com/</span>
                  <input
                    value={github}
                    onChange={e => setGithub(e.target.value.trim())}
                    placeholder="optional, we’ll read it from your résumé"
                    aria-label="GitHub username (optional)"
                    maxLength={39}
                    className="min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-faint focus:outline-none sm:text-sm"
                  />
                </label>

                <button
                  onClick={start}
                  disabled={!file}
                  className="group mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-fg px-6 py-3.5 text-sm font-medium text-bg transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-30"
                >
                  Enter the arena
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="mt-4 text-center text-xs leading-relaxed text-faint">
                  Every duel goes on the public wall below: your first name, last initial, headline, GitHub avatar and
                  scores. Your résumé itself is read in memory, then discarded; it is never saved or logged.
                </p>
              </div>

              {/* The champion */}
              <div className="card animate-slide-in-right relative flex flex-col overflow-hidden p-6 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-accent opacity-20 blur-3xl" />
                <p className="relative font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Reigning champion</p>
                <div className="relative mt-5 flex items-center gap-4">
                  <Avatar name="Sachin Suresh" url={SACHIN_AVATAR} side="sachin" size={72} />
                  <div>
                    <h2 className="text-2xl font-medium text-fg">{portfolio.profile.name}</h2>
                    <p className="text-sm text-muted">{portfolio.profile.status}</p>
                  </div>
                </div>
                <ul className="relative mt-6 space-y-2.5 text-sm text-muted">
                  {['Agent runtime built from scratch', 'Contract analyzer with a 299-test CI', 'AI lending platform on AWS Bedrock'].map(x => (
                    <li key={x} className="flex gap-2.5">
                      <span className="text-accent">↳</span>
                      {x}
                    </li>
                  ))}
                </ul>
                <div className="relative mt-auto pt-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">The rounds</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {['Experience', 'Projects', 'Tech arsenal', 'Open source', 'Academics & awards'].map(r => (
                      <span key={r} className="chip">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-16 grid gap-4 md:grid-cols-3">
              {[
                { t: 'Judged blind', b: 'The AI panel sees “Fighter A” and “Fighter B” in random order, with names removed, and one rubric for both.' },
                { t: 'Evidence or it didn’t happen', b: 'Every score cites lines from the résumé. Quotes that aren’t really there get thrown out.' },
                { t: 'Open source by the numbers', b: 'The GitHub round is pure arithmetic: stars, original repos, recent activity, languages.' },
              ].map(x => (
                <div key={x.t} className="card p-6">
                  <h3 className="font-medium text-fg">{x.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{x.b}</p>
                </div>
              ))}
            </section>

            <DuelWall />
          </>
        )}
      </main>
    </div>
  );
}

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
  // 503 = backend still warming up after a cold start: retry quietly (the loader stays on "Reading")
  const deadline = Date.now() + 120_000;
  let res: Response;
  for (;;) {
    res = await fetch('/api/duel', { method: 'POST', body: form });
    if (res.status !== 503 || Date.now() > deadline) break;
    await new Promise(r => setTimeout(r, 3_000));
  }
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
    <div className="card mx-auto max-w-xl px-5 py-8 text-center sm:p-10">
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <div className="animate-slide-in-left">
          <Avatar name={fileName.replace(/\.pdf$/i, '') || 'You'} side="challenger" size={64} />
        </div>
        <span className="animate-slam font-serif text-2xl italic text-fg sm:text-3xl" style={{ animationDelay: '300ms' }}>
          vs
        </span>
        <div className="animate-slide-in-right">
          <Avatar name="Sachin Suresh" url={SACHIN_AVATAR} side="sachin" size={64} />
        </div>
      </div>
      <ol className="mx-auto mt-8 max-w-xs space-y-3 text-left sm:mt-9">
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
              {/* min-w-0 + anywhere: a 39-char GitHub username must wrap, not push the card wider */}
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {step.label(state)}
                {active && '…'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-balance font-mono text-xs leading-relaxed text-faint">
        {seconds}s · usually 10 to 30s · <span className="whitespace-nowrap">your résumé is never stored</span>
      </p>
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

      <main className="relative mx-auto max-w-6xl px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-28 md:pt-32">
        {state.kind === 'result' ? (
          <>
            <DuelArena result={state.result} onRematch={reset} />
            <DuelWall refreshKey={1} highlightId={state.result.shared?.id} />
          </>
        ) : state.kind === 'running' ? (
          <div className="pt-4 sm:pt-10">
            <Loading state={state} fileName={file?.name ?? ''} />
          </div>
        ) : (
          <>
            <section className="text-center">
              <p className="animate-fade-up font-mono text-[11px] uppercase tracking-[0.14em] text-faint sm:text-xs sm:tracking-[0.2em]">
                <span className="text-accent">Portfolio duel</span> · résumé vs résumé
              </p>
              <h1
                className="animate-fade-up mx-auto mt-4 max-w-3xl text-balance text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-fg sm:mt-5 sm:text-5xl md:text-6xl"
                style={{ animationDelay: '80ms' }}
              >
                Think you can <span className="font-serif font-normal italic text-accent">out-build</span> me?
              </h1>
              <p className="animate-fade-up mx-auto mt-4 max-w-xl text-pretty text-base text-muted sm:mt-5 sm:text-lg" style={{ animationDelay: '160ms' }}>
                Drop your résumé. I’ll pull your GitHub, and an AI panel scores us head to head across five rounds.
              </p>
            </section>

            {state.kind === 'error' && (
              <div role="alert" className="card mx-auto mt-8 max-w-2xl border-red-400/30 p-4 text-center sm:mt-10 sm:p-5">
                <p className="text-fg [overflow-wrap:anywhere]">{state.message}</p>
              </div>
            )}

            <section className="mt-8 grid items-stretch gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-[1.25fr_1fr]">
              {/* Upload */}
              <div className="card animate-slide-in-left flex min-w-0 flex-col p-5 sm:p-8">
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
                  className={`mt-4 flex min-h-[10rem] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:min-h-[13rem] sm:px-6 sm:py-10 ${
                    dragging ? 'border-signal bg-signal/5' : file ? 'border-signal/50' : 'border-line-strong hover:border-signal/60'
                  }`}
                >
                  {file ? (
                    <>
                      <span className="font-mono text-xs text-signal">ready</span>
                      <span className="mt-2 max-w-full truncate text-lg text-fg">{file.name}</span>
                      <span className="mt-1 text-sm text-faint">
                        {(file.size / 1024).toFixed(0)} KB · <span className="pointer-coarse:hidden">click</span>
                        <span className="hidden pointer-coarse:inline">tap</span> to swap
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-strong font-mono text-xl text-signal">
                        ↑
                      </span>
                      {/* Phones and tablets can't drag and drop, so they get tap wording instead */}
                      <span className="mt-4 text-lg text-fg pointer-coarse:hidden">Drop your résumé here</span>
                      <span className="mt-1 text-sm text-faint pointer-coarse:hidden">or click to browse · PDF up to {MAX_MB} MB</span>
                      <span className="mt-4 hidden text-lg text-fg pointer-coarse:inline">Choose your résumé PDF</span>
                      <span className="mt-1 hidden text-sm text-faint pointer-coarse:inline">Tap to browse · up to {MAX_MB} MB</span>
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
                {fileError && (
                  <p role="alert" className="mt-3 text-sm text-red-300">
                    {fileError}
                  </p>
                )}

                <label className="mt-5 flex min-h-12 items-center gap-2 rounded-xl border border-line bg-bg/40 px-3 py-3 focus-within:border-signal/60 sm:gap-3 sm:px-4">
                  <GitHub className="h-4 w-4 shrink-0 text-faint" />
                  {/* The prefix leaves too little room for typing below ~400px; the GitHub icon carries the meaning there */}
                  <span className="hidden shrink-0 font-mono text-sm text-faint min-[400px]:inline">github.com/</span>
                  <input
                    value={github}
                    onChange={e => setGithub(e.target.value.trim())}
                    placeholder="username (optional)"
                    aria-label="GitHub username (optional)"
                    aria-describedby="github-hint"
                    maxLength={39}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-faint focus:outline-none sm:text-sm pointer-coarse:text-base"
                  />
                </label>
                <p id="github-hint" className="mt-2 px-1 text-xs text-faint">
                  Leave it blank and we’ll look for it on your résumé.
                </p>

                <button
                  onClick={start}
                  disabled={!file}
                  className="group mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-fg px-6 py-3.5 text-sm font-medium text-bg sm:mt-6 transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-30"
                >
                  Enter the arena
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="mt-4 text-pretty text-left text-xs leading-relaxed text-faint sm:text-center">
                  Every duel goes on the public wall below: your first name, last initial, headline, GitHub avatar and
                  scores. Your résumé itself is read in memory, then discarded; it is never saved or logged.
                </p>
              </div>

              {/* The champion */}
              <div className="card animate-slide-in-right relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-accent opacity-20 blur-3xl" />
                <p className="relative font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Reigning champion</p>
                <div className="relative mt-5 flex items-center gap-4">
                  <Avatar name="Sachin Suresh" url={SACHIN_AVATAR} side="sachin" size={72} />
                  <div className="min-w-0">
                    <h2 className="text-xl font-medium text-fg sm:text-2xl">{portfolio.profile.name}</h2>
                    <p className="text-sm text-muted">{portfolio.profile.status}</p>
                  </div>
                </div>
                <ul className="relative mt-5 space-y-2.5 text-sm text-muted sm:mt-6">
                  {['Agent runtime built from scratch', 'Contract analyzer with a 299-test CI', 'AI lending platform on AWS Bedrock'].map(x => (
                    <li key={x} className="flex gap-2.5">
                      <span className="shrink-0 text-accent">↳</span>
                      <span className="min-w-0">{x}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative mt-auto pt-6 sm:pt-8">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">The rounds</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {['Experience', 'Projects', 'Tech arsenal', 'Open source', 'Academics & achievements'].map(r => (
                      <span key={r} className="chip">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-12 grid gap-4 sm:mt-16 md:grid-cols-3">
              {[
                { t: 'Judged blind', b: 'The AI panel sees “Fighter A” and “Fighter B” in random order, with names removed, and one rubric for both.' },
                { t: 'Evidence or it didn’t happen', b: 'Every score cites lines from the résumé. Quotes that aren’t really there get thrown out.' },
                { t: 'Open source by the numbers', b: 'The GitHub round is pure arithmetic: stars, original repos, recent activity, languages.' },
              ].map(x => (
                <div key={x.t} className="card p-5 sm:p-6">
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

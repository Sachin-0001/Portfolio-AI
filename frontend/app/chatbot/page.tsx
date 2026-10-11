'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowUpRight, Download, Send, SocialIcon, Sparkle } from '@/components/Icons';
import type { Achievement, Experience, Project, SkillGroup, Social } from '@/lib/portfolio';

type Card =
  | { type: 'projects'; data: Project[] }
  | { type: 'skills'; data: string[]; groups?: SkillGroup[] }
  | { type: 'achievements'; data: Achievement[] }
  | { type: 'experience'; data: Experience[] }
  | { type: 'socials'; data: Social[] }
  | { type: 'resume'; data: { filename: string; url: string } };

interface Source {
  id: string;
  type: string;
  title: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  cards?: Card[];
  sources?: Source[];
  isError?: boolean;
}

// Prior turns sent with each question so follow-ups ("how was it tested?") keep their subject
const HISTORY_TURNS = 4;

const GREETING = 'What do you wish to learn about me today?';

const SUGGESTIONS = [
  { label: 'Show me your projects', hint: 'All work, as cards' },
  { label: 'What did you build at Capmob?', hint: 'Lending AI on AWS Bedrock' },
  { label: 'How does Harness work?', hint: 'Agent runtime from scratch' },
  { label: 'What are your skills?', hint: 'The full stack' },
];

const TECH_FACTS = [
  'The first computer bug was an actual moth trapped in a Harvard Mark II in 1947.',
  'Python was named after Monty Python, not the snake.',
  'The Transformer paper, “Attention Is All You Need”, was published in 2017.',
  'Backpropagation was popularised by Rumelhart, Hinton and Williams in 1986.',
  'Git was created by Linus Torvalds in about two weeks.',
  'FAISS can search billions of vectors and was open-sourced by Meta in 2017.',
  'JavaScript was created in just 10 days by Brendan Eich in 1995.',
  'Docker containers share the host kernel, which is why they start so fast.',
];

// While the backend loads its models it answers 503; retry for up to this long.
const WARMUP_MAX_MS = 120_000;
const WARMUP_RETRY_MS = 3_000;
// Only show the cold-start overlay if the backend is actually slow to answer.
const WAKE_THRESHOLD_MS = 2500;
// Characters revealed per animation tick for assistant replies.
const TYPE_CHUNK = 3;
const TYPE_TICK_MS = 12;

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [isWaking, setIsWaking] = useState(false);
  const [wakeSeconds, setWakeSeconds] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const hasAnswered = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const autoAsked = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Greeting typewriter
  useEffect(() => {
    if (greeting.length >= GREETING.length) return;
    const t = setTimeout(() => setGreeting(GREETING.slice(0, greeting.length + 1)), 38);
    return () => clearTimeout(t);
  }, [greeting]);

  // Reveal the latest assistant message a few characters at a time
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (revealed === null || !last || last.role !== 'assistant') return;
    if (revealed >= last.content.length) {
      setRevealed(null);
      return;
    }
    const t = setTimeout(() => setRevealed(r => (r === null ? null : r + TYPE_CHUNK)), TYPE_TICK_MS);
    return () => clearTimeout(t);
  }, [revealed, last]);

  // Cold-start overlay: elapsed timer + rotating facts
  useEffect(() => {
    if (!isWaking) return;
    setWakeSeconds(0);
    const tick = setInterval(() => setWakeSeconds(s => s + 1), 1000);
    const facts = setInterval(() => setFactIndex(i => (i + 1) % TECH_FACTS.length), 4500);
    return () => {
      clearInterval(tick);
      clearInterval(facts);
    };
  }, [isWaking]);

  // Keep the newest content in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: revealed === null ? 'smooth' : 'auto' });
  }, [messages, revealed, isLoading]);

  // Auto-grow the textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || isLoading) return;

      if (text.toLowerCase() === '/about') {
        window.open('/about', '_blank');
        setInput('');
        return;
      }

      const history = messagesRef.current
        .filter(m => !m.isError)
        .slice(-HISTORY_TURNS)
        .map(m => ({ role: m.role, content: m.content }));

      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      const wakeTimer = hasAnswered.current ? null : setTimeout(() => setIsWaking(true), WAKE_THRESHOLD_MS);

      try {
        // 503 = backend still warming up after a cold start: keep the wake overlay up and retry
        const deadline = Date.now() + WARMUP_MAX_MS;
        let response: Response;
        for (;;) {
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history }),
          });
          if (response.status !== 503 || Date.now() > deadline) break;
          setIsWaking(true);
          await new Promise(r => setTimeout(r, WARMUP_RETRY_MS));
        }
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        hasAnswered.current = true;
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.response, cards: data.cards ?? [], sources: data.sources ?? [] },
        ]);
        setRevealed(0);
      } catch (error) {
        console.error('Error calling API:', error);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I couldn’t reach the assistant just now. Please try again in a moment.',
            isError: true,
          },
        ]);
      } finally {
        if (wakeTimer) clearTimeout(wakeTimer);
        setIsWaking(false);
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading]
  );

  // Questions handed over from the landing page: /chatbot?q=...
  useEffect(() => {
    if (autoAsked.current) return;
    autoAsked.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      window.history.replaceState(null, '', '/chatbot');
      send(q);
    }
  }, [send]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-bg">
      {/* Cold-start overlay */}
      {isWaking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 px-5 backdrop-blur-md">
          <div className="card animate-fade-up w-full max-w-md p-8 text-center">
            <div className="relative mx-auto h-14 w-14">
              <div className="absolute inset-0 rounded-full border-2 border-line" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
              <Sparkle className="absolute inset-0 m-auto h-5 w-5 text-accent" />
            </div>
            <h2 className="mt-6 text-lg font-medium text-fg">Waking up the inference server…</h2>
            <p className="mt-1 font-mono text-xs text-faint">cold start · {wakeSeconds}s elapsed · usually under 60s</p>
            <div className="mt-6 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.min(95, (wakeSeconds / 60) * 100)}%` }}
              />
            </div>
            <p key={factIndex} className="animate-fade-up mt-6 text-sm leading-relaxed text-muted">
              <span className="font-mono text-xs text-accent">did you know · </span>
              {TECH_FACTS[factIndex]}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Portfolio</span>
          </Link>
          <div className="text-center">
            <h1 className="font-mono text-sm tracking-[0.25em] text-fg">
              S.A.C.H.I.N<span className="text-accent">_</span>
            </h1>
          </div>
          <Link href="/about" className="rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:text-fg">
            How it works
          </Link>
        </div>
      </header>

      {/* Conversation */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto overflow-x-hidden">
        {isEmpty && (
          <>
            <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
            <div aria-hidden className="glow pointer-events-none absolute -top-56 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2" />
          </>
        )}

        <div className="relative mx-auto max-w-3xl px-5 py-10">
          {isEmpty && (
            <div className="flex min-h-[62vh] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line-strong bg-surface">
                <Sparkle className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mt-7 min-h-[2.5em] max-w-xl text-3xl font-medium tracking-tight text-fg sm:min-h-0 sm:text-4xl">
                {greeting}
                <span className="caret ml-0.5 text-accent">▍</span>
              </h2>
              <p className="mt-3 max-w-md text-muted">
                Grounded in my real experience, projects and résumé. Ask it anything you’d ask in an interview.
              </p>
              <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.label}
                    onClick={() => send(s.label)}
                    className="card card-hover group p-4 text-left"
                  >
                    <span className="flex items-center justify-between gap-3 text-[15px] text-fg">
                      {s.label}
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
                    </span>
                    <span className="mt-1 block font-mono text-xs text-faint">{s.hint}</span>
                  </button>
                ))}
              </div>
              <Link
                href="/duel"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-faint transition-colors hover:text-fg"
              >
                Or skip the questions: <span className="text-accent">challenge me to a résumé duel</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {messages.map((m, i) => {
            const isLatest = i === messages.length - 1;
            const typing = isLatest && m.role === 'assistant' && revealed !== null;
            const shown = typing ? m.content.slice(0, revealed ?? undefined) : m.content;

            if (m.role === 'user') {
              return (
                <div key={i} className="animate-fade-up mb-8 flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-line-strong bg-surface-2 px-5 py-3 leading-relaxed text-fg">
                    {m.content}
                  </p>
                </div>
              );
            }

            return (
              <div key={i} className="animate-fade-up mb-10 flex gap-4">
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    m.isError ? 'border-red-400/30 text-red-300' : 'border-line-strong text-accent'
                  } bg-surface`}
                >
                  <Sparkle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="prose prose-invert max-w-none [overflow-wrap:anywhere] prose-table:block prose-table:overflow-x-auto prose-pre:overflow-x-auto prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-fg prose-h2:mb-3 prose-h2:mt-1 prose-h2:text-2xl prose-h3:mt-6 prose-h3:text-lg prose-p:leading-relaxed prose-p:text-muted prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-strong:font-medium prose-strong:text-fg prose-code:rounded prose-code:bg-surface-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:font-normal prose-code:text-accent prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-line prose-pre:bg-surface prose-blockquote:border-l-accent prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted prose-li:text-muted prose-li:marker:text-faint prose-hr:border-line">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{shown}</ReactMarkdown>
                  </div>
                  {typing && <span className="caret inline-block h-4 w-2 bg-accent/80" />}
                  {!typing && m.cards?.map(card => <CardView key={card.type} data={card} />)}
                  {!typing && !!m.sources?.length && (
                    <div className="mt-5 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-faint">Sources</span>
                      {m.sources.map(s => (
                        <span key={s.id} className="chip" title={s.id}>
                          {s.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="mb-10 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong bg-surface">
                <Sparkle className="h-4 w-4 animate-pulse text-accent" />
              </div>
              <span className="font-mono text-xs text-faint">retrieving context · generating…</span>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-bg">
        <div className="mx-auto max-w-3xl px-5 pb-5 pt-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2 pl-4 transition-colors focus-within:border-accent/60"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about projects, experience, skills…"
              aria-label="Message"
              rows={1}
              disabled={isLoading}
              className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-base leading-relaxed sm:text-[15px] text-fg placeholder:text-faint focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink transition-all hover:scale-105 disabled:scale-100 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-3 text-center font-mono text-[11px] text-faint">
            Hybrid RAG over my portfolio · Groq LLM · type <span className="text-muted">/about</span> for the architecture
          </p>
        </div>
      </div>
    </div>
  );
}

function CardView({ data }: { data: Card }) {
  switch (data.type) {
    case 'projects':
      return (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {data.data.map(p => (
            <a
              key={p.id}
              href={p.link ?? p.github ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`card card-hover group block p-5 ${p.featured ? 'sm:col-span-2' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-fg">{p.name}</h3>
                  {p.tagline && <p className="mt-0.5 font-serif italic text-muted">{p.tagline}</p>}
                </div>
                {(p.link || p.github) && (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tags.map(t => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      );

    case 'skills':
      if (data.groups?.length) {
        return (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.groups.map(g => (
              <div key={g.category} className="card p-5">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{g.category}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.items.map(s => (
                    <span key={s} className="chip text-fg/80">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="mt-5 flex flex-wrap gap-2">
          {data.data.map(s => (
            <span key={s} className="chip text-fg/80">
              {s}
            </span>
          ))}
        </div>
      );

    case 'experience':
      return (
        <div className="mt-5 space-y-3">
          {data.data.map(e => (
            <div key={e.company} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-fg">{e.role}</h3>
                  <p className="text-sm text-muted">
                    {e.company}
                    {e.mode && <span className="text-faint"> · {e.mode}</span>}
                  </p>
                </div>
                <span className="font-mono text-xs text-faint">
                  {e.start_date} – {e.end_date ?? 'Present'}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {(e.highlights ?? [e.description]).map(h => (
                  <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case 'achievements':
      return (
        <ul className="card mt-5 divide-y divide-line">
          {data.data.map(a => (
            <li key={a.title} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-fg">{a.title}</h3>
                <span className="font-mono text-xs text-faint">{a.date}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{a.description}</p>
            </li>
          ))}
        </ul>
      );

    case 'socials':
      return (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {data.data.map(s => (
            <a
              key={s.platform}
              href={s.link}
              target={s.link.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="card card-hover group flex items-center gap-3 p-4"
            >
              <SocialIcon platform={s.platform} className="h-4 w-4 text-muted group-hover:text-fg" />
              <span className="flex-1 text-sm text-fg">{s.platform}</span>
              <ArrowUpRight className="h-4 w-4 text-faint group-hover:text-accent" />
            </a>
          ))}
        </div>
      );

    case 'resume':
      return (
        <div className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-medium text-fg">Résumé</h3>
            <p className="font-mono text-xs text-faint">PDF · {data.data.filename}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={data.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line-strong px-4 py-2 text-sm text-fg transition-colors hover:bg-white/5"
            >
              View
            </a>
            <a
              href={data.data.url}
              download={data.data.filename}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          </div>
        </div>
      );
  }
}

'use client';

import { useEffect, useState } from 'react';

type Kind = 'cmd' | 'guard' | 'think' | 'call' | 'result' | 'memory' | 'done';

const TRACE: { kind: Kind; label: string; detail: string; meta?: string }[] = [
  { kind: 'cmd', label: '$ harness run', detail: '"is it a good weekend for Coorg?"' },
  { kind: 'guard', label: 'safeguard.input', detail: 'pass', meta: '41ms' },
  { kind: 'memory', label: 'memory.recall', detail: '3 episodes · faiss@384d', meta: '8ms' },
  { kind: 'think', label: 'reason', detail: 'step 1/10 → need forecast + travel time' },
  { kind: 'call', label: 'tool.weather', detail: '{ city: "Madikeri" }' },
  { kind: 'result', label: '← 22°C, light rain', detail: '', meta: '190ms' },
  { kind: 'call', label: 'tool.web_search', detail: '"Bangalore to Coorg road status"' },
  { kind: 'result', label: '← 5 results', detail: '', meta: '412ms' },
  { kind: 'guard', label: 'safeguard.output', detail: 'pass', meta: '37ms' },
  { kind: 'done', label: '✓ answer', detail: '2 tool calls · 4 steps', meta: '1.9s' },
];

const KIND_STYLE: Record<Kind, string> = {
  cmd: 'text-fg',
  guard: 'text-signal',
  think: 'text-muted',
  call: 'text-accent',
  result: 'text-muted',
  memory: 'text-signal',
  done: 'text-accent',
};

const KIND_GLYPH: Record<Kind, string> = {
  cmd: '',
  guard: '◇',
  think: '◆',
  call: '→',
  result: ' ',
  memory: '◇',
  done: '',
};

/** A looping, animated agent-loop trace: a nod to the Harness runtime. */
export default function AgentTrace() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Reduced motion: show the whole trace once, no looping.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced && count === TRACE.length) return;
    const delay = reduced ? 0 : count >= TRACE.length ? 3200 : count === 0 ? 600 : 520;
    const t = setTimeout(
      () => setCount(c => (reduced ? TRACE.length : c >= TRACE.length ? 0 : c + 1)),
      delay
    );
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="card relative overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="ml-3 font-mono text-[11px] text-faint">harness · sample agent trace</span>
      </div>
      <ol className="min-h-[19rem] space-y-1.5 px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:text-[13px]">
        {TRACE.slice(0, count).map((line, i) => (
          <li key={i} className="animate-fade-up flex gap-3">
            <span className="w-3 shrink-0 text-faint">{KIND_GLYPH[line.kind]}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className={KIND_STYLE[line.kind]}>{line.label}</span>
              {line.detail && <span className="text-faint"> {line.detail}</span>}
            </span>
            {line.meta && <span className="shrink-0 text-faint">{line.meta}</span>}
          </li>
        ))}
        {count < TRACE.length && (
          <li className="flex gap-3">
            <span className="w-3" />
            <span className="caret inline-block h-4 w-2 bg-accent/80" />
          </li>
        )}
      </ol>
    </div>
  );
}

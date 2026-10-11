'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Send, Sparkle } from './Icons';

const SUGGESTIONS = [
  'What did you build at Capmob?',
  'How does Harness keep its agent safe?',
  'Walk me through UnBind’s RAG pipeline',
];

/** Prompt box that hands the question off to the /chatbot page. */
export default function AskBar() {
  const router = useRouter();
  const [value, setValue] = useState('');

  const go = (q: string) => {
    const text = q.trim();
    router.push(text ? `/chatbot?q=${encodeURIComponent(text)}` : '/chatbot');
  };

  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          go(value);
        }}
        className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface p-2 pl-4 transition-colors focus-within:border-accent/60"
      >
        <Sparkle className="h-4 w-4 shrink-0 text-accent" />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ask anything about my work…"
          aria-label="Ask the portfolio assistant"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-fg sm:text-[15px] placeholder:text-faint focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink transition-transform hover:scale-105"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { DuelWallData, PublicDuel, Side } from '@/lib/duel';
import { SIDE_COLOR, firstName } from '@/lib/duel';
import { Avatar } from './FighterCard';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function ago(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

function verdict(d: PublicDuel) {
  if (d.winner === 'draw') return { text: 'Draw', color: 'var(--fg)' };
  const who = d.winner === 'sachin' ? 'Sachin' : firstName(d.challenger_name);
  return { text: d.decision === 'ko' ? `${who} by K.O.` : `${who} on points`, color: SIDE_COLOR[d.winner as Side] };
}

function DuelRow({ d, highlight }: { d: PublicDuel; highlight: boolean }) {
  const v = verdict(d);
  return (
    <li
      className={`card card-hover flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 ${highlight ? 'animate-fade-up border-signal/60' : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={d.challenger_name} url={d.challenger_avatar} side="challenger" size={44} />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">
            {d.challenger_name}
            {highlight && <span className="ml-2 font-mono text-[11px] text-signal">you</span>}
          </p>
          <p className="truncate text-[13px] text-faint">{d.challenger_headline || 'Challenger'}</p>
        </div>
      </div>

      {/* One pip per round, coloured by who took it */}
      <div className="flex items-center gap-1.5" aria-label="Round winners">
        {d.rounds.map(r => (
          <span
            key={r.key}
            title={`${r.title}: ${r.challenger} vs ${r.sachin}`}
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: r.winner === 'tie' ? 'var(--faint)' : SIDE_COLOR[r.winner] }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <p className="font-mono text-sm tabular-nums">
          <span style={{ color: SIDE_COLOR.challenger }}>{d.challenger_total.toFixed(1)}</span>
          <span className="text-faint"> vs </span>
          <span style={{ color: SIDE_COLOR.sachin }}>{d.sachin_total.toFixed(1)}</span>
        </p>
        <div className="w-32 text-right">
          <p className="truncate text-sm font-medium" style={{ color: v.color }}>
            {v.text}
          </p>
          <p className="font-mono text-[11px] text-faint">{ago(d.created_at)}</p>
        </div>
      </div>
    </li>
  );
}

/** Public history of every duel, with Sachin's overall record. Renders nothing if the wall is off. */
export default function DuelWall({ refreshKey = 0, highlightId }: { refreshKey?: number; highlightId?: string }) {
  const [data, setData] = useState<DuelWallData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/duels?limit=24', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: DuelWallData) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (failed || (data && !data.enabled)) return null;

  const record = data?.record;
  return (
    <section className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
            <span className="text-accent">The wall</span> · recent duels
          </p>
          <h2 className="mt-3 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
            Who’s stepped into the arena
          </h2>
        </div>
        {record && record.total > 0 && (
          <div className="flex gap-2 font-mono text-xs">
            <span className="chip" style={{ color: SIDE_COLOR.sachin }}>Sachin {record.wins} W</span>
            <span className="chip" style={{ color: SIDE_COLOR.challenger }}>Challengers {record.losses} W</span>
            <span className="chip">{record.draws} draws</span>
          </div>
        )}
      </div>

      {!data ? (
        <ul className="mt-6 space-y-3" aria-busy>
          {[0, 1, 2].map(i => (
            <li key={i} className="card h-[76px] animate-pulse" />
          ))}
        </ul>
      ) : data.duels.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-muted">No duels on the wall yet. Be the first.</div>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.duels.map(d => (
            <DuelRow key={d.id} d={d} highlight={d.id === highlightId} />
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-faint">
        Every duel appears here with first name, last initial, headline and scores; never the résumé. Want yours removed?
        Email sachin.samprit@gmail.com.
      </p>
    </section>
  );
}

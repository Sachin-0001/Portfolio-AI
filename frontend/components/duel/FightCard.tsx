import { forwardRef } from 'react';
import type { DuelResult, Side } from '@/lib/duel';
import { SIDE_COLOR } from '@/lib/duel';
import { Avatar } from './FighterCard';

export function verdictText(result: DuelResult, names: Record<Side, string>) {
  if (result.decision === 'draw') return { big: 'Draw', small: 'Too close to call' };
  const winner = names[result.winner as Side];
  return result.decision === 'ko'
    ? { big: 'K.O.', small: `${winner} wins by knockout` }
    : { big: `${winner} wins`, small: 'by decision' };
}

/** The 1200x630 card exported as a PNG. Rendered off-screen; sized for social link previews. */
const FightCard = forwardRef<HTMLDivElement, { result: DuelResult; names: Record<Side, string> }>(function FightCard(
  { result, names },
  ref
) {
  const verdict = verdictText(result, names);
  const sides: Side[] = ['challenger', 'sachin'];

  return (
    <div
      ref={ref}
      style={{ width: 1200, height: 630, background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}
      className="relative overflow-hidden p-14"
    >
      <div aria-hidden className="bg-grid absolute inset-0" />
      <div aria-hidden className="glow absolute -top-60 left-1/2 h-[46rem] w-[70rem] -translate-x-1/2" />
      <div className="relative flex h-full flex-col">
        <p className="font-mono text-base uppercase tracking-[0.3em] text-faint">
          <span className="text-accent">Portfolio duel</span> · sachin.suresh
        </p>

        <div className="mt-10 grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-10">
          {sides.map((side, i) => {
            const f = result.fighters[side];
            const won = result.winner === side;
            const block = (
              <div key={side} className={`flex items-center gap-6 ${i === 1 ? 'flex-row-reverse text-right' : ''}`}>
                <Avatar name={f.name} url={f.github?.avatar_url} side={side} size={128} />
                <div className="min-w-0">
                  <p className="truncate text-4xl font-medium">{f.name}</p>
                  <p className="mt-3 text-7xl font-medium tabular-nums tracking-tight" style={{ color: SIDE_COLOR[side] }}>
                    {result.totals[side]}
                  </p>
                  {won && <p className="mt-2 font-mono text-lg uppercase tracking-[0.2em] text-fg">Winner</p>}
                </div>
              </div>
            );
            return i === 0 ? (
              block
            ) : (
              <div key="vs-and-right" className="contents">
                <div className="text-center">
                  <p className="font-serif text-8xl italic text-fg">vs</p>
                </div>
                {block}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-5 gap-4">
          {result.rounds.map(r => (
            <div key={r.key}>
              <p className="truncate font-mono text-sm text-faint">{r.title}</p>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div style={{ width: `${r.challenger.score / 2}%`, background: SIDE_COLOR.challenger }} />
                <div className="flex-1" />
                <div style={{ width: `${r.sachin.score / 2}%`, background: SIDE_COLOR.sachin }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-end justify-between">
          <p className="font-serif text-6xl italic text-accent">{verdict.big}</p>
          <p className="font-mono text-lg text-muted">{verdict.small} · sachin11105.vercel.app/duel</p>
        </div>
      </div>
    </div>
  );
});

export default FightCard;

import type { Round, Side } from '@/lib/duel';
import { SIDE_COLOR } from '@/lib/duel';
import ScoreBar from './ScoreBar';

function SideScore({ round, side, name }: { round: Round; side: Side; name: string }) {
  const s = round[side];
  const lost = round.winner !== 'tie' && round.winner !== side;
  return (
    <div className={side === 'sachin' ? 'text-right' : ''}>
      <div className={`flex items-baseline gap-2 ${side === 'sachin' ? 'flex-row-reverse' : ''}`}>
        <span className="text-3xl font-medium tabular-nums tracking-tight sm:text-4xl" style={{ color: lost ? 'var(--faint)' : SIDE_COLOR[side] }}>
          {s.score}
        </span>
        <span className="truncate font-mono text-xs text-faint">{name}</span>
      </div>
      <div className="mt-2">
        <ScoreBar value={s.score} color={SIDE_COLOR[side]} align={side === 'sachin' ? 'right' : 'left'} dim={lost} />
      </div>
      {s.evidence.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {s.evidence.map(e => (
            <li key={e} className="text-[13px] leading-snug text-muted">
              <span className="font-serif text-base italic text-faint">“</span>
              {e}
              <span className="font-serif text-base italic text-faint">”</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RoundCard({ round, index, names }: { round: Round; index: number; names: Record<Side, string> }) {
  const badge =
    round.winner === 'tie'
      ? { text: 'Even round', color: 'var(--muted)' }
      : { text: `${names[round.winner]} takes it`, color: SIDE_COLOR[round.winner] };

  return (
    <article className="card animate-fade-up relative overflow-hidden p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Round {index + 1}</p>
          <h3 className="mt-1 text-xl font-medium text-fg sm:text-2xl">{round.title}</h3>
          <p className="text-sm text-faint">{round.subtitle}</p>
        </div>
        <span
          className="animate-slam rounded-full border px-3 py-1 font-mono text-xs"
          style={{ color: badge.color, borderColor: badge.color, animationDelay: '700ms' }}
        >
          {badge.text}
        </span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-10">
        <SideScore round={round} side="challenger" name={names.challenger} />
        <SideScore round={round} side="sachin" name={names.sachin} />
      </div>

      <p className="mt-6 border-t border-line pt-4 font-serif text-lg italic leading-snug text-fg/90">{round.commentary}</p>
    </article>
  );
}

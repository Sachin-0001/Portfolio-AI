import type { FighterCard as Fighter, Side } from '@/lib/duel';
import { SIDE_COLOR } from '@/lib/duel';
import { GitHub } from '@/components/Icons';

export function Avatar({ name, url, side, size = 72 }: { name: string; url?: string | null; side: Side; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-2xl border-2 bg-surface-2"
      style={{ width: size, height: size, borderColor: SIDE_COLOR[side] }}
    >
      {url ? (
        // GitHub avatars are remote and tiny; next/image would add config for no gain. crossOrigin lets the PNG export read them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-mono font-medium"
          style={{ color: SIDE_COLOR[side], fontSize: size * 0.34 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

function years(months: number) {
  if (months <= 0) return '0';
  return months < 12 ? `${months} mo` : `${(months / 12).toFixed(1)} yr`;
}

export default function FighterCard({
  fighter,
  side,
  corner,
  className = '',
}: {
  fighter: Fighter;
  side: Side;
  corner: string;
  className?: string;
}) {
  const color = SIDE_COLOR[side];
  const stats = [
    { label: 'Experience', value: years(fighter.stats.experience_months) },
    { label: 'Projects', value: fighter.stats.projects },
    { label: 'Skills', value: fighter.stats.skills },
    { label: 'GitHub ★', value: fighter.github ? fighter.github.stars : '–' },
  ];

  return (
    <div className={`card relative overflow-hidden p-5 sm:p-6 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ background: color, [side === 'challenger' ? 'left' : 'right']: '-3rem' }}
      />
      <p className="relative font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color }}>
        {corner}
      </p>
      <div className="relative mt-4 flex items-center gap-4">
        <Avatar name={fighter.name} url={fighter.github?.avatar_url} side={side} />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-medium text-fg sm:text-2xl">{fighter.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{fighter.headline}</p>
          {fighter.github ? (
            <a
              href={fighter.github.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-faint hover:text-fg"
            >
              <GitHub className="h-3 w-3" />@{fighter.github.username}
            </a>
          ) : (
            <p className="mt-1.5 font-mono text-xs text-faint">no GitHub found</p>
          )}
        </div>
      </div>
      <dl className="relative mt-5 grid grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-line bg-bg/40 px-2 py-2.5 text-center">
            <dd className="text-lg font-medium text-fg">{s.value}</dd>
            <dt className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">{s.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

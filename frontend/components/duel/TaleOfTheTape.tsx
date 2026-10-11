import type { DuelResult, FighterCard, Side } from '@/lib/duel';
import { SIDE_COLOR } from '@/lib/duel';

type Row = { label: string; get: (f: FighterCard) => number | null; format?: (v: number) => string };

const ROWS: Row[] = [
  { label: 'Experience', get: f => f.stats.experience_months, format: v => (v < 12 ? `${v} mo` : `${(v / 12).toFixed(1)} yr`) },
  { label: 'Roles', get: f => f.stats.roles },
  { label: 'Projects', get: f => f.stats.projects },
  { label: 'Skills', get: f => f.stats.skills },
  { label: 'Achievements', get: f => f.stats.achievements },
  { label: 'GitHub stars', get: f => f.github?.stars ?? null },
  { label: 'Original repos', get: f => f.github?.original_repos ?? null },
  { label: 'Repos active (90 days)', get: f => f.github?.active_repos_90d ?? null },
  { label: 'Followers', get: f => f.github?.followers ?? null },
  { label: 'Contributions (1 yr)', get: f => f.github?.contributions_last_year ?? null },
];

function Value({ v, best, side, format }: { v: number | null; best: boolean; side: Side; format?: (v: number) => string }) {
  return (
    <span className={`font-mono text-sm ${best ? 'font-medium' : 'text-muted'}`} style={best ? { color: SIDE_COLOR[side] } : undefined}>
      {v === null ? '–' : format ? format(v) : v.toLocaleString()}
      {best && <span className="ml-1.5 text-[10px]">▲</span>}
    </span>
  );
}

function Languages({ f, side }: { f: FighterCard; side: Side }) {
  const langs = f.github?.top_languages ?? [];
  const max = Math.max(1, ...langs.map(([, n]) => n));
  if (!langs.length) return <p className="text-sm text-faint">No public languages</p>;
  return (
    <ul className="space-y-2">
      {langs.map(([lang, n]) => (
        <li key={lang} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate text-muted">{lang}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: SIDE_COLOR[side] }} />
          </span>
          <span className="w-6 text-right font-mono text-xs text-faint">{n}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TaleOfTheTape({ result, names }: { result: DuelResult; names: Record<Side, string> }) {
  const { challenger, sachin } = result.fighters;
  const rows = ROWS.filter(r => r.get(challenger) !== null || r.get(sachin) !== null);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em]">
          <span style={{ color: SIDE_COLOR.challenger }}>{names.challenger}</span>
          <span className="text-faint">stat</span>
          <span className="text-right" style={{ color: SIDE_COLOR.sachin }}>
            {names.sachin}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map(r => {
            const c = r.get(challenger);
            const s = r.get(sachin);
            return (
              <li key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3">
                <Value v={c} best={c !== null && (s === null || c > s)} side="challenger" format={r.format} />
                <span className="px-3 text-center text-[13px] text-faint">{r.label}</span>
                <span className="text-right">
                  <Value v={s} best={s !== null && (c === null || s > c)} side="sachin" format={r.format} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid gap-4">
        {(['challenger', 'sachin'] as Side[]).map(side => (
          <div key={side} className="card p-5">
            <h4 className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: SIDE_COLOR[side] }}>
              {names[side]} · top languages
            </h4>
            <div className="mt-4">
              <Languages f={result.fighters[side]} side={side} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <span className={`whitespace-nowrap font-mono text-sm ${best ? 'font-medium' : 'text-muted'}`} style={best ? { color: SIDE_COLOR[side] } : undefined}>
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
          <span className="w-20 shrink-0 truncate text-muted sm:w-24">{lang}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: SIDE_COLOR[side] }} />
          </span>
          <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-faint">{n}</span>
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
      <div className="card min-w-0 overflow-hidden">
        <div className="grid grid-cols-2 gap-3 border-b border-line px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] sm:grid-cols-[1fr_auto_1fr] sm:gap-0 sm:px-5">
          <span className="min-w-0 truncate" style={{ color: SIDE_COLOR.challenger }}>
            {names.challenger}
          </span>
          <span className="hidden text-faint sm:inline">stat</span>
          <span className="min-w-0 truncate text-right" style={{ color: SIDE_COLOR.sachin }}>
            {names.sachin}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {rows.map(r => {
            const c = r.get(challenger);
            const s = r.get(sachin);
            // Phones: label on its own line above the two values. sm+: the classic three columns.
            return (
              <li
                key={r.label}
                className="grid grid-cols-2 items-center gap-y-1 px-4 py-2.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-y-0 sm:px-5 sm:py-3"
              >
                <span className="col-span-2 text-center text-xs text-faint sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:px-3 sm:text-[13px]">
                  {r.label}
                </span>
                <span className="sm:col-start-1 sm:row-start-1">
                  <Value v={c} best={c !== null && (s === null || c > s)} side="challenger" format={r.format} />
                </span>
                <span className="text-right sm:col-start-3 sm:row-start-1">
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

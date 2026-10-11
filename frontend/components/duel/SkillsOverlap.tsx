import type { DuelResult, Side } from '@/lib/duel';
import { SIDE_COLOR } from '@/lib/duel';

const MAX_SHOWN = 18;

function Column({ title, items, color }: { title: string; items: string[]; color?: string }) {
  return (
    <div className="card min-w-0 p-5">
      <h4 className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.18em]" style={{ color }}>
        <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
        <span className="shrink-0 text-faint">{items.length}</span>
      </h4>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {items.slice(0, MAX_SHOWN).map(s => (
          <span key={s} className="chip max-w-full whitespace-normal text-fg/80 [overflow-wrap:anywhere]" style={color ? { borderColor: `color-mix(in srgb, ${color} 35%, transparent)` } : undefined}>
            {s}
          </span>
        ))}
        {items.length > MAX_SHOWN && <span className="chip">+{items.length - MAX_SHOWN} more</span>}
        {items.length === 0 && <span className="text-sm text-faint">None</span>}
      </div>
    </div>
  );
}

export default function SkillsOverlap({ skills, names }: { skills: DuelResult['skills']; names: Record<Side, string> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Column title={`Only ${names.challenger}`} items={skills.only_challenger} color={SIDE_COLOR.challenger} />
      <Column title="Common ground" items={skills.shared} color="var(--fg)" />
      <Column title={`Only ${names.sachin}`} items={skills.only_sachin} color={SIDE_COLOR.sachin} />
    </div>
  );
}

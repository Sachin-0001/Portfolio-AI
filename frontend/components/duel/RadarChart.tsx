import type { Round, Side } from '@/lib/duel';
import { SIDE_COLOR } from '@/lib/duel';

const SIZE = 340;
const C = SIZE / 2;
const R = 112;

// Short axis labels so they fit at phone widths; the viewBox below is sized to their measured extents
// (14px mono ≈ 8.4px/char at label radius 128: x ≈ -28…359, y ≈ 33…283).
const SHORT: Record<string, string> = {
  experience: 'Experience',
  projects: 'Projects',
  arsenal: 'Arsenal',
  open_source: 'Open source',
  academics: 'Academics',
};
const VIEWBOX = '-40 25 410 270';

function point(i: number, n: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const r = (value / 100) * R;
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)];
}

/** Five-axis radar of round scores, one polygon per fighter. */
export default function RadarChart({ rounds, names }: { rounds: Round[]; names: Record<Side, string> }) {
  const n = rounds.length;
  const polygon = (side: Side) => rounds.map((r, i) => point(i, n, r[side].score).join(',')).join(' ');

  return (
    <figure>
      <svg viewBox={VIEWBOX} className="mx-auto w-full max-w-[26rem]" role="img" aria-label="Radar chart of round scores">
        {[25, 50, 75, 100].map(level => (
          <polygon
            key={level}
            points={rounds.map((_, i) => point(i, n, level).join(',')).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
          />
        ))}
        {rounds.map((r, i) => {
          const [x, y] = point(i, n, 100);
          const [lx, ly] = point(i, n, 128);
          return (
            <g key={r.key}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" />
              <text
                x={lx}
                y={ly}
                textAnchor={Math.abs(lx - C) < 8 ? 'middle' : lx > C ? 'start' : 'end'}
                dominantBaseline="middle"
                fill="var(--muted)"
                fontFamily="var(--font-mono)"
                fontSize="14"
              >
                {SHORT[r.key] ?? r.title}
              </text>
            </g>
          );
        })}
        {(['sachin', 'challenger'] as Side[]).map(side => (
          <g key={side}>
            <polygon
              points={polygon(side)}
              fill={SIDE_COLOR[side]}
              fillOpacity={0.16}
              stroke={SIDE_COLOR[side]}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {rounds.map((r, i) => {
              const [x, y] = point(i, n, r[side].score);
              return <circle key={r.key} cx={x} cy={y} r={3.5} fill={SIDE_COLOR[side]} />;
            })}
          </g>
        ))}
      </svg>
      <figcaption className="mt-3 flex justify-center gap-5 font-mono text-xs text-muted">
        {(['challenger', 'sachin'] as Side[]).map(side => (
          <span key={side} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SIDE_COLOR[side] }} />
            {names[side]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

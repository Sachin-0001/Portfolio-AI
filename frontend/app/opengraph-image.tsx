import { ImageResponse } from 'next/og';
import { OG, OG_SIZE, glow, ogFonts, words } from '@/lib/og';
import { portfolio } from '@/lib/portfolio';

export const alt = 'Sachin Suresh, AI / ML Engineer: I build agentic AI systems that ship to production.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const TRACE = [
  { glyph: '·', label: 'safeguard.input', detail: 'pass', color: OG.signal },
  { glyph: '·', label: 'memory.recall', detail: '3 episodes', color: OG.signal },
  { glyph: '→', label: 'tool.web_search', detail: '5 results', color: OG.accent },
  { glyph: '→', label: 'tool.weather', detail: '22°C', color: OG.accent },
  { glyph: '→', label: 'answer', detail: '1.9s', color: OG.accent },
];

export default async function Image() {
  const { profile } = portfolio;
  const tags = ['LLM agents', 'RAG', 'ML systems', 'MLOps'];
  const fonts = await ogFonts({
    sans: `I build AI systems that ship to production.${profile.name}${profile.title}${profile.status}`,
    mono: `sachin.suresh11105vercelapp ${tags.join('')}${TRACE.map(t => t.glyph + t.label + t.detail).join('')}harness · agent trace`,
    serif: 'agentic',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: OG.bg,
          color: OG.fg,
          fontFamily: 'Geist',
          padding: '64px 72px',
        }}
      >
        {/* glows */}
        <div
          style={{
            position: 'absolute',
            top: -420,
            left: 150,
            width: 900,
            height: 900,
            display: 'flex',
            background: glow('196,241,95', 0.2),
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          {/* top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 26 }}>
              sachin<span style={{ color: OG.accent }}>.</span>suresh
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `1px solid ${OG.line}`,
                borderRadius: 999,
                padding: '10px 20px',
                fontSize: 22,
                color: OG.muted,
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 999, background: OG.accent, display: 'flex' }} />
              {profile.status}
            </div>
          </div>

          {/* headline + trace */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 18, width: 640, fontSize: 70, lineHeight: 1.05, letterSpacing: -2 }}>
              {words('I build agentic AI systems that ship to production.').map((w, i) =>
                w === 'agentic' ? (
                  <span key={i} style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', color: OG.accent, letterSpacing: 0 }}>
                    {w}
                  </span>
                ) : (
                  <span key={i}>{w}</span>
                )
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 360,
                border: `1px solid ${OG.line}`,
                borderRadius: 20,
                background: OG.surface,
                fontFamily: 'Geist Mono',
                fontSize: 19,
              }}
            >
              <div style={{ display: 'flex', padding: '14px 20px', borderBottom: `1px solid ${OG.line}`, color: OG.faint, fontSize: 16 }}>
                harness · agent trace
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 20px' }}>
                {TRACE.map(t => (
                  <div key={t.label} style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: OG.faint, width: 18 }}>{t.glyph}</span>
                    <span style={{ color: t.color }}>{t.label}</span>
                    <span style={{ color: OG.faint, marginLeft: 'auto' }}>{t.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* bottom row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', fontSize: 30 }}>
                {profile.name}
                <span style={{ color: OG.faint }}>&nbsp;·&nbsp;</span>
                <span style={{ color: OG.muted }}>{profile.title}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {tags.map(t => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      border: `1px solid ${OG.line}`,
                      borderRadius: 999,
                      padding: '6px 16px',
                      fontFamily: 'Geist Mono',
                      fontSize: 18,
                      color: OG.muted,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 20, color: OG.faint }}>sachin11105.vercel.app</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}

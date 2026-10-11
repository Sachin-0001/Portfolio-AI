import { ImageResponse } from 'next/og';
import { OG, OG_SIZE, glow, ogFonts, words } from '@/lib/og';

export const alt = 'Portfolio duel: upload your résumé and go head to head with Sachin Suresh, judged blind by AI.';
export const size = OG_SIZE;
export const contentType = 'image/png';

const ROUNDS = ['Experience', 'Projects', 'Arsenal', 'Open source', 'Academics'];

function Corner({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 180,
          height: 180,
          borderRadius: 36,
          border: `4px solid ${color}`,
          background: OG.surface,
          fontFamily: 'Geist Mono',
          fontSize: 52,
          color,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 20, letterSpacing: 4, color }}>{sub}</div>
    </div>
  );
}

export default async function Image() {
  const fonts = await ogFonts({
    sans: 'Think you can out-build me?Upload your résumé. AI judges us blind, round by round.',
    mono: `PORTFOLIO DUEL · résumé vs résuméyoumeCHALLENGERCHAMPIONsachin11105.vercel.app/duel${ROUNDS.join('')}`,
    serif: 'out-buildvs',
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
          padding: '60px 72px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -300,
            left: -260,
            width: 900,
            height: 900,
            display: 'flex',
            background: glow('125,211,252', 0.18),
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -380,
            right: -260,
            width: 960,
            height: 960,
            display: 'flex',
            background: glow('196,241,95', 0.16),
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 22, letterSpacing: 5, color: OG.faint }}>
            <span style={{ color: OG.accent }}>PORTFOLIO DUEL</span>&nbsp;· résumé vs résumé
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 600 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 20, fontSize: 76, lineHeight: 1.04, letterSpacing: -2 }}>
                {words('Think you can out-build me?').map((w, i) =>
                  w === 'out-build' ? (
                    <span key={i} style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', color: OG.accent, letterSpacing: 0 }}>
                      {w}
                    </span>
                  ) : (
                    <span key={i}>{w}</span>
                  )
                )}
              </div>
              <div style={{ display: 'flex', marginTop: 24, fontSize: 28, color: OG.muted }}>
                Upload your résumé. AI judges us blind, round by round.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <Corner label="you" sub="CHALLENGER" color={OG.signal} />
              <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 72, marginBottom: 40 }}>vs</div>
              <Corner label="me" sub="CHAMPION" color={OG.accent} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {ROUNDS.map(r => (
                <div
                  key={r}
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
                  {r}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', fontFamily: 'Geist Mono', fontSize: 20, color: OG.faint }}>sachin11105.vercel.app/duel</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}

// Shared bits for the Open Graph images (app/**/opengraph-image.tsx), rendered by next/og at build time.

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  bg: '#08090b',
  surface: '#0e1013',
  line: 'rgba(255,255,255,0.10)',
  fg: '#ececef',
  muted: '#9b9ea8',
  faint: '#62656f',
  accent: '#c4f15f',
  signal: '#7dd3fc',
};

/** Soft circular glow. Satori mishandles `closest-side`, so fade to fully transparent well inside the box. */
export const glow = (rgb: string, alpha: number) => `radial-gradient(circle, rgba(${rgb},${alpha}) 0%, rgba(${rgb},0) 65%)`;

/** One element per word, so wrapped lines never start with a stray space. */
export const words = (text: string) => text.split(' ').filter(Boolean);

type Font = { name: string; data: ArrayBuffer; style: 'normal' | 'italic'; weight: 400 | 500 };

/** Fetches a Google Font subset (only the glyphs in `text`) as TTF; next/og can't read woff2. */
async function googleFont(family: string, text: string, axis = ''): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}${axis}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null; // offline build: fall back to the default font rather than failing
  }
}

export async function ogFonts(text: { sans: string; mono: string; serif: string }): Promise<Font[]> {
  const [sans, mono, serif] = await Promise.all([
    googleFont('Geist', text.sans, ':wght@500'),
    googleFont('Geist+Mono', text.mono),
    googleFont('Instrument+Serif', text.serif, ':ital@1'),
  ]);
  const fonts: Font[] = [];
  if (sans) fonts.push({ name: 'Geist', data: sans, style: 'normal', weight: 500 });
  if (mono) fonts.push({ name: 'Geist Mono', data: mono, style: 'normal', weight: 400 });
  if (serif) fonts.push({ name: 'Instrument Serif', data: serif, style: 'italic', weight: 400 });
  return fonts;
}

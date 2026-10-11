import type { Metadata } from 'next';

const title = 'Portfolio duel | Sachin Suresh';
const description = 'Think you can out-build me? Upload your résumé and go head to head across five rounds, judged blind by AI.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: '/duel' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function DuelLayout({ children }: { children: React.ReactNode }) {
  return children;
}

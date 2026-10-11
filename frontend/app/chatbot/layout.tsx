import type { Metadata } from 'next';

const title = 'Ask my AI | Sachin Suresh';
const description = 'A retrieval-augmented assistant grounded in my real experience, projects and résumé. Ask it anything you would ask in an interview.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: '/chatbot' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  return children;
}

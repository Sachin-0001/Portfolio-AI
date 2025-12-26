'use client';
import { useState, useEffect, useRef } from 'react';

export default function About() {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [visibleSections, setVisibleSections] = useState<number[]>([]);

  const fullText = 'AI-Powered Portfolio Assistant';

  /* ---------------- Typewriter Effect ---------------- */
  useEffect(() => {
    if (displayedText.length < fullText.length) {
      const t = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1));
      }, 50);
      return () => clearTimeout(t);
    }
    if (displayedText.length === fullText.length) {
      setIsTypingComplete(true);
    }
  }, [displayedText]);

  /* ------------- Sequential Section Reveal ------------ */

const currentSectionRef = useRef(1);
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (!isTypingComplete) return;

  // 🔒 Force section 0 immediately
  setVisibleSections([0]);
  currentSectionRef.current = 1;

  const reveal = () => {
    setVisibleSections(prev => [...prev, currentSectionRef.current]);
    currentSectionRef.current += 1;

    if (currentSectionRef.current < 5) {
      timeoutRef.current = setTimeout(reveal, 300);
    }
  };

  timeoutRef.current = setTimeout(reveal, 300);

  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, [isTypingComplete]);



  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-950 to-rose-950 relative overflow-hidden"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-400/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Header */}
      <header className="relative border-b border-rose-500/20 backdrop-blur-xl bg-black/30">
        <div className="max-w-5xl mx-auto px-6 py-5 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
            About S.A.C.H.I.N
          </h1>

          <a
            href="/chatbot"
            className="px-5 py-2.5 rounded-xl border border-rose-500/30 text-gray-300 hover:text-white hover:border-rose-400/50 transition"
          >
            ← Back to Chat
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8 relative">
        {/* Hero */}
        <section className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-rose-400 via-orange-400 to-rose-400 bg-clip-text text-transparent min-h-[4rem]">
            {displayedText}
            {displayedText.length < fullText.length && (
              <span className="inline-block w-1 h-12 bg-rose-400 ml-2 animate-pulse" />
            )}
          </h2>

          {isTypingComplete && (
            <p className="mt-4 text-white text-xl max-w-2xl mx-auto animate-fade-in">
              An intelligent chatbot leveraging Retrieval-Augmented Generation
              to transform static portfolio data into dynamic conversations.
            </p>
          )}
        </section>

        {/* Section 0 */}
        {visibleSections.includes(0) && (
          <section className="glass-card animate-slide-up">
            <h3 className="section-title">💡 The Concept</h3>
            <p>
              <strong>S.A.C.H.I.N</strong> is an AI-powered portfolio assistant
              built using <strong>Retrieval-Augmented Generation (RAG)</strong>.
            </p>
            <p>
              Users interact conversationally instead of browsing static pages,
              receiving accurate, contextual answers instantly.
            </p>
          </section>
        )}

        {/* Section 1 */}
        {visibleSections.includes(1) && (
          <section className="glass-card animate-slide-up">
            <h3 className="section-title">⚡ Technology Stack</h3>

            <p className="text-white text-xl mb-3">Frontend</p>
            <div className="chip-group">
              {['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS'].map(t => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>

            <p className="text-white  text-xl mt-6 mb-3">Backend</p>
            <div className="chip-group">
              {['FastAPI', 'Python 3.11+', 'Uvicorn'].map(t => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>

            <p className="text-white text-xl mt-6 mb-3">AI / ML</p>
            <div className="chip-group">
              {['Groq API', 'LLaMA 3.3 70B', 'FAISS', 'RAG', 'MiniLM'].map(t => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          </section>
        )}

        {/* Section 2 */}
        {visibleSections.includes(2) && (
          <section className="glass-card animate-slide-up">
            <h3 className="section-title">🔍 RAG Pipeline</h3>
            <ol className="space-y-3 text-gray-300 text-lg list-decimal list-inside">
              <li>Portfolio data ingestion & preprocessing</li>
              <li>Embedding via Sentence Transformers</li>
              <li>Vector indexing with FAISS</li>
              <li>Semantic retrieval on user query</li>
              <li>Grounded response generation</li>
            </ol>
          </section>
        )}

        {/* Section 3 */}
        {visibleSections.includes(3) && (
          <section className="glass-card animate-slide-up">
            <h3 className="section-title">✨ Key Capabilities</h3>
            <ul className="grid md:grid-cols-2 gap-4 text-gray-300">
              <li>🎯 Context-aware retrieval</li>
              <li>💬 Natural language interaction</li>
              <li>⚡ Sub-second responses</li>
              <li>🔒 Hallucination-resistant answers</li>
            </ul>
          </section>
        )}

        {/* Section 4 */}
        {visibleSections.includes(4) && (
          <section className="glass-card animate-slide-up">
            <h3 className="section-title">🚀 Why This Approach?</h3>
            <p>
              Traditional portfolios are passive. RAG-based chat makes exploration
              active, trustworthy, and memorable—while showcasing real ML
              engineering depth.
            </p>
          </section>
        )}
      </main>

      {/* Animations */}
      <style jsx>{`
        .glass-card {
          backdrop-filter: blur(16px);
          background: rgba(30, 30, 40, 0.35);
          border: 1px solid rgba(244, 114, 182, 0.25);
          border-radius: 1.5rem;
          padding: 2rem;
          color: #e5e7eb;
        }

        .section-title {
          font-size: 1.875rem;
          font-weight: 700;
          color: #f9a8d4;
          margin-bottom: 1rem;
        }

        .chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .chip {
          padding: 0.5rem 1rem;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            rgba(244, 114, 182, 0.25),
            rgba(251, 146, 60, 0.25)
          );
          border: 1px solid rgba(244, 114, 182, 0.35);
        }

        .animate-slide-up {
          animation: slideUp 0.4s ease-out;
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

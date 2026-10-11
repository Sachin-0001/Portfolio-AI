import Link from 'next/link';
import type { Metadata } from 'next';
import Reveal from '@/components/Reveal';
import { ArrowLeft, ArrowRight, Sparkle } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'How S.A.C.H.I.N works | Sachin Suresh',
  description: 'Architecture of the retrieval-augmented assistant behind this portfolio.',
};

const PIPELINE = [
  {
    step: 'Ingest',
    detail: 'portfolio_data.json is split into one self-contained document per project, role, achievement, skill set and profile.',
    tech: 'Python',
  },
  {
    step: 'Index',
    detail: 'Each document is indexed twice: BM25 for exact terms and names, and dense bge-small embeddings for meaning.',
    tech: 'rank-bm25 · fastembed (ONNX)',
  },
  {
    step: 'Retrieve',
    detail: 'Both rankings are fused with Reciprocal Rank Fusion. Follow-ups are expanded with the previous question so “it” resolves.',
    tech: 'Hybrid RRF · top-6',
  },
  {
    step: 'Generate',
    detail: 'The LLM answers from that context plus recent chat history, and returns strict JSON: answer, cards and sources.',
    tech: 'Groq · GPT-OSS 120B',
  },
  {
    step: 'Render',
    detail: 'The answer renders as Markdown; requested cards are resolved server-side from the real data, never from the LLM.',
    tech: 'Next.js · React',
  },
];

const STACK = [
  { group: 'Frontend', items: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4'] },
  { group: 'Backend', items: ['FastAPI', 'Python 3.11', 'Uvicorn', 'Pydantic'] },
  { group: 'AI / Retrieval', items: ['Groq API', 'GPT-OSS 120B', 'BM25', 'bge-small-en-v1.5', 'RRF', 'Structured outputs'] },
];

const PROPERTIES = [
  {
    title: 'Grounded, with sources',
    body: 'The model may only state facts found in retrieved context, and every answer lists the documents it relied on.',
  },
  {
    title: 'No keyword routing',
    body: 'The model itself decides when cards help (and which ones, e.g. only the RAG projects) via a schema-enforced reply.',
  },
  {
    title: 'Measured, not guessed',
    body: 'A labelled eval set compares retrievers: hybrid RRF puts the right document in the top 6 for 40/40 questions, vs 34/40 for the old TF-IDF.',
  },
  {
    title: 'Cheap to run',
    body: 'No GPU, no vector database: a 33M-parameter ONNX embedder and an in-memory index over a single JSON file.',
  },
];

export default function About() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 h-[40rem]" />
      <div aria-hidden className="glow pointer-events-none absolute -top-48 left-1/2 h-[36rem] w-[56rem] -translate-x-1/2" />

      <header className="relative border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-mono text-sm tracking-tight text-fg">
            sachin<span className="text-accent">.</span>suresh
          </Link>
          <Link href="/chatbot" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeft className="h-4 w-4" /> Back to chat
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 pb-28 sm:px-8">
        <section className="pb-16 pt-20 md:pt-28">
          <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.2em] text-faint">
            <span className="text-accent">S.A.C.H.I.N</span> · architecture
          </p>
          <h1
            className="animate-fade-up mt-5 max-w-3xl text-4xl font-medium leading-[1.08] tracking-[-0.03em] text-fg sm:text-5xl md:text-6xl"
            style={{ animationDelay: '80ms' }}
          >
            A portfolio you can <span className="font-serif font-normal italic text-accent">interview.</span>
          </h1>
          <p className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-muted" style={{ animationDelay: '160ms' }}>
            The assistant behind this portfolio is a small retrieval-augmented generation system: it
            turns static portfolio data into grounded, conversational answers.
          </p>
        </section>

        {/* Pipeline */}
        <section className="py-12">
          <Reveal>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Request pipeline</h2>
          </Reveal>
          <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-5">
            {PIPELINE.map((p, i) => (
              <Reveal as="li" key={p.step} delay={i * 80} className="relative flex flex-col bg-bg p-5">
                <span className="font-mono text-xs text-accent">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-medium text-fg">{p.step}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.detail}</p>
                <p className="mt-5 font-mono text-[11px] text-faint">{p.tech}</p>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="absolute right-3 top-5 hidden h-4 w-4 text-faint md:block" />
                )}
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-4">
            <p className="font-mono text-xs text-faint">
              browser → Next.js route <span className="text-muted">/api/chat</span> → FastAPI{' '}
              <span className="text-muted">/api/chat</span> → retriever → LLM → Markdown + structured cards
            </p>
          </Reveal>
        </section>

        {/* Properties */}
        <section className="py-12">
          <Reveal>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Design choices</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PROPERTIES.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 80} className="card card-hover p-6">
                <h3 className="font-medium text-fg">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section className="py-12">
          <Reveal>
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-faint">Stack</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STACK.map((s, i) => (
              <Reveal key={s.group} delay={i * 80} className="card p-6">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{s.group}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.items.map(item => (
                    <span key={item} className="chip text-fg/80">
                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal className="pt-12 text-center">
          <Link
            href="/chatbot"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform hover:scale-[1.03]"
          >
            <Sparkle className="h-4 w-4" /> Try it
          </Link>
        </Reveal>
      </main>
    </div>
  );
}

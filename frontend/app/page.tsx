import Link from 'next/link';
import { portfolio } from '@/lib/portfolio';
import SiteNav from '@/components/SiteNav';
import AgentTrace from '@/components/AgentTrace';
import AskBar from '@/components/AskBar';
import Reveal from '@/components/Reveal';
import { ArrowRight, ArrowUpRight, Download, GitHub, Npm, SocialIcon, Sparkle } from '@/components/Icons';

const { profile, education, experience, projects, skill_groups, achievements, socials } = portfolio;

const featured = projects.filter(p => p.featured);
const more = projects.filter(p => !p.featured);

const STATS = [
  { value: '50', unit: 'param', label: 'CapScore credit-scoring engine at Capmob' },
  { value: '299', unit: 'tests', label: 'gating UnBind in CI' },
  { value: '6', unit: 'tools', label: 'in a from-scratch agent runtime' },
  { value: education[0]?.cgpa.split(' ')[0] ?? '', unit: 'CGPA', label: 'B.E. Computer Science, DSCE' },
];

function SectionHeading({ index, kicker, title }: { index: string; kicker: string; title: React.ReactNode }) {
  return (
    <Reveal className="mb-12 md:mb-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
        <span className="text-accent">{index}</span> · {kicker}
      </p>
      <h2 className="mt-4 max-w-3xl text-3xl font-medium tracking-tight text-fg sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
        {title}
      </h2>
    </Reveal>
  );
}

function LinkPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <SiteNav resumeUrl={profile.resume_url} />

      {/* ───────────── Hero ───────────── */}
      <section className="relative">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 h-[46rem]" />
        <div aria-hidden className="glow pointer-events-none absolute -top-40 left-1/2 h-[42rem] w-[60rem] -translate-x-1/2" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-32 sm:px-8 md:pt-40 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          <div>
            <div className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[13px] text-muted">
              <span className="relative flex h-2 w-2">
                <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {profile.status}
            </div>

            <h1
              className="animate-fade-up mt-7 text-[2.6rem] font-medium leading-[1.04] tracking-[-0.035em] text-fg sm:text-6xl lg:text-[4.1rem]"
              style={{ animationDelay: '80ms' }}
            >
              I build <span className="font-serif font-normal italic tracking-normal text-accent">agentic</span> AI
              systems that ship to production.
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted"
              style={{ animationDelay: '160ms' }}
            >
              {profile.name}, an {profile.title} working on LLM agents, RAG pipelines and ML-driven
              decision systems, from the model loop down to the cloud infrastructure that runs it.
            </p>

            <div className="animate-fade-up mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
              <Link
                href="/chatbot"
                className="group inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-sm font-medium text-bg transition-transform hover:scale-[1.03]"
              >
                <Sparkle className="h-4 w-4" />
                Chat with my portfolio
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={profile.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-3 text-sm text-fg transition-colors hover:bg-white/5"
              >
                <Download className="h-4 w-4" />
                Résumé
              </a>
              <div className="ml-1 flex items-center gap-1">
                {socials.map(s => (
                  <a
                    key={s.platform}
                    href={s.link}
                    target={s.link.startsWith('mailto:') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    aria-label={s.platform}
                    title={s.platform}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-fg"
                  >
                    <SocialIcon platform={s.platform} className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '320ms' }}>
            <AgentTrace />
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative mx-auto max-w-6xl px-5 pb-8 sm:px-8">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 70} className="bg-bg px-5 py-6">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="text-3xl font-medium tracking-tight text-fg">{s.value}</span>
                  <span className="ml-1.5 font-mono text-xs text-accent">{s.unit}</span>
                  <p className="mt-1.5 text-[13px] leading-snug text-faint">{s.label}</p>
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ───────────── Experience ───────────── */}
        <section id="experience" className="py-24 md:py-32">
          <SectionHeading
            index="01"
            kicker="Experience"
            title={
              <>
                Shipping AI where it has to be <span className="font-serif italic text-muted">right</span>: lending,
                credit and operations.
              </>
            }
          />

          <ol className="relative space-y-6 border-l border-line pl-6 md:pl-10">
            {experience.map((exp, i) => (
              <Reveal as="li" key={exp.company} delay={i * 80} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[29px] top-8 h-2.5 w-2.5 rounded-full ring-4 ring-bg md:-left-[45px] ${
                    exp.end_date === 'Present' ? 'bg-accent' : 'bg-faint'
                  }`}
                />
                <article className="card card-hover p-6 md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                    <div>
                      <h3 className="text-xl font-medium text-fg">{exp.role}</h3>
                      <p className="mt-1 text-muted">
                        {exp.link ? (
                          <a href={exp.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                            {exp.company}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          exp.company
                        )}
                        {exp.mode && <span className="text-faint"> · {exp.mode}</span>}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-faint">
                      {exp.start_date} – {exp.end_date ?? 'Present'}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {(exp.highlights ?? [exp.description]).map(h => (
                      <li key={h} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                        <span aria-hidden className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-accent/70" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  {exp.tags && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {exp.tags.map(t => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ───────────── Projects ───────────── */}
        <section id="projects" className="py-24 md:py-32">
          <SectionHeading
            index="02"
            kicker="Selected work"
            title={
              <>
                Agents, retrieval and the <span className="font-serif italic text-muted">unglamorous</span> parts that
                make them reliable.
              </>
            }
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {featured.map((p, i) => (
              <Reveal as="article" key={p.id} delay={i * 90} className="card card-hover group flex flex-col p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs text-faint">{p.date}</span>
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-2xl font-medium tracking-tight text-fg md:text-3xl">{p.name}</h3>
                <p className="mt-1 font-serif text-xl italic text-muted">{p.tagline}</p>
                <p className="mt-5 text-[15px] leading-relaxed text-muted">{p.description}</p>

                {p.highlights && (
                  <ul className="mt-6 space-y-3 border-t border-line pt-6">
                    {p.highlights.map(h => (
                      <li key={h} className="flex gap-3 text-sm leading-relaxed text-muted">
                        <span aria-hidden className="mt-[0.15rem] font-mono text-accent">↳</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {p.tags.map(t => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-7">
                  {p.link && p.link !== p.github && (
                    <LinkPill href={p.link}>
                      <ArrowUpRight className="h-3.5 w-3.5" /> Live
                    </LinkPill>
                  )}
                  {p.github && (
                    <LinkPill href={p.github}>
                      <GitHub className="h-3.5 w-3.5" /> Source
                    </LinkPill>
                  )}
                  {p.npm && (
                    <LinkPill href={p.npm}>
                      <Npm className="h-3.5 w-3.5" /> npm
                    </LinkPill>
                  )}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-faint">More experiments</h3>
          </Reveal>
          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p, i) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-medium text-fg">{p.name}</h4>
                    {p.link && (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
                  <p className="mt-4 font-mono text-[11px] text-faint">{p.tags.slice(0, 4).join(' · ')}</p>
                </>
              );
              return (
                <Reveal key={p.id} delay={(i % 3) * 60} className="bg-bg">
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block h-full p-6 transition-colors hover:bg-surface"
                    >
                      {body}
                    </a>
                  ) : (
                    <div className="h-full p-6">{body}</div>
                  )}
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ───────────── Stack ───────────── */}
        <section id="stack" className="py-24 md:py-32">
          <SectionHeading
            index="03"
            kicker="Stack"
            title={
              <>
                From fine-tuning with <span className="font-serif italic text-muted">QLoRA</span> to deploying on
                Fargate.
              </>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skill_groups.map((g, i) => (
              <Reveal key={g.category} delay={(i % 3) * 70} className="card card-hover p-6">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{g.category}</h3>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                  {g.items.map(item => (
                    <li key={item} className="text-[15px] text-fg/90">
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────────── Achievements & Education ───────────── */}
        <section id="achievements" className="py-24 md:py-32">
          <SectionHeading index="04" kicker="Recognition & education" title="Competing, practicing, learning." />
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ul className="card divide-y divide-line">
              {achievements.map((a, i) => (
                <Reveal as="li" key={a.title} delay={i * 60} className="flex flex-col gap-1 p-6 sm:flex-row sm:gap-6">
                  <span className="w-28 shrink-0 pt-0.5 font-mono text-xs text-faint">{a.date}</span>
                  <div>
                    <h3 className="font-medium text-fg">{a.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{a.description}</p>
                  </div>
                </Reveal>
              ))}
            </ul>

            {education.map(e => (
              <Reveal key={e.institution} className="card relative flex flex-col justify-between overflow-hidden p-6 md:p-8">
                <div aria-hidden className="glow pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 opacity-70" />
                <div className="relative">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Education</p>
                  <h3 className="mt-5 text-xl font-medium text-fg">{e.institution}</h3>
                  <p className="mt-1 text-muted">{e.degree}</p>
                </div>
                <div className="relative mt-10 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-medium tracking-tight text-fg">{e.cgpa.split(' ')[0]}</p>
                    <p className="mt-1 font-mono text-xs text-faint">CGPA / 10</p>
                  </div>
                  <p className="text-right font-mono text-xs text-faint">
                    {e.start_date} – {e.end_date}
                    <br />
                    {e.location}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────────── Duel teaser ───────────── */}
        <section id="duel" className="pt-24 md:pt-32">
          <Reveal>
            <Link href="/duel" className="card card-hover group relative block overflow-hidden p-8 md:p-12">
              <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-signal opacity-15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-accent opacity-15 blur-3xl" />
              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="max-w-xl">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
                    <span className="text-accent">05</span> · Portfolio duel
                  </p>
                  <h2 className="mt-4 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
                    Think you can <span className="font-serif italic text-accent">out-build</span> me?
                  </h2>
                  <p className="mt-3 text-muted">
                    Upload your résumé. I’ll pull your GitHub and an AI panel judges us blind, round by round.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-signal font-mono text-signal">you</span>
                  <span className="font-serif text-3xl italic text-fg">vs</span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-accent font-mono text-accent">me</span>
                  <ArrowRight className="ml-2 h-5 w-5 text-faint transition-all group-hover:translate-x-1 group-hover:text-accent" />
                </div>
              </div>
            </Link>
          </Reveal>
        </section>

        {/* ───────────── Ask CTA ───────────── */}
        <section id="ask" className="py-24 md:py-32">
          <Reveal className="card relative overflow-hidden p-8 md:p-14">
            <div aria-hidden className="bg-grid pointer-events-none absolute inset-0" />
            <div aria-hidden className="glow pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[50rem] -translate-x-1/2" />
            <div className="relative mx-auto max-w-2xl text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
                <span className="text-accent">06</span> · S.A.C.H.I.N
              </p>
              <h2 className="mt-4 text-3xl font-medium tracking-tight text-fg sm:text-4xl md:text-5xl">
                Don’t skim. <span className="font-serif italic text-accent">Ask.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted">
                This portfolio runs its own retrieval-augmented assistant over everything on this page. Ask it what
                you’d ask me in an interview.
              </p>
              <div className="mt-9 text-left">
                <AskBar />
              </div>
              <Link href="/about" className="mt-8 inline-flex items-center gap-1.5 text-sm text-faint transition-colors hover:text-fg">
                How the assistant works <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ───────────── Footer ───────────── */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-fg">Let’s build something intelligent.</p>
            <a href={`mailto:${profile.email}`} className="mt-1 inline-block font-mono text-sm text-muted transition-colors hover:text-accent">
              {profile.email}
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-faint">
            {socials
              .filter(s => !s.link.startsWith('mailto:'))
              .map(s => (
                <a key={s.platform} href={s.link} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-fg">
                  {s.platform}
                </a>
              ))}
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-10 font-mono text-xs text-faint sm:px-8">
          © {new Date().getFullYear()} {profile.name} · {profile.location}
        </div>
      </footer>
    </div>
  );
}

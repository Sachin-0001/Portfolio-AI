export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-950 to-rose-950 font-sans">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-12 px-6">
        <h1 className="text-5xl font-bold text-center mb-8 bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
          Welcome to My Portfolio
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Normal Website Card */}
          <a
            href="https://portfolio-henna-six-80gtc5cdsz.vercel.app/"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-900/40 to-slate-900 p-8 border border-rose-800/50 hover:border-rose-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/20"
          >
            <div className="relative z-10">
              <div className="mb-4 text-4xl">🌐</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Visit Normal Website
              </h2>
              <p className="text-gray-400">
                Explore my traditional portfolio with projects, skills, and
                experience.
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>

          {/* Chatbot Card */}
          <a
            href="/chatbot"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900/40 to-slate-900 p-8 border border-orange-800/50 hover:border-orange-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20"
          >
            <div className="relative z-10">
              <div className="mb-4 text-4xl">🤖</div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Enter Interactive Chatbot
              </h2>
              <p className="text-gray-400">
                Chat with an AI assistant to learn more about me interactively.
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>
      </main>
    </div>
  );
}
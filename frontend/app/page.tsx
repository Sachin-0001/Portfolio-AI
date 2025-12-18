import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900 font-sans">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-12 px-6">
        <h1 className="text-5xl font-bold text-center mb-8 bg-linear-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Welcome to My Portfolio
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Normal Website Card */}
          <a
            href="https://portfolio-henna-six-80gtc5cdsz.vercel.app/"
            className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-gray-800 to-gray-900 p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
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
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>

          {/* Chatbot Card */}
          <a
            href="/chatbot"
            className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-gray-800 to-gray-900 p-8 border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
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
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>
      </main>
    </div>
  );
}

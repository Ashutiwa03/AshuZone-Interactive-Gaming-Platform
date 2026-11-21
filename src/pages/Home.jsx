import { Link } from "react-router-dom";

const games = [
  {
    name: "Snake & Ladder",
    emoji: "🐍",
    path: "/snake-ladder",
  },
  {
    name: "Ludo",
    emoji: "🎲",
    path: "/ludo",
  },
  {
    name: "Chess",
    emoji: "♟️",
    path: "/chess",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">

      {/* Heading */}
      <h1 className="text-4xl font-bold text-center mb-3">
        🎮 AshuZone – Interactive Gaming Platform
      </h1>

      <p className="text-center text-slate-400 mb-10">
        Welcome to AshuZone — Choose your game and start playing!
      </p>

      {/* Games */}
      <div className="grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
        {games.map((game) => (
          <Link
            key={game.path}
            to={game.path}
            className="bg-slate-800 rounded-2xl p-8 text-center hover:bg-slate-700 hover:scale-105 transition"
          >
            <div className="text-6xl mb-4">
              {game.emoji}
            </div>

            <h2 className="text-xl font-semibold">
              {game.name}
            </h2>

            <p className="text-sm text-slate-400 mt-2">
              Play Now →
            </p>
          </Link>
        ))}
      </div>

      {/* Coming Soon */}
      <section className="max-w-5xl mx-auto mt-20 text-center">
        <div className="bg-slate-800 rounded-3xl p-10 border border-slate-700">

          <div className="text-5xl mb-4">
            🚀
          </div>

          <h2 className="text-3xl font-bold mb-3">
            More Games Coming Soon
          </h2>

          <p className="text-slate-400">
            New exciting games will be added to AshuZone soon!
          </p>

        </div>
      </section>

      {/* Footer */}
      <footer className="text-center mt-16 pb-4 text-slate-500">
        <p>🎮 AshuZone</p>
        <p className="text-sm mt-1">
          Made with ❤️ by Ashutosh
        </p>
        <p className="text-xs mt-2">
          © 2026 AshuZone. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
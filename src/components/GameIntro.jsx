export default function GameIntro({ onStart }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">

      <div className="bg-slate-800 text-white p-10 rounded-3xl text-center shadow-2xl">

        <div className="text-6xl mb-5">
          🎮
        </div>

        <h1 className="text-4xl font-bold mb-3">
          Welcome to AshuZone
        </h1>

        <p className="text-slate-300 mb-8">
          Ready to play?
        </p>

        <button
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold text-lg transition hover:scale-105"
        >
          START GAME 🚀
        </button>

      </div>

    </div>
  );
}
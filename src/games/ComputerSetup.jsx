import { useState } from "react";

const COLORS = [
  { id: "blue", grad: "from-sky-300 to-blue-600" },
  { id: "red", grad: "from-red-300 to-red-600" },
  { id: "green", grad: "from-green-400 to-green-800" },
  { id: "yellow", grad: "from-yellow-200 to-yellow-500" },
];

const Tick = () => (
  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 border-2 border-white text-white text-xs flex items-center justify-center">
    ✓
  </span>
);
const PlayerIcon = ({ count }) => (
  <div className="flex items-end justify-center -space-x-2 h-8">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-purple-700" />
        <div className="w-5 h-3 rounded-t-full bg-purple-700" />
      </div>
    ))}
  </div>
);

const selectedCls = "bg-gradient-to-b from-yellow-400 to-yellow-600 border-yellow-300";
const normalCls = "bg-blue-700 border-blue-400";

export default function ComputerSetup({ onStart }) {
  const [players, setPlayers] = useState(2);
  const [color, setColor] = useState("blue");

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4 items-center">
      {/* SELECT PLAYERS */}
      <div className="w-full rounded-3xl border-2 border-blue-400 bg-blue-600/60 p-4 text-center">
        <h2 className="text-xl font-bold mb-3">SELECT PLAYERS</h2>
        <div className="flex justify-around">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPlayers(n)}
              className={`relative w-24 py-3 rounded-2xl border-2 flex flex-col items-center ${
                players === n ? selectedCls : normalCls
              }`}
            >
              {players === n && <Tick />}
              <PlayerIcon count={n} />
              <span className="text-xl font-bold">{n}P</span>
            </button>
          ))}
        </div>
      </div>

      {/* CHOOSE YOUR COLOR */}
      <div className="w-full rounded-3xl border-2 border-blue-400 bg-blue-600/60 p-4 text-center">
        <h2 className="text-xl font-bold mb-3">CHOOSE YOUR COLOR</h2>
        <div className="flex justify-around">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={`relative w-16 h-20 rounded-2xl border-2 flex items-center justify-center ${
                color === c.id ? selectedCls : normalCls
              }`}
            >
              {color === c.id && <Tick />}
              <div className="relative w-10 h-12 flex justify-center">
                <div className="absolute top-5 w-6 h-6 rotate-45 bg-gray-300 rounded-sm" />
                <div
                  className={`relative w-9 h-9 rounded-full bg-gradient-to-b ${c.grad} border-2 border-gray-200`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PLAY */}
      <button
        onClick={() => onStart({ players, color })}
        className="mt-6 w-72 py-4 rounded-full bg-gradient-to-b from-yellow-400 to-orange-500 border-4 border-yellow-300 text-white text-4xl font-extrabold shadow-xl transition hover:scale-105"
      >
        PLAY
      </button>
    </div>
  );
}
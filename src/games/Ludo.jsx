import { useState } from "react";
import GameIntro from "../components/GameIntro";
import ComputerSetup from "./ComputerSetup";
import LudoBoard from "./LudoBoard";

export default function Ludo() {
  const [started, setStarted] = useState(false);
  const [gameMode, setGameMode] = useState("");
  const [players, setPlayers] = useState(2);
  const [color, setColor] = useState("");
  const [playGame, setPlayGame] = useState(false);

         if(playGame){
          return (
          <LudoBoard 
          playerCount={players}
          selectedColor={color}
          gameMode={gameMode}/>);
        }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      {/* Welcome Screen */}
      {!started ? (
        <GameIntro onStart={() => setStarted(true)} />
      ) : !gameMode ? (

        /* Game Mode */
        <div className="w-full max-w-2xl text-center">

          <h1 className="text-4xl font-bold mb-10">
            🎲 Choose Game Mode
          </h1>

          <div className="grid sm:grid-cols-2 gap-6">

            <div className="w-64 p-3 rounded-3xl border-4 border-blue-400 bg-blue-600">
  <img
    src="/images/computer.jpeg"
    alt="Computer"
    className="w-full rounded-2xl"
  />
  <button
    onClick={() => setGameMode("computer")}
    className="w-full mt-3 py-2 rounded-xl bg-gradient-to-b from-green-400 to-green-600 text-white text-2xl font-bold transition hover:scale-105 cursor-pointer"
  >
    Computer
  </button>
</div>
   <div className="w-64 p-3 rounded-3xl border-4 border-blue-400 bg-blue-600">
  <img
    src="/images/play.jpeg"
    alt="Local"
    className="w-full rounded-2xl"
  />
  <button
    onClick={() => setGameMode("local")}
    className="w-full mt-3 py-2 rounded-xl bg-gradient-to-b from-yellow-400 to-orange-500 text-white text-2xl font-bold transition hover:scale-105 cursor-pointer"
  >
    Local
  </button>
           </div>
           </div>

        </div>

      ) : (

        /* Computer Setup */
        <div className="w-full max-w-2xl text-center">

          <h1 className="text-4xl font-bold mb-10">
            🤖 Play with Computer
          </h1>
          <ComputerSetup
            onStart={({ players, color }) => {
              setPlayers(players);
              setColor(color);
              setPlayGame(true);
              
            }}
          />


        </div>
      )}

    </div>
  );
}
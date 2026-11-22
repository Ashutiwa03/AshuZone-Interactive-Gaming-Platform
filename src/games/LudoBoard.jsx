import { useEffect, useState } from "react";
import {playSound} from "../playSound";
import confetti from "canvas-confetti";

const celebrate = () => {
  const end = Date.now() + 3000; // 3 seconds

  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 } });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
};

const COLORS = {
  red: { name: "Red", main: "#ef4444", dark: "#991b1b", light: "#fecaca" },
  green: { name: "Green", main: "#22c55e", dark: "#166534", light: "#bbf7d0" },
  yellow: { name: "Yellow", main: "#facc15", dark: "#a16207", light: "#fef08a" },
  blue: { name: "Blue", main: "#3b82f6", dark: "#1e40af", light: "#bfdbfe" },
};
const ORDER = ["red", "green", "yellow", "blue"];
const START = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
const BASE_POS = { red: [1, 1], green: [10, 1], yellow: [10, 10], blue: [1, 10] };

// Standard 52-cell clockwise track on a 15x15 grid.
const TRACK = (() => {
  const p = [];
  const add = (x, y) => p.push([x, y]);
  for (let x = 1; x <= 5; x++) add(x, 6);
  for (let y = 5; y >= 0; y--) add(6, y);
  add(7, 0); add(8, 0);
  for (let y = 1; y <= 5; y++) add(8, y);
  for (let x = 9; x <= 14; x++) add(x, 6);
  add(14, 7); add(14, 8);
  for (let x = 13; x >= 9; x--) add(x, 8);
  for (let y = 9; y <= 14; y++) add(8, y);
  add(7, 14); add(6, 14);
  for (let y = 13; y >= 9; y--) add(6, y);
  for (let x = 5; x >= 0; x--) add(x, 8);
  add(0, 7); add(0, 6);
  return p;
})();

const LANE = {
  red: [1, 2, 3, 4, 5].map((x) => [x, 7]),
  green: [1, 2, 3, 4, 5].map((y) => [7, y]),
  yellow: [13, 12, 11, 10, 9].map((x) => [x, 7]),
  blue: [13, 12, 11, 10, 9].map((y) => [7, y]),
};

// progress: 0 = base, 1..51 = track, 52..56 = home lane, 57 = finished
const trackIdx = (color, p) => (p >= 1 && p <= 51 ? (START[color] + p - 1) % 52 : -1);
const cellOf = (color, p) => (p <= 51 ? TRACK[trackIdx(color, p)] : LANE[color][p - 52]);
const canMove = (t, d) => (t === 0 ? d === 6 : t !== 57 && t + d <= 57);
const getNextTurn = (current, players, finished) => {
  for (let step = 1; step <= players.length; step++) {
    const index = (current + step) % players.length;

    if (!finished.some((p) => p.color === players[index].color)) {
      return index;
    }
  }
  return current;
};

const createPlayers = (count, sel, vsComputer) => {
  const s = Math.max(0, ORDER.indexOf(sel));
  const rot = [...ORDER.slice(s), ...ORDER.slice(0, s)];
  const n = Number(count) || 2;
  const pick = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];
  return pick.map((k, i) => ({
    color: rot[k],
    isAI: vsComputer && i > 0,
    name: vsComputer ? (i === 0 ? "You" : n > 2 ? `Computer ${i}` : "Computer") : `Player ${i + 1}`,
    tokens: [0, 0, 0, 0],
  }));
};

function Dice({ value, rolling, onClick, disabled }) {
  const dots = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  return (
    <button className={`dice ${rolling ? "dice-roll" : ""}`} onClick={onClick} disabled={disabled} aria-label="Roll dice">
      <div className="dice-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className={dots[value]?.includes(i) ? "dot" : ""} />
        ))}
      </div>
    </button>
  );
}

function Token({ color, n, active, multi, onClick }) {
  const c = COLORS[color];
  return (
    <button
      className={`tk ${active ? "tk-on" : ""} ${multi ? "tk-m" : ""}`}
      disabled={!active}
      onClick={onClick}
      style={{ "--m": c.main, "--d": c.dark, "--l": c.light }}
    >
      {n + 1}
    </button>
  );
}

export default function LudoBoard({ playerCount = 2, selectedColor = "red", gameMode = "local", mode }) {
  // Accepts gameMode="computer" (or mode="computer" / "vs-computer" / "Computer")
  const vsComputer = [gameMode, mode].some((v) => String(v || "").toLowerCase().includes("comp"));

  const [players, setPlayers] = useState(() => createPlayers(playerCount, selectedColor, vsComputer));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState(null); // null = not rolled yet
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(null);
  const [finishOrder, setFinishOrder] = useState([]);
  const [note, setNote] = useState("");
  const [tries, setTries] = useState(0); // failed 6-attempts when all tokens are in base

  const newGame = () => {
  setTries(0);
  setPlayers(createPlayers(playerCount, selectedColor, vsComputer));
  setTurn(0);
  setDice(null);
  setRolling(false);
  setWinner(null);
  setFinishOrder([]);
  setNote("");
};
  // Restart when mode / players / colour change.
  useEffect(newGame, [playerCount, selectedColor, vsComputer]); // eslint-disable-line

  const me = players[turn];
  const movable =
    dice === null || !me ? [] : me.tokens.map((t, i) => (canMove(t, dice) ? i : -1)).filter((i) => i >= 0);

  const roll = () => {
    if (rolling || dice !== null || winner) return;
    setRolling(true);
    playSound("dice");
    setNote("");
    setTimeout(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      setRolling(false);
    }, 650);
  };

  // ye move ka code hai ki ek ek point badhe aur sound play ho
  const move = (ti) => {
  if (dice === null || rolling || winner || !canMove(me.tokens[ti], dice)) return;

  const old = me.tokens[ti];
  const np = old === 0 ? 1 : old + dice;
  const cell = trackIdx(me.color, np);
  let captured = false;

  // Ek-ek ghar ke steps
  const steps = [];
  for (let s = old + 1; s <= np; s++) steps.push(s);

   const finish = () => {
  // Moving token ki final position update
  let next = players.map((p, pi) => {
    if (pi === turn) {
      return {
        ...p,
        tokens: p.tokens.map((t, k) => (k === ti ? np : t)),
      };
    }
    return p;
  });

  // 1. Destination block par capture check
  if (cell >= 0 && !SAFE.includes(cell)) {
    next = next.map((p, pi) => {
      if (pi === turn) return p;

      const tokensOnCell = p.tokens.filter(
        (t) => trackIdx(p.color, t) === cell
      ).length;

      if (tokensOnCell !== 1) return p;

      return {
        ...p,
        tokens: p.tokens.map((t) => {
          if (trackIdx(p.color, t) === cell) {
            captured = true;
            return 0;
          }
          return t;
        }),
      };
    });
  }

  // 2. Purane block par pair tootne ka check
  const oldCell = trackIdx(me.color, old);

  if (oldCell >= 0 && !SAFE.includes(oldCell)) {
    const remainingMyTokens = next[turn].tokens.filter(
      (t) => trackIdx(me.color, t) === oldCell
    ).length;

    const opponentPresent = next.some(
      (p, pi) =>
        pi !== turn &&
        p.tokens.some((t) => trackIdx(p.color, t) === oldCell)
    );

    if (remainingMyTokens === 1 && opponentPresent) {
      next = next.map((p, pi) => {
        if (pi !== turn) return p;

        return {
          ...p,
          tokens: p.tokens.map((t) => {
            if (trackIdx(me.color, t) === oldCell) {
              captured = true;
              return 0;
            }
            return t;
          }),
        };
      });
    }
  }

  setPlayers(next);
  setDice(null);
  setTries(0);
  setRolling(false);

  if (next[turn].tokens.every((t) => t === 57)) {
  const updatedOrder = [...finishOrder, me];

  const remainingPlayers = next.filter(
    (p) => !updatedOrder.some((f) => f.color === p.color)
  );

  if (updatedOrder.length >= players.length - 1) {
    const finalOrder = [...updatedOrder, ...remainingPlayers];

    setFinishOrder(finalOrder);
    setWinner(updatedOrder[0]);

    celebrate();
    setTimeout(() => playSound("win"), 300);
    return;
  }

  setFinishOrder(updatedOrder);

  setTurn(getNextTurn(turn, next, updatedOrder));
  setNote(`${me.name} finished! Rank: ${updatedOrder.length}`);

  celebrate();
  setTimeout(() => playSound("win"), 300);
  return;
}

  const bonus = dice === 6 || captured || np === 57;

  if (captured) setNote("Token captured! 💥 Roll again");
  else if (np === 57) {
    setNote("Token home! 🏠 Bonus turn");
    celebrate();
  }
  else if (dice === 6) setNote("Six! 🎲 Bonus turn");
  else setNote("");

  if (!bonus) {
  setTurn(getNextTurn(turn, players, finishOrder));
}
   };

  setRolling(true); // animation ke time koi aur click na ho

  steps.forEach((pos, i) => {
    setTimeout(() => {
      playSound("move");
      setPlayers((prev) =>
        prev.map((p, pi) =>
          pi === turn ? { ...p, tokens: p.tokens.map((t, k) => (k === ti ? pos : t)) } : p
        )
      );
      if (i === steps.length - 1) finish();
    }, i * 250);
  });
};

  // No legal move -> pass the turn automatically (human and computer).
  useEffect(() => {
    if (winner || rolling || dice === null || movable.length) return;
    const t = setTimeout(() => {
      setDice(null);
      const allBase = me.tokens.every((x) => x === 0);
      if (dice === 6) {
        setNote(`${me.name}: rolled ${dice}, no move available ❌`);
      } else if (allBase && tries < 0) {
        setTries(tries + 1);
        setNote(`${me.name}: rolled ${dice}, need a 6 try again (${tries + 2}/3) 🎲`);
      } else {
        setTries(0);
        setNote(`${me.name}: rolled ${dice}, no move available ❌`);
       setTurn(getNextTurn(turn, players, finishOrder));
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [winner, rolling, dice, movable.length, players.length, tries, turn , finishOrder]);

  // Computer plays by itself: roll, then pick best token.
  useEffect(() => {
    if (!me?.isAI || winner || rolling) return;
    if (dice === null) {
      const t = setTimeout(roll, 900);
      return () => clearTimeout(t);
    }
    if (!movable.length) return;
    const t = setTimeout(() => {
      let best = movable[0], bs = -1;
      movable.forEach((i) => {
        const tk = me.tokens[i];
        const np = tk === 0 ? 1 : tk + dice;
        const c = trackIdx(me.color, np);
        let s = np / 10;
        if (tk === 0) s += 50;
        if (np === 57) s += 80;
        if (c >= 0) {
          if (SAFE.includes(c)) s += 20;
          else if (players.some((p, pi) => pi !== turn && p.tokens.some((x) => trackIdx(p.color, x) === c))) s += 100;
        }
        if (s > bs) { bs = s; best = i; }
      });
      move(best);
    }, 900);
    return () => clearTimeout(t);
  }); // runs every render; timers are cleaned up, so it is safe

  // Tokens on board cells
  const at = {};
  players.forEach((p) =>
    p.tokens.forEach((t, i) => {
      if (t >= 1 && t <= 56) {
        const [x, y] = cellOf(p.color, t);
        (at[`${x},${y}`] ||= []).push({ color: p.color, i });
      }
    })
  );

  const isActive = (color, i) =>
    !winner && !rolling && dice !== null && !me?.isAI && me?.color === color && movable.includes(i);

  const renderTokens = (x, y) => {
    const list = at[`${x},${y}`] || [];
    return list.map((k) => (
      <Token key={`${k.color}${k.i}`} color={k.color} n={k.i} multi={list.length > 1}
        active={isActive(k.color, k.i)} onClick={() => move(k.i)} />
    ));
  };

  const status = winner
    ? `${winner.name} wins 🏆`
    : note ||
      (rolling
        ? "Rolling the dice 🎲"
        : dice === null
        ? me?.isAI ? `${me.name} is rolling the dice 🤖` : "Roll the dice 🎲"
        : !movable.length
        ? `${me.name}: rolled ${dice}, no moves available❌`
        : me?.isAI ? `${me.name} is thinking…` : "choose your token 🎯");

  return (
    <div className="ludo-page">
      <style>{CSS}</style>
      <div className="layout">
        <div className="board">
          {ORDER.map((color) => {
            const p = players.find((q) => q.color === color);
            const [cx, cy] = BASE_POS[color];
            const c = COLORS[color];
            return (
              <div key={color} className="base"
                style={{ gridColumn: `${cx} / span 6`, gridRow: `${cy} / span 6`, background: c.main,
                  opacity: p ? 1 : 0.35, boxShadow: p && me?.color === color ? `inset 0 0 0 4px #fff` : "none" }}>
                <div className="base-in">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="slot" style={{ background: c.light }}>
                      {p && p.tokens[i] === 0 && (
                        <Token color={color} n={i} active={isActive(color, i)} onClick={() => move(i)} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {TRACK.map(([x, y], idx) => {
            const sc = ORDER.find((c) => START[c] === idx);
            return (
              <div key={`t${idx}`} className="cell"
                style={{ gridColumn: x + 1, gridRow: y + 1, background: sc ? COLORS[sc].main : undefined }}>
                {SAFE.includes(idx) && <span className="star" style={{ color: sc ? "#fff" : "#94a3b8" }}>★</span>}
                {renderTokens(x, y)}
              </div>
            );
          })}

          {ORDER.map((color) =>
            LANE[color].map(([x, y]) => (
              <div key={`l${color}${x}${y}`} className="cell"
                style={{ gridColumn: x + 1, gridRow: y + 1, background: COLORS[color].main }}>
                {renderTokens(x, y)}
              </div>
            ))
          )}

          <div className="center" />
        </div>

        <aside className="side">
          <div className="card">
            <div className="label">
              Mode: {vsComputer ? "Computer 🤖" : "Local 👥"} · It's Your Turn!
            </div>
            <div className="turn">
              <i style={{ background: COLORS[me?.color || "red"].main }} />
              {me?.name}
            </div>
            <div className="status">{status}</div>
          </div>

          <div className="card dice-wrap">
            <Dice value={dice ?? 1} rolling={rolling} onClick={roll}
              disabled={!!winner || rolling || dice !== null || !!me?.isAI} />
          </div>

          <div className="card">
            {players.map((p, pi) => (
              <div key={p.color} className={`prow ${pi === turn && !winner ? "prow-on" : ""}`}>
                <i style={{ background: COLORS[p.color].main }} />
                <span>{p.name}</span>
                <b>{p.tokens.filter((t) => t === 57).length}/4 home</b>
              </div>
            ))}
          </div>
{finishOrder.length > 0 && (
  <div className="card">
    <div className="label">🏆 FINISHING ORDER</div>

    {finishOrder.map((p, index) => {
      const ranks = ["1st", "2nd", "3rd", "4th"];
      const medals = ["🥇", "🥈", "🥉", "🏅"];

      return (
        <div className="prow" key={p.color}>
          <i style={{ background: COLORS[p.color].main }} />
          <span>
            {medals[index]} {p.name}
          </span>
          <b>{ranks[index]}</b>
        </div>
      );
    })}
  </div>
)}
          <button className="new" onClick={newGame}>New Game</button>
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.ludo-page, .ludo-page * { box-sizing: border-box; }
.ludo-page { min-height: 100vh; padding: 16px; color: #e2e8f0; font-family: system-ui, sans-serif;
  background: radial-gradient(circle at 20% 0%, #1e2a4a, #0b1020 60%); }
.layout { max-width: 1100px; margin: auto; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; align-items: flex-start; }
.board { width: min(94vw, 76vh, 700px); aspect-ratio: 1; display: grid; position: relative;
  grid-template-columns: repeat(15, 1fr); grid-template-rows: repeat(15, 1fr);
  background: #fff; border: 6px solid #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px #000a; }
.base { display: grid; place-items: center; transition: box-shadow .2s; }
.base-in { width: 66%; height: 66%; background: #fff; border-radius: 14%; padding: 8%;
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10%; }
.slot { border-radius: 50%; display: grid; place-items: center; }
.slot .tk { width: 82%; }
.cell { position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  align-content: center; background: #fff; border: 1px solid #cbd5e1; }
.star { position: absolute; font-size: clamp(8px, 2vw, 16px); pointer-events: none; }
.center { grid-column: 7 / span 3; grid-row: 7 / span 3;
  background: conic-gradient(from -45deg, #22c55e 0 25%, #facc15 0 50%, #3b82f6 0 75%, #ef4444 0 100%); }
.tk { width: 78%; aspect-ratio: 1; padding: 0; border-radius: 50%; border: 2px solid var(--d); color: #fff;
  background: radial-gradient(circle at 30% 30%, var(--l), var(--m) 70%); font-weight: 800;
  font-size: clamp(8px, 1.6vw, 13px); display: grid; place-items: center; cursor: default;
  box-shadow: 0 2px 4px #0007; z-index: 2; text-shadow: 0 1px 1px #0008; }
.tk-m { width: 46%; font-size: 8px; }
.tk-on { cursor: pointer; z-index: 4; animation: pulse 0.9s infinite; }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 #fff, 0 2px 4px #0007; } 50% { box-shadow: 0 0 0 5px #ffffffaa, 0 2px 4px #0007; } }
.side { width: min(94vw, 300px); display: flex; flex-direction: column; gap: 12px; }
.card { background: #131b33; border: 1px solid #243055; border-radius: 16px; padding: 14px 16px; }
.label { font-size: 12px; color: #8b9ac4; }
.turn { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; margin-top: 4px; }
.turn i, .prow i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; flex: none; }
.status { margin-top: 6px; color: #cbd5e1; font-size: 14px; min-height: 20px; }
.dice-wrap { display: grid; place-items: center; padding: 20px; }
.dice { width: 84px; height: 84px; border: 0; border-radius: 18px; background: #f8fafc; cursor: pointer;
  padding: 10px; box-shadow: 0 6px 0 #94a3b8, 0 12px 24px #0008; }
.dice:disabled { cursor: not-allowed; opacity: .85; }
.dice-roll { animation: shake .3s infinite; }
@keyframes shake { 0% { transform: rotate(0); } 25% { transform: rotate(14deg) translateY(-4px); } 75% { transform: rotate(-14deg); } 100% { transform: rotate(0); } }
.dice-grid { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); place-items: center; }
.dot { width: 14px; height: 14px; border-radius: 50%; background: #0f172a; }
.prow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; font-size: 14px; }
.prow span { flex: 1; }
.prow b { font-weight: 600; color: #8b9ac4; font-size: 12px; }
.prow-on { background: #1d2850; }
.new { border: 0; border-radius: 12px; padding: 12px; font-weight: 700; cursor: pointer; background: #facc15; color: #1a1300; }
.new:hover { background: #fde047; }
`;
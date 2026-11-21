import { useState, useRef } from "react";
import GameIntro from "../components/GameIntro";
import {playSound} from "../playSound";
import "../SnakeLadder.css";
const LADDERS = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91, 80: 100 };
const SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 79 };
const BASE_C = ["#d62839", "#1d6fa5", "#2a9d5c", "#f5c518"];
const BASE_N = ["Red", "Blue", "Green", "yellow"];
const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const CELL = ["#ecea2f", "#fff", "#e5262b", "#1f6fd0", "#2ea043"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// square number -> centre point in % of the board
function xy(sq) {
  const i = sq - 1, row = Math.floor(i / 10), col = i % 10;
  const c = row % 2 === 0 ? col : 9 - col;
  return [c * 10 + 5, (9 - row) * 10 + 5];
}

// ladders + snakes drawn as SVG markup (built once)
function buildArt() {
  let s = "";
  for (const [a, b] of Object.entries(LADDERS)) {
    const [x1, y1] = xy(+a), [x2, y2] = xy(b);
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const px = -uy * 2, py = ux * 2;
    s += `<g stroke="#111"><line x1="${x1 + px}" y1="${y1 + py}" x2="${x2 + px}" y2="${y2 + py}" stroke-width="1"/><line x1="${x1 - px}" y1="${y1 - py}" x2="${x2 - px}" y2="${y2 - py}" stroke-width="1"/>`;
    const n = Math.max(3, Math.round(L / 3.2));
    for (let k = 0; k <= n; k++) {
      const t = k / n, cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
      s += `<line x1="${cx + px}" y1="${cy + py}" x2="${cx - px}" y2="${cy - py}" stroke-width=".9"/>`;
    }
    s += "</g>";
  }
  const SC = [["#2e9d3a", "#f2d21b"], ["#7b3fa0", "#f0e6ff"], ["#e8731a", "#f6d23a"], ["#8b4a2b", "#e0b080"], ["#1f8a3a", "#e8e05a"], ["#6a2d8f", "#cfa8ee"], ["#a0522d", "#f0c27a"], ["#2b7a2b", "#f6e27a"]];
  let i = 0;
  for (const [a, b] of Object.entries(SNAKES)) {
    const [x1, y1] = xy(+a), [x2, y2] = xy(b);
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    const [c1, c2] = SC[i++ % SC.length];
    const N = 40, waves = Math.max(1, Math.round((L / 14) * 2) / 2), amp = 3;
    const pts = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N, o = amp * Math.sin(t * Math.PI * 2 * waves);
      pts.push([x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o]);
    }
    let out = "", body = "";
    for (let k = 0; k < N; k++) {
      const w = 0.9 + 1.7 * (1 - k / N), p = pts[k], q = pts[k + 1];
      out += `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#111" stroke-width="${w + 0.5}" stroke-linecap="round"/>`;
      body += `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${Math.floor(k / 2) % 2 ? c2 : c1}" stroke-width="${w}" stroke-linecap="round"/>`;
    }
    const ang = (Math.atan2(-uy, -ux) * 180) / Math.PI;
    s += out + body + `<g transform="translate(${x1} ${y1}) rotate(${ang})"><ellipse rx="2.6" ry="2" fill="${c1}" stroke="#111" stroke-width=".4"/><circle cx=".8" cy="-.9" r=".55" fill="#fff"/><circle cx=".8" cy=".9" r=".55" fill="#fff"/><circle cx=".95" cy="-.9" r=".25" fill="#111"/><circle cx=".95" cy=".9" r=".25" fill="#111"/><path d="M2.5 0L4 0M4 0L4.8 -.6M4 0L4.8 .6" stroke="#d11" stroke-width=".3" fill="none"/></g>`;
  }
  s += '<text x="5" y="6.5" font-size="5" text-anchor="middle">⭐</text>';
  return s;
}
const ART = buildArt();

function People({ k }) {
  const w = 22 + (k - 1) * 14;
  return (
    <svg width={w} height="26" viewBox={`0 0 ${w} 26`}>
      {Array.from({ length: k }, (_, i) => {
        const x = 11 + i * 14;
        return (
          <g key={i} fill="#8a6cf0">
            <circle cx={x} cy="8" r="6" />
            <path d={`M${x - 10} 25a10 10 0 0 1 20 0z`} />
          </g>
        );
      })}
    </svg>
  );
}

export default function SnakeLadder() {
  const [phase, setPhase] = useState("setup");
  const [intro, setIntro] = useState(true);
  const [selN, setSelN] = useState(2);
  const [selC, setSelC] = useState(0);
  const [cols, setCols] = useState(BASE_C);
  const [pos, setPos] = useState([]);
  const [turn, setTurn] = useState(0);
  const [face, setFace] = useState("🎲");
  const [rolling, setRolling] = useState(false);
  const [locked, setLocked] = useState(false);
  const [winner, setWinner] = useState(null);
  const game = useRef({ pos: [], turn: 0, n: 2, names: [] });
  const busy = useRef(false);

  const lock = (v) => { busy.current = v; setLocked(v); };

  function start() {
    const rot = (a) => a.slice(selC).concat(a.slice(0, selC));
    const names = rot(BASE_N);
    game.current = { pos: Array(selN).fill(0), turn: 0, n: selN, names };
    setCols(rot(BASE_C));
    setPos(game.current.pos);
    setTurn(0);
    setFace("🎲");
    setWinner(null);
    lock(false);
    setPhase("play");
  }

  async function play() {
    if (busy.current) return;
    lock(true);
    const g = game.current, t = g.turn;
    const d = 1 + Math.floor(Math.random() * 6);
    setRolling(true);
    playSound("dice");
    for (let k = 0; k < 9; k++) {
      setFace(FACES[Math.floor(Math.random() * 6)]);
      await sleep(70);
    }
    setRolling(false);
    setFace(FACES[d - 1]);

    const p = [...g.pos];
    const target = p[t] + d;
    if (target <= 100) {
      for (let q = p[t] + 1; q <= target; q++) {
        p[t] = q;
        setPos([...p]);
        playSound("move");
        await sleep(300);
      }
      const jump = LADDERS[target] || SNAKES[target];
      if (jump) {
        await sleep(300);
        p[t] = jump;
        setPos([...p]);
      }
    }
    g.pos = p;
    if (p[t] === 100) {
      setWinner(g.names[t]);
      lock(false);
      return;
    }
    if (d !== 6) {
      g.turn = (t + 1) % g.n;
      setTurn(g.turn);
    }
    lock(false);
  }

  const color = cols[turn];
  if (intro) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <GameIntro onStart={() => setIntro(false)} />
    </div>
  );
}

  return (
    <div className="sl-root">
    <h1>Snake and Ladder</h1>

      {phase === "setup" ? (
        <div className="sl-setup">
          <div className="sl-panel">
            <h2>SELECT PLAYERS</h2>
            <div className="sl-row">
              {[2, 3, 4].map((k) => (
                <button key={k} className={"sl-tile" + (k === selN ? " on" : "")} onClick={() => setSelN(k)}>
                  <People k={k} />
                  <span>{k}P</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sl-panel light">
            <h2>CHOOSE YOUR COLOR</h2>
            <div className="sl-row">
              {BASE_C.map((c, i) => (
                <button key={i} aria-label={BASE_N[i]} className={"sl-tile col" + (i === selC ? " on" : "")} onClick={() => setSelC(i)}>
                  <span className="sl-pawn" style={{ "--pc": c }} />
                </button>
              ))}
            </div>
          </div>
          <button className="sl-go" onClick={start}>START</button>
        </div>
      ) : (
        <div className="sl-game">
          <div className="sl-board">
            <div className="sl-grid">
              {Array.from({ length: 100 }, (_, i) => {
                const r = Math.floor(i / 10), c = i % 10, row = 9 - r;
                const sq = row * 10 + (row % 2 === 0 ? c : 9 - c) + 1;
                return (
                  <div key={sq} className="sl-cell" style={{ background: CELL[(c + 2 * r + 2) % 5] }}>{sq}</div>
                );
              })}
            </div>
            <svg className="sl-art" viewBox="0 0 100 100" dangerouslySetInnerHTML={{ __html: ART }} />
            {pos.map((p, i) => {
              const pt = p === 0 ? null : xy(p);
              const ox = (i % 2 ? 1 : -1) * 1.6, oy = (i > 1 ? 1 : -1) * 1.6;
              const x = pt ? pt[0] + ox : 3 + i * 5;
              const y = pt ? pt[1] + oy : 97;
              return <div key={i} className="sl-tok" style={{ background: cols[i], left: x - 2.6 + "%", top: y - 2.6 + "%" }} />;
            })}
          </div>

          <div className="sl-bar">
            <button className="sl-roll" style={{ background: color }} disabled={locked || !!winner} onClick={play}>
              🎲 Roll Dice
            </button>
            <div className={"sl-die" + (rolling ? " rolling" : "")} style={{ borderColor: color }} onClick={() => !winner && play()}>
              {face}
            </div>
          </div>

          {winner && (
  <div className="sl-win">
    <div className="sl-trophy">🏆</div>

    <h1>VICTORY!</h1>

    <h2>{winner} PLAYER WINS!</h2>

    <p>🎉 Congratulations, Champion! 🎉</p>

    <p className="sl-win-subtitle">
      What an incredible game! You are the champion!
    </p>

    <button onClick={() => setPhase("setup")}>
      🔄 Play Again
    </button>
  </div>
)}
        </div>
      )}
    </div>
  );
}


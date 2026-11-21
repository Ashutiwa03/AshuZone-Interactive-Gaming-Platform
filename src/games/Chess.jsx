import { useState, useMemo, useEffect } from "react";
import GameIntro from "../components/GameIntro";
import { playSound } from "../playSound";

// ================= CHESS ENGINE =================

const DIRS_N = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const DIRS_K = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

const DIRS_B = [
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

const DIRS_R = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function initState() {
  const b = Array(64).fill(null);
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];

  for (let c = 0; c < 8; c++) {
    b[c] = { t: back[c], c: "b" };
    b[8 + c] = { t: "p", c: "b" };
    b[48 + c] = { t: "p", c: "w" };
    b[56 + c] = { t: back[c], c: "w" };
  }

  return {
    b,
    turn: "w",
    cas: { wk: 1, wq: 1, bk: 1, bq: 1 },
    ep: null
  };
}

function attacked(b, sq, by) {
  const r = sq >> 3;
  const c = sq & 7;

  const at = (rr, cc) =>
    rr >= 0 && rr < 8 && cc >= 0 && cc < 8
      ? b[rr * 8 + cc]
      : null;

  const pr = by === "w" ? r + 1 : r - 1;

  for (const dc of [-1, 1]) {
    const p = at(pr, c + dc);
    if (p && p.c === by && p.t === "p") return true;
  }

  for (const [d1, d2] of DIRS_N) {
    const p = at(r + d1, c + d2);
    if (p && p.c === by && p.t === "n") return true;
  }

  for (const [d1, d2] of DIRS_K) {
    const p = at(r + d1, c + d2);
    if (p && p.c === by && p.t === "k") return true;
  }

  const ray = (dirs, types) => {
    for (const [d1, d2] of dirs) {
      let rr = r + d1;
      let cc = c + d2;

      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = b[rr * 8 + cc];

        if (p) {
          if (p.c === by && types.includes(p.t)) return true;
          break;
        }

        rr += d1;
        cc += d2;
      }
    }

    return false;
  };

  return ray(DIRS_B, "bq") || ray(DIRS_R, "rq");
}

function pseudo(s, color) {
  const { b, cas, ep } = s;
  const out = [];
  const opp = color === "w" ? "b" : "w";

  for (let i = 0; i < 64; i++) {
    const p = b[i];

    if (!p || p.c !== color) continue;

    const r = i >> 3;
    const c = i & 7;

    const add = (to, x = {}) =>
      out.push({ from: i, to, ...x });

    if (p.t === "p") {
      const dir = color === "w" ? -1 : 1;
      const start = color === "w" ? 6 : 1;
      const last = color === "w" ? 0 : 7;

      const push = (to, x = {}) => {
        if ((to >> 3) === last) {
          ["q", "r", "b", "n"].forEach((pr) =>
            add(to, { ...x, promo: pr })
          );
        } else {
          add(to, x);
        }
      };

      const f = i + dir * 8;

      if (!b[f]) {
        push(f);

        const two = f + dir * 8;

        if (r === start && !b[two]) {
          add(two, { dbl: 1 });
        }
      }

      for (const dc of [-1, 1]) {
        const cc = c + dc;

        if (cc < 0 || cc > 7) continue;

        const t = (r + dir) * 8 + cc;

        if (b[t] && b[t].c === opp) {
          push(t);
        } else if (t === ep) {
          add(t, { ep: 1 });
        }
      }
    } else if (p.t === "n" || p.t === "k") {
      const dirs = p.t === "n" ? DIRS_N : DIRS_K;

      for (const [d1, d2] of dirs) {
        const rr = r + d1;
        const cc = c + d2;

        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;

        const t = rr * 8 + cc;

        if (!b[t] || b[t].c === opp) add(t);
      }

      if (p.t === "k") {
        const home = color === "w" ? 60 : 4;
        const ks = color === "w" ? "wk" : "bk";
        const qs = color === "w" ? "wq" : "bq";

        if (i === home && !attacked(b, home, opp)) {
          if (
            cas[ks] &&
            !b[home + 1] &&
            !b[home + 2] &&
            !attacked(b, home + 1, opp) &&
            !attacked(b, home + 2, opp)
          ) {
            add(home + 2, { castle: "k" });
          }

          if (
            cas[qs] &&
            !b[home - 1] &&
            !b[home - 2] &&
            !b[home - 3] &&
            !attacked(b, home - 1, opp) &&
            !attacked(b, home - 2, opp)
          ) {
            add(home - 2, { castle: "q" });
          }
        }
      }
    } else {
      const dirs =
        p.t === "b"
          ? DIRS_B
          : p.t === "r"
          ? DIRS_R
          : [...DIRS_B, ...DIRS_R];

      for (const [d1, d2] of dirs) {
        let rr = r + d1;
        let cc = c + d2;

        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          const t = rr * 8 + cc;

          if (!b[t]) {
            add(t);
          } else {
            if (b[t].c === opp) add(t);
            break;
          }

          rr += d1;
          cc += d2;
        }
      }
    }
  }

  return out;
}

function apply(s, m) {
  const b = s.b.slice();
  const p = b[m.from];
  const color = p.c;

  b[m.to] = m.promo ? { t: m.promo, c: color } : p;
  b[m.from] = null;

  if (m.ep) {
    b[m.to + (color === "w" ? 8 : -8)] = null;
  }

  if (m.castle) {
    const h = m.from;

    if (m.castle === "k") {
      b[h + 1] = b[h + 3];
      b[h + 3] = null;
    } else {
      b[h - 1] = b[h - 4];
      b[h - 4] = null;
    }
  }

  const cas = { ...s.cas };

  const clr = (sq) => {
    if (sq === 60) {
      cas.wk = 0;
      cas.wq = 0;
    }

    if (sq === 4) {
      cas.bk = 0;
      cas.bq = 0;
    }

    if (sq === 63) cas.wk = 0;
    if (sq === 56) cas.wq = 0;
    if (sq === 7) cas.bk = 0;
    if (sq === 0) cas.bq = 0;
  };

  clr(m.from);
  clr(m.to);

  return {
    b,
    turn: color === "w" ? "b" : "w",
    cas,
    ep: m.dbl ? (m.from + m.to) / 2 : null
  };
}

const kingSq = (b, c) =>
  b.findIndex((p) => p && p.t === "k" && p.c === c);

const inCheck = (s, c) =>
  attacked(s.b, kingSq(s.b, c), c === "w" ? "b" : "w");

const legal = (s) =>
  pseudo(s, s.turn).filter((m) => !inCheck(apply(s, m), s.turn));

function insufficient(s) {
  const ps = s.b.filter(Boolean).filter((p) => p.t !== "k");

  return (
    ps.length === 0 ||
    (ps.length === 1 && (ps[0].t === "b" || ps[0].t === "n"))
  );
}

// ================= COMPUTER PLAYER =================

function evalS(s) {
  let v = 0;

  for (let i = 0; i < 64; i++) {
    const p = s.b[i];

    if (!p) continue;

    const r = i >> 3;
    const c = i & 7;
    const cen = 3.5 - Math.max(
      Math.abs(r - 3.5),
      Math.abs(c - 3.5)
    );

    let x = VAL[p.t];

    if (p.t === "n" || p.t === "b") x += cen * 8;

    if (p.t === "p") {
      x += cen * 4 + (p.c === "w" ? 6 - r : r - 1) * 3;
    }

    v += p.c === "w" ? x : -x;
  }

  return v;
}

const sc = (s, m) =>
  (s.b[m.to] ? VAL[s.b[m.to].t] : 0) +
  (m.promo ? 800 : 0);

const order = (s, ms) =>
  ms.sort((x, y) => sc(s, y) - sc(s, x));

function search(s, d, alpha, beta) {
  if (d === 0) return evalS(s);

  const ms = order(s, legal(s));

  if (!ms.length) {
    return inCheck(s, s.turn)
      ? s.turn === "w"
        ? -1e5 - d
        : 1e5 + d
      : 0;
  }

  if (s.turn === "w") {
    let best = -Infinity;

    for (const m of ms) {
      const v = search(apply(s, m), d - 1, alpha, beta);

      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }

    return best;
  }

  let best = Infinity;

  for (const m of ms) {
    const v = search(apply(s, m), d - 1, alpha, beta);

    if (v < best) best = v;
    if (v < beta) beta = v;
    if (alpha >= beta) break;
  }

  return best;
}

function pickMove(s, level) {
  const ms = legal(s);

  if (!ms.length) return null;

  if (level === 0) {
    return ms[Math.floor(Math.random() * ms.length)];
  }

  const depth = level === 1 ? 2 : 3;
  const w = s.turn === "w";

  let best = w ? -Infinity : Infinity;
  let pool = [];

  for (const m of order(s, ms)) {
    const v = search(
      apply(s, m),
      depth - 1,
      -Infinity,
      Infinity
    );

    if (v === best) {
      pool.push(m);
    } else if (w ? v > best : v < best) {
      best = v;
      pool = [m];
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ================= CHESS UI =================

const GLYPH = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟"
};

const LEVELS = ["Easy", "Medium", "Hard"];

const PROMOTION_PIECES = [
  { type: "q", name: "queen", symbol: "♛" },
  { type: "r", name: "rook", symbol: "♜" },
  { type: "b", name: "bishop", symbol: "♝" },
  { type: "n", name: "knight", symbol: "♞" }
];

export default function Chess() {
  const [intro, setIntro] = useState(true);
  const[loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [mode, setMode] = useState("local");
  const [side, setSide] = useState("w");
  const [level, setLevel] = useState(1);
  const [s, setS] = useState(initState);
  const [hist, setHist] = useState([]);
  const [sel, setSel] = useState(null);
  const [last, setLast] = useState(null);
  const [thinking, setThinking] = useState(false);

  // Pawn promotion popup state
  const [pendingPromotion, setPendingPromotion] = useState(null);
  function handleIntroStart() {
  setIntro(false);
  setLoading(true);

  setTimeout(() => {
    setLoading(false);
  }, 10000);
}

  const moves = useMemo(() => legal(s), [s]);
  const check = inCheck(s, s.turn);
  const over = moves.length === 0 || insufficient(s);

  function start() {
    setS(initState());
    setHist([]);
    setSel(null);
    setLast(null);
    setPendingPromotion(null);
    setPhase("play");
  }

  function doMove(m) {
    playSound("move");

    setHist((h) => [...h, s]);
    setS(apply(s, m));
    setSel(null);
    setLast([m.from, m.to]);
  }

  // Computer's turn
  useEffect(() => {
    if (
      phase !== "play" ||
      mode !== "cpu" ||
      over ||
      s.turn === side ||
      pendingPromotion
    ) {
      return;
    }

    setThinking(true);

    const id = setTimeout(() => {
      const m = pickMove(s, level);

      if (m) doMove(m);

      setThinking(false);
    }, 350);

    return () => {
      clearTimeout(id);
      setThinking(false);
    };
    // eslint-disable-next-line
  }, [s, phase, mode, side, level]);

  // Board square click
  function click(i) {
    if (
      over ||
      thinking ||
      pendingPromotion ||
      (mode === "cpu" && s.turn !== side)
    ) {
      return;
    }

    if (sel !== null) {
      const candidates = moves.filter(
        (m) => m.from === sel && m.to === i
      );

      if (candidates.length > 0) {
        const promotionMoves = candidates.filter((m) => m.promo);

        if (promotionMoves.length > 0) {
          setPendingPromotion({
            from: sel,
            to: i,
            color: s.turn
          });

          return;
        }

        return doMove(candidates[0]);
      }
    }

    const p = s.b[i];

    setSel(p && p.c === s.turn ? i : null);
  }

  // Select Queen, Rook, Bishop or Knight
  function choosePromotion(piece) {
    if (!pendingPromotion) return;

    const move = legal(s).find(
      (m) =>
        m.from === pendingPromotion.from &&
        m.to === pendingPromotion.to &&
        m.promo === piece
    );

    if (!move) return;

    setPendingPromotion(null);
    doMove(move);
  }

  function undo() {
    if (thinking || !hist.length || pendingPromotion) return;

    const k = mode === "cpu" ? (s.turn === side ? 2 : 1) : 1;
    const idx = Math.max(0, hist.length - k);

    setS(hist[idx]);
    setHist(hist.slice(0, idx));
    setSel(null);
    setLast(null);
    setPendingPromotion(null);
  }

  if (intro) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <GameIntro onStart={handleIntroStart} />
    </div>
  );
}

if (loading) {
  return (
    <>
      <style>{CSS}</style>

      <div className="ch-loading-fullscreen">
        <img
          src="/images/chess.jpeg"
          alt="Chess"
          className="ch-loading-fullscreen-image"
        />

        <div className="ch-loading-dots"></div>
      </div>
    </>
  );
}

  const name = (c) => (c === "w" ? "White" : "Black");

  let status;

  if (over) {
    if (moves.length === 0 && check) {
      status = `Checkmate! ${name(s.turn === "w" ? "b" : "w")} wins 🎉`;
    } else if (moves.length === 0) {
      status = "Stalemate – draw";
    } else {
      status = "Draw – not enough pieces";
    }
  } else if (mode === "cpu") {
    status = thinking
      ? "Computer is thinking…"
      : s.turn === side
      ? check
        ? "Check! Your turn"
        : "Your turn"
      : "Computer's turn";
  } else {
    status = check
      ? `Check! ${name(s.turn)}'s turn`
      : `${name(s.turn)}'s turn`;
  }

  const flip = mode === "cpu" && side === "b";

  return (
    <div className="ch-root">
      <style>{CSS}</style>

      <h1>♟ AshuZone Chess</h1>

      {phase === "setup" ? (
        <div className="ch-setup">
          <div className="ch-panel">
            <h2>SELECT MODE</h2>

            <div className="ch-row">
              <button
                className={"ch-tile" + (mode === "local" ? " on" : "")}
                onClick={() => setMode("local")}
              >
                <b>👥</b>
                <span>2 Players</span>
              </button>

              <button
                className={"ch-tile" + (mode === "cpu" ? " on" : "")}
                onClick={() => setMode("cpu")}
              >
                <b>🤖</b>
                <span>Computer</span>
              </button>
            </div>
          </div>

          {mode === "cpu" && (
            <>
              <div className="ch-panel light">
                <h2>CHOOSE YOUR SIDE</h2>

                <div className="ch-row">
                  {["w", "b"].map((c) => (
                    <button
                      key={c}
                      className={"ch-tile" + (side === c ? " on" : "")}
                      onClick={() => setSide(c)}
                    >
                      <b className={"ch-pc " + c}>
                        {GLYPH.k + "\uFE0E"}
                      </b>

                      <span>{name(c)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ch-panel">
                <h2>DIFFICULTY</h2>

                <div className="ch-row">
                  {LEVELS.map((l, i) => (
                    <button
                      key={l}
                      className={
                        "ch-tile small" + (level === i ? " on" : "")
                      }
                      onClick={() => setLevel(i)}
                    >
                      <span>{l}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button className="ch-go" onClick={start}>
            START GAME ♟️
          </button>
        </div>
      ) : (
        <div className="ch-game">
          <div className={"ch-status" + (over ? " end" : "")}>
            {status}
          </div>

          <div className="ch-board">
            {Array.from({ length: 64 }, (_, d) => {
              const i = flip ? 63 - d : d;
              const r = i >> 3;
              const c = i & 7;
              const p = s.b[i];

              const tgt =
                sel !== null &&
                moves.some((m) => m.from === sel && m.to === i);

              const cls =
                "ch-sq " +
                ((r + c) % 2 ? "d" : "l") +
                (sel === i ? " sel" : "") +
                (last && (last[0] === i || last[1] === i)
                  ? " last"
                  : "") +
                (check && p && p.t === "k" && p.c === s.turn
                  ? " chk"
                  : "") +
                (tgt ? (p ? " cap" : " tgt") : "");

              return (
                <div
                  key={i}
                  className={cls}
                  onClick={() => click(i)}
                >
                  {p && (
                    <span className={"ch-pc " + p.c}>
                      {GLYPH[p.t] + "\uFE0E"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="ch-bar">
            <button onClick={undo} disabled={!hist.length || thinking}>
              ↩ Undo
            </button>

            <button
              onClick={() => {
                setPendingPromotion(null);
                setPhase("setup");
              }}
            >
              New Game
            </button>
          </div>

          {/* PAWN PROMOTION POPUP */}
          {pendingPromotion && (
            <div
              className="ch-promotion-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="promotion-title"
            >
              <div className="ch-promotion-box">
                <div className="ch-promotion-crown">♛</div>

                <h2 id="promotion-title">Choose Your Piece</h2>

                <p>
                  Your pawn reached the last row!
                  <br />
                  Apna favourite piece chuno.
                </p>

                <div className="ch-promotion-options">
                  {PROMOTION_PIECES.map((piece) => (
                    <button
                      key={piece.type}
                      className="ch-promotion-piece"
                      onClick={() => choosePromotion(piece.type)}
                    >
                      <span
                        className={
                          "ch-promotion-symbol " +
                          pendingPromotion.color
                        }
                      >
                        {GLYPH[piece.type] + "\uFE0E"}
                      </span>

                      <span className="ch-promotion-name">
                        {piece.name}
                      </span>

                      <span className="ch-promotion-english">
                        {piece.type === "q"
                          ? "Queen"
                          : piece.type === "r"
                          ? "Rook"
                          : piece.type === "b"
                          ? "Bishop"
                          : "Knight"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================= STYLES =================

const CSS = `
.ch-root {
  background: #07182b;
  color: #f3f7ff;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  box-sizing: border-box;
}

.ch-root * {
  box-sizing: border-box;
}

.ch-root h1 {
  font-size: 1.5rem;
  margin: 8px 0 18px;
  text-align: center;
  color: #ffffff;
  text-shadow: 0 2px 8px #008bd1;
}

.ch-setup,
.ch-game {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.ch-setup {
  align-items: stretch;
  gap: 16px;
}

.ch-panel {
  background: linear-gradient(145deg, #05618d, #123c79);
  border: 2px solid #8fd0f7;
  border-radius: 22px;
  padding: 18px 12px 20px;
  text-align: center;
}

.ch-panel.light {
  background: linear-gradient(145deg, #8fd0f7, #197bb4);
}

.ch-panel h2 {
  margin: 0 0 16px;
  font-size: 1.2rem;
  letter-spacing: 0.5px;
  color: #fff;
  text-shadow: 0 2px 3px #0005;
}

.ch-row {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}

.ch-tile {
  position: relative;
  font: inherit;
  width: 112px;
  min-height: 92px;
  border-radius: 18px;
  border: 2px solid #8fd0f7;
  background: #1679ad;
  color: #fff;
  font-weight: 800;
  font-size: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  padding: 8px;
}

.ch-tile b {
  font-size: 2rem;
  line-height: 1;
}

.ch-tile.small {
  width: 90px;
  min-height: 56px;
}

.ch-tile.on {
  background: #e8aa22;
  border-color: #fff0a6;
  color: #172337;
}

.ch-tile.on::after {
  content: "✓";
  position: absolute;
  top: -10px;
  right: -8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #20a653;
  border: 2px solid #fff;
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ch-go {
  font: inherit;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(90deg, #0785ce, #12b9df);
  border: 2px solid #8fd0f7;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  letter-spacing: 1px;
}

.ch-status {
  width: 100%;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 700;
  padding: 12px 8px;
  border-radius: 12px;
  background: #0d2945;
  border: 1px solid #2479a9;
}

.ch-status.end {
  background: #e8aa22;
  color: #2b1d00;
}

.ch-board {
  --w: min(94vw, 480px);
  width: var(--w);
  height: var(--w);
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  border: 4px solid #8fd0f7;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: 0 8px 28px #0005;
}

.ch-sq {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: calc(var(--w) / 8 * 0.78);
  line-height: 1;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.ch-sq.l {
  background: #8fd0f7;
}

.ch-sq.d {
  background: #05618d;
}

.ch-sq.last {
  box-shadow: inset 0 0 0 100px #f6e45a66;
}

.ch-sq.sel {
  box-shadow: inset 0 0 0 100px #4fd16a88;
}

.ch-sq.chk {
  box-shadow: inset 0 0 0 100px #ff3b3b99;
}

.ch-sq.tgt::after {
  content: "";
  width: 28%;
  height: 28%;
  border-radius: 50%;
  background: #10283c88;
  position: absolute;
}

.ch-sq.cap::after {
  content: "";
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  border: 4px solid #e0343499;
}

.ch-pc {
  position: relative;
  z-index: 1;
}

.ch-pc.w {
  color: #fff;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 2px 3px #0008;
}

.ch-pc.b {
  color: #111820;
  text-shadow: 0 1px 2px #fff8;
}

.ch-tile .ch-pc {
  font-size: 2.2rem;
}

.ch-bar {
  display: flex;
  gap: 12px;
  width: 100%;
}

.ch-bar button {
  flex: 1;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid #8fd0f7;
  background: #1679ad;
  color: #fff;
  cursor: pointer;
}

.ch-bar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* PAWN PROMOTION */
.ch-promotion-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 8, 20, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: chFadeIn 0.2s ease;
}

.ch-promotion-box {
  width: 100%;
  max-width: 390px;
  background: linear-gradient(145deg, #102b4c, #075c8b);
  color: #fff;
  border: 2px solid #8fd0f7;
  border-radius: 24px;
  padding: 24px 14px;
  text-align: center;
  box-shadow: 0 12px 45px #0008;
  animation: chPopIn 0.25s ease;
}

.ch-promotion-crown {
  font-size: 2.7rem;
  line-height: 1.1;
  margin-bottom: 8px;
  color: #ffdf77;
}

.ch-promotion-box h2 {
  margin: 0 0 10px;
  font-size: 1.45rem;
  color: #fff;
}

.ch-promotion-box p {
  margin: 0 0 20px;
  line-height: 1.6;
  color: #e1f4ff;
  font-size: 0.92rem;
}

.ch-promotion-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.ch-promotion-piece {
  min-width: 0;
  min-height: 105px;
  border: 2px solid #8fd0f7;
  border-radius: 14px;
  background: linear-gradient(160deg, #218ac0, #07527e);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  cursor: pointer;
  padding: 8px 2px;
  transition: background 0.15s, transform 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.ch-promotion-piece:active {
  background: #e8aa22;
  color: #10243b;
  transform: scale(0.96);
}

.ch-promotion-symbol {
  font-size: 2.35rem;
  line-height: 1.1;
}

.ch-promotion-symbol.w {
  color: #fff;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
}

.ch-promotion-symbol.b {
  color: #171717;
  text-shadow: 0 1px 2px #fff;
}

.ch-promotion-name {
  font-size: 0.82rem;
  font-weight: 800;
}

.ch-promotion-english {
  font-size: 0.68rem;
  opacity: 0.85;
}

@keyframes chFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes chPopIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 360px) {
  .ch-promotion-box {
    padding: 20px 8px;
  }

  .ch-promotion-options {
    gap: 5px;
  }

  .ch-promotion-piece {
    min-height: 94px;
  }

  .ch-promotion-symbol {
    font-size: 2rem;
  }

  .ch-promotion-name {
    font-size: 0.75rem;
  }

  .ch-promotion-english {
    font-size: 0.62rem;
  }
}

/* FULL-SCREEN CHESS LOADING */
.ch-loading-fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #000;
  z-index: 999999;
  box-sizing: border-box;
}

.ch-loading-fullscreen-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  object-position: center;
  display: block;
}

.ch-loading-dots {
  position: absolute;
  bottom: 25px;
  left: 5%;
  width: 90%;
  height: 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.35);
  overflow: hidden;
}

.ch-loading-dots::after {
  content: "";
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
  animation: chessBarFill 10s linear forwards;
}

@keyframes chessBarFill {
  from { width: 0; }
  to { width: 100%; }
}
`;
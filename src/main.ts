import "./style.css";
import { renderBlorb, type Expression } from "./blorb";
import { type DealtBoard, dailyBoard } from "./board";
import { type GameState, tap, trioKey } from "./game";
import { todayIso } from "./seed";
import { formatDate, formatTime, shareText } from "./share";

// Dev/raster affordances: ?date=YYYY-MM-DD forces the daily date; ?autoplay=1 skips the gate.
const params = new URLSearchParams(location.search);
const qdate = params.get("date") ?? "";
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/.test(qdate) ? qdate : todayIso();

type Mode = "daily" | "practice";
type Session = {
  mode: Mode;
  deal: DealtBoard;
  game: GameState;
  startedAt: number | null;
  elapsedMs: number | null; // frozen on win
  timerId: number;
};

const app = document.getElementById("app")!;
let session!: Session; // definite-assignment: startSession runs at boot before any handler

const el = (id: string) => document.getElementById(id)!;
const stageEl = () => el("stage");
const cardEl = (i: number) => stageEl().querySelector(`[data-i="${i}"]`)!;

const shell = () => {
  app.innerHTML = `
    <header>
      <h1>Blorble</h1>
      <div class="hud">
        <span id="badge" class="badge" hidden>practice</span>
        <span id="timer">0:00</span>
      </div>
      <nav></nav>
    </header>
    <section id="stage"></section>
    <section id="found"></section>
    <footer>inspired by the card game SET · not affiliated with Set Enterprises/PlayMonster</footer>`;
};

// ---------- timer ----------
const stopTimer = () => clearInterval(session.timerId);
const startTimer = () => {
  stopTimer();
  const tick = () => {
    if (session.startedAt !== null && session.elapsedMs === null)
      el("timer").textContent = formatTime(Date.now() - session.startedAt);
  };
  session.timerId = window.setInterval(tick, 250);
  tick();
};

// ---------- rendering ----------
const renderGate = () => {
  const art = ([[0, 1, 0, 0], [1, 2, 1, 1], [2, 0, 2, 2]] as const)
    .map((c, i) => `<span>${renderBlorb(c, `g${i}`)}</span>`)
    .join("");
  stageEl().innerHTML = `
    <div class="gate">
      <div class="gate-art">${art}</div>
      <p>12 Blorbs are hiding <b>6 Sets</b>. The clock starts when you peek!</p>
      <button id="btn-play" class="primary">Play · ${formatDate(DATE_ISO)}</button>
    </div>`;
  el("btn-play").addEventListener("click", reveal);
};

const renderBoard = () => {
  stageEl().innerHTML = `<div id="board">${session.deal.cards
    .map((c, i) => `<button class="card" data-i="${i}">${renderBlorb(c, `c${i}`)}</button>`)
    .join("")}</div>`;
  for (const btn of stageEl().querySelectorAll<HTMLButtonElement>(".card"))
    btn.addEventListener("click", () => onTap(Number(btn.dataset.i)));
  renderFound();
};

const miniTrio = (key: string, slot: number) =>
  key.split("-").map(Number)
    .map((i) => `<span class="mini">${renderBlorb(session.deal.cards[i]!, `f${slot}-${i}`)}</span>`)
    .join("");

const renderFound = () => {
  el("found").innerHTML = Array.from({ length: 6 }, (_, n) => {
    const key = session.game.foundKeys[n];
    return key
      ? `<div class="slot filled" data-key="${key}">${miniTrio(key, n)}</div>`
      : `<div class="slot"></div>`;
  }).join("");
};

const setFace = (i: number, expression: Expression) => {
  const btn = stageEl().querySelector(`[data-i="${i}"]`);
  if (btn) btn.innerHTML = renderBlorb(session.deal.cards[i]!, `c${i}`, expression);
};

// Flash an expression + animation class on a trio, then return to rest.
// Generation-guarded: daily boards have overlapping Sets, and the user can
// switch screens mid-window — a stale timeout must not clobber a newer
// reaction or touch a board that's gone.
const reactGen: number[] = Array(12).fill(0);
const react = (trio: number[], expression: Expression, cls: string, ms: number) => {
  for (const i of trio) {
    reactGen[i] = (reactGen[i] ?? 0) + 1;
    setFace(i, expression);
    cardEl(i).classList.add(cls);
  }
  const gen = trio.map((i) => reactGen[i]);
  window.setTimeout(() => {
    trio.forEach((i, t) => {
      if (reactGen[i] !== gen[t]) return; // a newer reaction owns this card
      const btn = stageEl().querySelector(`[data-i="${i}"]`);
      if (!btn) return; // board no longer on screen
      btn.classList.remove(cls);
      if (session.elapsedMs === null) setFace(i, "rest"); // stay happy after a win
    });
  }, ms);
};

// ---------- game flow ----------
const onTap = (i: number) => {
  if (session.elapsedMs !== null) return;
  const { state, event } = tap(session.game, i);
  session.game = state;
  switch (event.kind) {
    case "select": cardEl(i).classList.add("sel"); break;
    case "deselect": cardEl(i).classList.remove("sel"); break;
    case "found": {
      clearSel();
      renderFound();
      react(event.trio, "happy", "happy", 800);
      if (event.won) win();
      break;
    }
    case "duplicate": {
      clearSel();
      const slot = el("found").querySelector(`[data-key="${trioKey(event.trio)}"]`);
      slot?.classList.add("wiggle");
      window.setTimeout(() => slot?.classList.remove("wiggle"), 500);
      break;
    }
    case "invalid": {
      clearSel();
      react(event.trio, "grumpy", "grumpy", 650);
      break;
    }
  }
};

const clearSel = () => {
  for (const b of stageEl().querySelectorAll(".sel")) b.classList.remove("sel");
};

const reveal = () => {
  session.startedAt = Date.now();
  renderBoard();
  startTimer();
  const n = Math.min(Number(params.get("solve") ?? 0), session.deal.sets.length);
  for (const set of session.deal.sets.slice(0, n)) for (const i of set) onTap(i);
};

const win = () => {
  session.elapsedMs = Date.now() - (session.startedAt ?? Date.now());
  stopTimer();
  el("timer").textContent = formatTime(session.elapsedMs);
  for (let i = 0; i < session.deal.cards.length; i++) {
    setFace(i, "happy");
    cardEl(i).classList.add("happy");
  }
  renderResult();
};

const renderResult = () => {
  el("found").insertAdjacentHTML(
    "beforeend",
    `<div class="result"><b>6/6 · ${formatTime(session.elapsedMs!)}</b><button id="btn-share" class="primary">Share</button></div>`,
  );
  el("btn-share").addEventListener("click", onShare);
};

const onShare = async () => {
  const text = shareText(DATE_ISO, session.elapsedMs!, session.mode === "practice");
  const btn = el("btn-share");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    window.setTimeout(() => (btn.textContent = "Share"), 1500);
  } catch {
    window.prompt("Copy your result:", text); // http/file fallback
  }
};

const startSession = (mode: Mode) => {
  if (session) stopTimer();
  const deal = dailyBoard(DATE_ISO);
  session = {
    mode, deal,
    game: { cards: deal.cards, selected: [], foundKeys: [] },
    startedAt: null, elapsedMs: null, timerId: 0,
  };
  el("timer").textContent = "0:00";
  renderGate();
  renderFound();
};

// ---------- boot ----------
shell();
startSession("daily");
if (params.get("autoplay") === "1") reveal();

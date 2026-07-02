import "./style.css";
import { renderBlorb } from "./blorb";
import { type DealtBoard, dailyBoard } from "./board";
import { type GameState, tap } from "./game";
import { todayIso } from "./seed";
import { formatDate, formatTime } from "./share";

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

const renderFound = () => {
  el("found").innerHTML = Array.from({ length: 6 }, () => `<div class="slot"></div>`).join("");
};

// ---------- game flow ----------
const onTap = (i: number) => {
  if (session.elapsedMs !== null) return; // finished
  const { state, event } = tap(session.game, i);
  session.game = state;
  switch (event.kind) {
    case "select": cardEl(i).classList.add("sel"); break;
    case "deselect": cardEl(i).classList.remove("sel"); break;
    default: clearSel(); break; // found/duplicate/invalid resolve visually in Task 12
  }
};

const clearSel = () => {
  for (const b of stageEl().querySelectorAll(".sel")) b.classList.remove("sel");
};

const reveal = () => {
  session.startedAt = Date.now();
  renderBoard();
  startTimer();
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

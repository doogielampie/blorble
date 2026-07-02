import "./style.css";
import { renderBlorb, type Expression } from "./blorb";
import { MODES, type DealtBoard, type PuzzleMode, dailyBoard, practiceBoard } from "./board";
import { cardLines, renderStatsCard } from "./card";
import { type GameState, type Hint, hint, tap, trioKey } from "./game";
import { todayIso } from "./seed";
import { formatDate, formatTime, shareText } from "./share";
import { type DayProgress, type SavedState, freshDay, load, recordWin, save } from "./state";

// Dev/raster affordances: ?date=YYYY-MM-DD forces the daily date; ?autoplay=1 skips the gate.
const params = new URLSearchParams(location.search);
const qdate = params.get("date") ?? "";
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/.test(qdate) ? qdate : todayIso();

// A daily tab left open across UTC midnight must not keep serving yesterday's
// board: re-sync when the player returns to the tab, and guard the moment of
// reveal. (No mid-play rug-pull — neither fires while actively playing.)
const dateRolled = () => !params.get("date") && todayIso() !== DATE_ISO;
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && dateRolled()) location.reload();
});

type Session = {
  mode: PuzzleMode;
  practice: boolean;
  deal: DealtBoard;
  game: GameState;
  startedAt: number | null;
  elapsedMs: number | null;
  timerId: number;
  hints: number;
  wrongs: number;
};

const app = document.getElementById("app")!;
let session!: Session; // definite-assignment: startSession runs at boot before any handler

// Sessions driven by dev/raster params live in a separate storage bucket so a
// crafted link can never touch (or fake) real daily stats.
// DEV_SESSION line changes to (mode is a shareable link param, NOT isolated):
const DEV_SESSION = params.has("date") || params.has("solve") || params.has("autoplay") || params.has("hint");
const storage: Pick<Storage, "getItem" | "setItem"> = DEV_SESSION
  ? {
      getItem: (k) => localStorage.getItem(`dev.${k}`),
      setItem: (k, v) => localStorage.setItem(`dev.${k}`, v),
    }
  : localStorage;
let saved: SavedState = freshDay(load(storage), DATE_ISO);
const persist = () => save(storage, saved);

let statsBlob: Blob | null = null;
let statsUrl: string | null = null;

const el = (id: string) => document.getElementById(id)!;
const stageEl = () => el("stage");
const cardEl = (i: number) => stageEl().querySelector(`[data-i="${i}"]`)!;

// Legend rows render actual Blorbs so a beginner sees each feature, not just reads its name.
const legendRow = (label: string, uidPrefix: string, cards: readonly [number, number, number, number][]) => `
      <span>${label}</span>
      <div class="row3">${cards.map((c, i) => `<span>${renderBlorb(c, `${uidPrefix}${i}`)}</span>`).join("")}</div>`;

const howtoDialogHtml = () => `
    <dialog id="howto">
      <h2>How to play</h2>
      <p>Every Blorb has 4 features: colour, eyes, shape, and pattern.</p>
      <div class="legend">
        ${legendRow("Colour", "hc", [[0, 1, 0, 0], [1, 1, 0, 0], [2, 1, 0, 0]])}
        ${legendRow("Eyes", "he", [[0, 0, 0, 0], [0, 1, 0, 0], [0, 2, 0, 0]])}
        ${legendRow("Shape", "hs", [[0, 1, 0, 0], [0, 1, 1, 0], [0, 1, 2, 0]])}
        ${legendRow("Pattern", "hp", [[0, 1, 0, 0], [0, 1, 0, 1], [0, 1, 0, 2]])}
      </div>
      <p>A Set is 3 Blorbs where each feature is the same on all three, or different on all three.</p>
      <div class="example">${([[0, 1, 0, 0], [1, 1, 0, 0], [2, 1, 0, 0]] as const)
        .map((c, i) => `<span>${renderBlorb(c, `ht${i}`)}</span>`).join("")}</div>
      <p class="caption">Three different colours, everything else the same. That's a Set.</p>
      <div class="example">${([[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2]] as const)
        .map((c, i) => `<span>${renderBlorb(c, `hx${i}`)}</span>`).join("")}</div>
      <p class="caption">Every feature different on all three. Also a Set.</p>
      <p>If one feature is two of a kind, it's not a Set.</p>
      <p>Find every Set on the board to win: Blorblet hides 4, Blorble hides 6. A Blorb can belong to more than one Set.</p>
      <p>Stuck? A hint points at a Blorb from a Set you haven't found yet. It builds on whatever you've already picked. If your picks can't become a Set, the hint shakes them instead. Hints and wrong guesses show up in your shared result.</p>
      <p class="fineprint">inspired by the card game SET · not affiliated with Set Enterprises/PlayMonster</p>
      <form method="dialog"><button class="primary">Got it</button></form>
    </dialog>`;

const shell = () => {
  app.innerHTML = `
    <header>
      <h1>Blorble</h1>
      <div class="hud">
        <span id="badge" class="badge" hidden>practice</span>
        <span id="timer">0:00</span>
      </div>
      <nav><button id="btn-help" class="chip">?</button></nav>
    </header>
    <div class="bar">
      <div class="tabs" id="tabs">
        <button class="tab" data-mode="blorblet">Blorblet</button>
        <button class="tab" data-mode="blorble">Blorble</button>
      </div>
      <div class="actions">
        <button id="btn-hint" class="chip" hidden>💡 Hint</button>
        <button id="btn-practice" class="chip">🎲</button>
      </div>
    </div>
    <section id="stage"></section>
    <section id="found"></section>
    ${howtoDialogHtml()}${resultDialogHtml()}`;
  for (const t of app.querySelectorAll<HTMLButtonElement>(".tab"))
    t.addEventListener("click", () => startSession(t.dataset.mode as PuzzleMode, false));
  el("btn-practice").addEventListener("click", () => startSession(session.mode, !session.practice));
  el("btn-hint").addEventListener("click", onHint);
  el("btn-help").addEventListener("click", openHowTo);
  el("btn-copy-text").addEventListener("click", () => void onCopyText());
  el("btn-copy-image").addEventListener("click", () => void onCopyImage());
  el("btn-save-image").addEventListener("click", onSaveImage);
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.href = "data:image/svg+xml," + encodeURIComponent(renderBlorb([0, 1, 0, 0], "fav"));
  document.head.append(icon);
};

const openHowTo = () => {
  const dlg = el("howto") as HTMLDialogElement;
  dlg.showModal();
  dlg.scrollTop = 0; // showModal() autofocuses the trailing button and drags the scroll with it
  if (!saved.seenHowTo) {
    saved = { ...saved, seenHowTo: true };
    persist();
  }
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
const GATE_TAGLINE: Record<PuzzleMode, string> = {
  blorble: "12 Blorbs, 6 hidden Sets. The clock starts when you peek and doesn't stop until you find them all.",
  blorblet: "The quick one: 9 Blorbs, 4 hidden Sets. Same deal: the clock runs from peek to finish.",
};

const renderGate = () => {
  const art = ([[0, 1, 0, 0], [1, 2, 1, 1], [2, 0, 2, 2]] as const)
    .map((c, i) => `<span>${renderBlorb(c, `g${i}`)}</span>`)
    .join("");
  stageEl().innerHTML = `
    <div class="gate">
      <div class="gate-art">${art}</div>
      <p>${GATE_TAGLINE[session.mode]}</p>
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
  el("found").innerHTML = Array.from({ length: session.game.target }, (_, n) => {
    const key = session.game.foundKeys[n];
    return key
      ? `<div class="slot filled" data-key="${key}">${miniTrio(key, n)}</div>`
      : `<div class="slot"></div>`;
  }).join("");
  for (const slot of el("found").querySelectorAll<HTMLElement>(".slot.filled"))
    slot.addEventListener("click", () => {
      for (const i of slot.dataset.key!.split("-").map(Number)) {
        const c = cardEl(i);
        c.classList.add("refind");
        window.setTimeout(() => c.classList.remove("refind"), 1200);
      }
    });
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
      persistDay({ foundKeys: session.game.foundKeys });
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
      session.wrongs++;
      persistDay({ wrongs: session.wrongs });
      clearSel();
      react(event.trio, "grumpy", "grumpy", 650);
      break;
    }
  }
};

const clearSel = () => {
  for (const b of stageEl().querySelectorAll(".sel")) b.classList.remove("sel");
};

const persistDay = (patch: Partial<DayProgress>) => {
  if (session.practice) return;
  const cur = saved.days[session.mode];
  if (!cur) return;
  saved = { ...saved, days: { ...saved.days, [session.mode]: { ...cur, ...patch } } };
  persist();
};

const reveal = () => {
  if (!session.practice && dateRolled()) return location.reload();
  if (!session.practice) {
    if (!saved.days[session.mode]) {
      saved = { ...saved, days: { ...saved.days, [session.mode]: {
        date: DATE_ISO, foundKeys: [], startedAt: Date.now(), elapsedMs: null, hints: 0, wrongs: 0,
      } } };
      persist();
    }
    const rec = saved.days[session.mode]!;
    session.startedAt = rec.startedAt ?? Date.now();
    session.game = { ...session.game, foundKeys: [...rec.foundKeys] };
    session.hints = rec.hints;
    session.wrongs = rec.wrongs;
  } else {
    session.startedAt = Date.now();
  }
  el("btn-hint").hidden = false;
  renderBoard();
  startTimer();
  const n = Math.min(Number(params.get("solve") ?? 0), session.deal.sets.length);
  for (const set of session.deal.sets.slice(0, n)) for (const i of set) onTap(i);
  if (params.get("hint") === "1") onHint(); // raster affordance
};

const onHint = () => {
  if (session.elapsedMs !== null || session.startedAt === null) return;
  const h = hint(session.game, session.deal.sets);
  if (!h) return;
  session.hints++;
  persistDay({ hints: session.hints });
  if (h.kind === "deadend") {
    for (const i of session.game.selected) {
      const c = cardEl(i);
      c.classList.add("shake");
      window.setTimeout(() => c.classList.remove("shake"), 500);
    }
    return;
  }
  const c = cardEl(h.index);
  c.classList.add("hinted");
  const clear = () => c.classList.remove("hinted");
  c.addEventListener("click", clear, { once: true });
};

const win = () => {
  for (const c of stageEl().querySelectorAll(".hinted")) c.classList.remove("hinted");
  session.elapsedMs = Date.now() - (session.startedAt ?? Date.now());
  if (!session.practice) {
    saved = recordWin(saved, session.mode, DATE_ISO, session.elapsedMs);
    persist();
  }
  stopTimer();
  el("timer").textContent = formatTime(session.elapsedMs);
  for (let i = 0; i < session.deal.cards.length; i++) {
    setFace(i, "happy");
    cardEl(i).classList.add("happy");
  }
  renderResultBar();
  void openResult();
};

const renderResultBar = () => {
  const again = session.practice ? `<button id="btn-again" class="chip">New board</button>` : "";
  el("found").insertAdjacentHTML(
    "beforeend",
    `<div class="result"><b>${session.game.foundKeys.length}/${session.game.target} · ${formatTime(session.elapsedMs!)}</b>` +
      `<button id="btn-results" class="primary">Results</button>${again}</div>`,
  );
  el("btn-results").addEventListener("click", () => void openResult());
  document.getElementById("btn-again")?.addEventListener("click", () => startSession(session.mode, true));
};

const resultDialogHtml = () => `
  <dialog id="result">
    <div id="result-body"></div>
    <div class="result-buttons">
      <button id="btn-copy-text" class="chip">Copy text</button>
      <button id="btn-copy-image" class="primary" disabled>Copy image</button>
      <button id="btn-save-image" class="chip" disabled>Save</button>
    </div>
    <form method="dialog"><button class="chip">Close</button></form>
  </dialog>`;

const shareInfo = () => ({
  label: MODES[session.mode].label, isoDate: DATE_ISO, elapsedMs: session.elapsedMs!,
  hints: session.hints, wrongs: session.wrongs, practice: session.practice,
});

const openResult = async () => {
  statsBlob = null;
  if (statsUrl) { URL.revokeObjectURL(statsUrl); statsUrl = null; }
  (el("btn-copy-image") as HTMLButtonElement).disabled = true;
  (el("btn-save-image") as HTMLButtonElement).disabled = true;
  const info = { ...shareInfo(), streak: saved.streak, best: saved.best[session.mode] };
  el("result-body").innerHTML =
    `<h2>${session.game.foundKeys.length}/${session.game.target} · ${formatTime(session.elapsedMs!)}</h2>` +
    cardLines(info).map((l) => `<p class="stat">${l}</p>`).join("");
  (el("result") as HTMLDialogElement).showModal();
  try {
    statsBlob = await renderStatsCard(info, renderBlorb(session.deal.cards[0]!, "mascot", "happy"));
    statsUrl = URL.createObjectURL(statsBlob);
    el("result-body").insertAdjacentHTML("beforeend", `<img class="stats-card" src="${statsUrl}" alt="">`);
    (el("btn-copy-image") as HTMLButtonElement).disabled = false;
    (el("btn-save-image") as HTMLButtonElement).disabled = false;
  } catch { /* canvas unavailable — text sharing still works, image buttons stay disabled */ }
};

const onCopyText = async () => {
  const text = shareText(shareInfo());
  const btn = el("btn-copy-text");
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    window.setTimeout(() => (btn.textContent = "Copy text"), 1500);
  } catch {
    window.prompt("Copy your result:", text);
  }
};

const onCopyImage = async () => {
  if (!statsBlob) return;
  const file = new File([statsBlob], `blorble-${DATE_ISO}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch { /* fall through */ }
  }
  const btn = el("btn-copy-image");
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": statsBlob })]);
    btn.textContent = "Copied!";
    window.setTimeout(() => (btn.textContent = "Copy image"), 1500);
  } catch {
    onSaveImage(); // clipboard-image unsupported → download instead
  }
};

const onSaveImage = () => {
  if (!statsUrl) return;
  const a = document.createElement("a");
  a.href = statsUrl;
  a.download = `blorble-${DATE_ISO}.png`;
  a.click();
};

const startSession = (mode: PuzzleMode, practice: boolean) => {
  if (session) stopTimer();
  const m = MODES[mode];
  const deal = practice ? practiceBoard(mode) : dailyBoard(DATE_ISO, mode);
  const dayRec = practice ? null : saved.days[mode];
  session = {
    mode, practice, deal,
    game: { cards: deal.cards, selected: [], foundKeys: [], target: m.targetSets },
    startedAt: null, elapsedMs: null, timerId: 0,
    hints: dayRec?.hints ?? 0, wrongs: dayRec?.wrongs ?? 0,
  };
  for (const t of app.querySelectorAll<HTMLButtonElement>(".tab"))
    t.classList.toggle("active", t.dataset.mode === mode);
  el("badge").hidden = !practice;
  el("btn-hint").hidden = true;
  el("timer").textContent = "0:00";
  el("found").className = mode; // slot layout hook (Task 8)
  if (!practice) { saved = { ...saved, lastMode: mode }; persist(); }

  if (practice) { reveal(); return; }
  if (dayRec?.elapsedMs != null) {           // finished earlier today
    session.game = { ...session.game, foundKeys: [...dayRec.foundKeys] };
    session.startedAt = dayRec.startedAt;
    session.elapsedMs = dayRec.elapsedMs;
    el("timer").textContent = formatTime(session.elapsedMs);
    renderBoard();
    for (let i = 0; i < session.deal.cards.length; i++) setFace(i, "happy");
    renderResultBar();
  } else if (dayRec?.startedAt != null) {    // resume mid-game
    reveal();
  } else {
    renderGate();
    renderFound();
  }
};

// ---------- boot ----------
shell();
const qmode = params.get("mode");
const bootMode: PuzzleMode = qmode === "blorblet" ? "blorblet" : qmode === "blorble" ? "blorble" : saved.lastMode;
startSession(bootMode, params.get("practice") === "1");
// auto-reveal only when a daily gate is actually showing
if (params.get("autoplay") === "1" && !session.practice && session.startedAt === null) reveal();
// first-visit how-to: only when NEITHER daily has been touched, never under dev params
if (params.get("howto") === "1" ||
    (!saved.seenHowTo && !saved.days.blorble && !saved.days.blorblet &&
      params.get("autoplay") !== "1" && params.get("practice") !== "1"))
  openHowTo();

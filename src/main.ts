import "./style.css";
import { renderBlorb, type Expression } from "./blorb";
import { MODES, type DealtBoard, type PuzzleMode, dailyBoard, practiceBoard } from "./board";
import { cardLines, renderStatsCard } from "./card";
import { type GameState, type Hint, hint, tap, trioKey } from "./game";
import { todayIso } from "./seed";
import { formatDate, formatTime, shareText } from "./share";
import { type DayProgress, type SavedState, freshDay, load, recordWin, save } from "./state";

// Dev/raster affordances: ?date=YYYY-MM-DD forces the daily date; ?autoplay=1 skips the landing.
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
// definite-assignment: a fresh visit reaches showLanding() with session still
// unassigned (guarded there); every other path runs startSession at boot
// before any handler can read session.
let session!: Session;

// Sessions driven by dev/raster params live in a separate storage bucket so a
// crafted link can never touch (or fake) real daily stats.
// mode is a shareable link param, NOT isolated:
const DEV_SESSION = params.has("date") || params.has("solve") || params.has("autoplay") || params.has("hint");
const storage: Pick<Storage, "getItem" | "setItem"> = DEV_SESSION
  ? {
      getItem: (k) => localStorage.getItem(`dev.${k}`),
      setItem: (k, v) => localStorage.setItem(`dev.${k}`, v),
    }
  : localStorage;
let saved: SavedState = freshDay(load(storage), DATE_ISO);
// Another same-origin tab may be playing the OTHER daily — merge its freshest
// same-date progress and bests before writing, so last-writer doesn't clobber.
const persist = () => {
  const disk = load(storage);
  const other: PuzzleMode = session.mode === "blorble" ? "blorblet" : "blorble";
  const minNonNull = (a: number | null, b: number | null) =>
    a === null ? b : b === null ? a : Math.min(a, b);
  saved = {
    ...saved,
    days: {
      ...saved.days,
      [other]: disk.days[other]?.date === DATE_ISO ? disk.days[other] : saved.days[other],
    },
    best: {
      blorble: minNonNull(saved.best.blorble, disk.best.blorble),
      blorblet: minNonNull(saved.best.blorblet, disk.best.blorblet),
    },
  };
  save(storage, saved);
};

let statsBlob: Blob | null = null;
let statsUrl: string | null = null;
let openResultGen = 0;

const el = (id: string) => document.getElementById(id)!;
const stageEl = () => el("stage");
const cardEl = (i: number) => stageEl().querySelector(`[data-i="${i}"]`)!;

// Tiny inline-SVG icon helpers (no icon-font dependency).
const svg = (paths: string, viewBox = "0 0 24 24") =>
  `<svg viewBox="${viewBox}" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
const backIcon = () => svg(`<path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
const checkIcon = () => svg(`<path d="M4 12.5 L9.5 18 L20 6" fill="none" stroke="#0f6e56" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
const bulbIcon = () => svg(`<path d="M12 3a6 6 0 0 0-3.2 11.08c.45.3.7.8.7 1.32V17h5v-1.6c0-.52.25-1.02.7-1.32A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 20h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 22h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`);

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
      <p>The clock starts when you peek and runs until you finish.</p>
      <p class="fineprint">inspired by the card game SET · not affiliated with Set Enterprises/PlayMonster</p>
      <form method="dialog"><button class="primary">Got it</button></form>
    </dialog>`;

// Fixed sample trios shown on the landing cards (uids namespaced lc*/ld* so
// they never collide with in-game `c${i}` or how-to `h*` uids).
const LANDING_TRIOS: Record<PuzzleMode, { uid: string; cards: readonly [number, number, number, number][] }> = {
  blorblet: { uid: "lc", cards: [[0, 0, 0, 0], [1, 0, 0, 1], [2, 0, 0, 2]] },
  blorble: { uid: "ld", cards: [[0, 2, 1, 2], [1, 2, 2, 1], [2, 2, 0, 0]] },
};

const levelCardHtml = (mode: PuzzleMode) => {
  const m = MODES[mode];
  return `
    <div class="level-card" data-mode="${mode}">
      <div class="row3" data-art></div>
      <h2>${m.label}</h2>
      <span class="mut">${m.size} Blorbs · ${m.targetSets} Sets</span>
      <div class="level-state" data-state></div>
    </div>`;
};

const shell = () => {
  app.innerHTML = `
    <header id="hdr-landing">
      <h1>Blorble</h1>
      <div class="hdr-right">
        <span id="landing-date" class="mut"></span>
        <button id="btn-help" class="chip round">?</button>
      </div>
    </header>
    <section id="landing">
      ${levelCardHtml("blorblet")}
      ${levelCardHtml("blorble")}
    </section>
    <header id="hdr-game" hidden>
      <button id="btn-back" class="chip round" aria-label="Back">${backIcon()}</button>
      <span id="hdr-level"></span>
      <span id="hdr-meta"><span id="hdr-meta-label" class="mut"></span><b id="timer">0:00</b></span>
    </header>
    <section id="game" hidden>
      <section id="stage"></section>
      <div id="hint-row"><button id="btn-hint" class="chip" hidden>${bulbIcon()} Hint</button></div>
      <section id="found"></section>
    </section>
    ${howtoDialogHtml()}${resultDialogHtml()}`;
  el("landing-date").textContent = formatDate(DATE_ISO);
  for (const card of app.querySelectorAll<HTMLElement>(".level-card"))
    card.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-play],[data-practice],[data-results]");
      if (!t) return;
      const mode = card.dataset.mode as PuzzleMode;
      if (t.dataset.results !== undefined) { showGame(mode, false); void openResult(); }
      else showGame(mode, t.dataset.practice !== undefined);
    });
  el("btn-back").addEventListener("click", showLanding);
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
// Re-renders both landing cards from `saved` — sample trio (happy once that
// mode is done today) + the Play/Resume/done state row. Pure re-render, no
// side effects: safe to call before any session exists.
const renderLanding = () => {
  for (const mode of ["blorblet", "blorble"] as const) {
    const card = app.querySelector<HTMLElement>(`.level-card[data-mode="${mode}"]`)!;
    const dayRec = saved.days[mode];
    const done = dayRec?.elapsedMs != null;
    const { uid, cards } = LANDING_TRIOS[mode];
    card.querySelector("[data-art]")!.innerHTML = cards
      .map((c, i) => `<span>${renderBlorb(c, `${uid}${i}`, done ? "happy" : "rest")}</span>`)
      .join("");
    const state = card.querySelector("[data-state]")!;
    if (done) {
      state.innerHTML =
        `<span class="done-line">${checkIcon()} ${formatTime(dayRec.elapsedMs!)} today</span>` +
        `<a class="linkish" data-results>results</a>` +
        `<a class="linkish" data-practice>practice</a>`;
    } else if (dayRec?.startedAt != null) {
      state.innerHTML =
        `<button class="primary" data-play>Resume</button>` +
        `<a class="linkish" data-practice>practice</a>`;
    } else {
      state.innerHTML =
        `<button class="primary" data-play>Play</button>` +
        `<a class="linkish" data-practice>practice</a>`;
    }
  }
};

const showLanding = () => {
  if (session) stopTimer();
  renderLanding();
  el("hdr-landing").hidden = false;
  el("landing").hidden = false;
  el("hdr-game").hidden = true;
  el("game").hidden = true;
};

const showGame = (mode: PuzzleMode, practice: boolean) => {
  startSession(mode, practice);
  el("hdr-level").textContent = MODES[mode].label;
  el("hdr-meta-label").textContent = practice ? "practice · " : `${formatDate(DATE_ISO)} · `;
  el("hdr-landing").hidden = true;
  el("landing").hidden = true;
  el("hdr-game").hidden = false;
  el("game").hidden = false;
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
  (el("btn-hint") as HTMLButtonElement).hidden = true;
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
  const gen = ++openResultGen;
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
    const blob = await renderStatsCard(info, renderBlorb(session.deal.cards[0]!, "mascot", "happy"));
    if (gen !== openResultGen) return; // a newer open owns the dialog
    statsBlob = blob;
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
    try { await navigator.share({ files: [file] }); return; }
    catch (e) {
      if ((e as DOMException).name === "AbortError") return; // user cancelled the share sheet
    }
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
  } else {                                   // untouched today
    reveal();
  }
};

// ---------- boot ----------
shell();
const qmode = params.get("mode");
// `mode` only namespaces autoplay/raster flows now — it no longer deep-links
// into a running clock; a plain `?mode=X` still lands on the landing screen.
const bootMode: PuzzleMode = qmode === "blorblet" ? "blorblet" : qmode === "blorble" ? "blorble" : saved.lastMode;
if (params.get("practice") === "1") {
  showGame(bootMode, true);
} else if (params.get("autoplay") === "1") {
  showGame(bootMode, false);
  // auto-reveal only when a daily gate is actually showing (defensive: showGame's
  // startSession already reveals the untouched/resume paths on its own)
  if (!session.practice && session.startedAt === null) reveal();
} else {
  showLanding();
}
if (params.get("howto") === "1") openHowTo(); // raster affordance only — never auto-opens otherwise

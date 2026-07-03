import "./style.css";
import { cardBackSvg } from "./back";
import { renderBlorb, type Expression } from "./blorb";
import { MODES, type DealtBoard, type PuzzleMode, dailyBoard, practiceBoard } from "./board";
import { receiptModel, renderStatsCard } from "./card";
import { type GameState, hint, tap, trioKey } from "./game";
import { todayIso } from "./seed";
import { type ShareInfo, formatDate, formatTime, shareText } from "./share";
import { type DayProgress, type SavedState, freshDay, load, recordWin, save } from "./state";

// Dev/raster affordances: ?date=YYYY-MM-DD forces the daily date; ?autoplay=1 skips the curtain.
const params = new URLSearchParams(location.search);
const qdate = params.get("date") ?? "";
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/.test(qdate) ? qdate : todayIso();

// A daily tab left open across UTC midnight must not keep serving yesterday's
// board: re-sync when the player returns to the tab, and guard the moment of
// reveal. (No mid-play rug-pull — neither fires while actively playing.)
// The reload also brings the fresh curtains back and resets the toggle ✓s —
// both derive from `saved.days`, which freshDay() clears for the new date.
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
// definite-assignment: every boot path runs startSession (via showGame) before
// any handler can read session.
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
const bulbIcon = () => svg(`<path d="M12 3a6 6 0 0 0-3.2 11.08c.45.3.7.8.7 1.32V17h5v-1.6c0-.52.25-1.02.7-1.32A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 20h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 22h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`);
const closeIcon = () =>
  `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>`;

// Legend rows render actual Blorbs so a beginner sees each feature, not just reads its name.
const legendRow = (label: string, uidPrefix: string, cards: readonly [number, number, number, number][]) => `
      <span>${label}</span>
      <div class="row3">${cards.map((c, i) => `<span>${renderBlorb(c, `${uidPrefix}${i}`)}</span>`).join("")}</div>`;

const howtoDialogHtml = () => `
    <dialog id="howto">
      <div class="dialog-scroll">
        <h2>How to play</h2>
        <p>Every Blorb has 4 features: colour, eyes, shape, and antennae.</p>
        <div class="legend">
          ${legendRow("Colour", "hc", [[0, 1, 0, 0], [1, 1, 0, 0], [2, 1, 0, 0]])}
          ${legendRow("Eyes", "he", [[0, 0, 0, 0], [0, 1, 0, 0], [0, 2, 0, 0]])}
          ${legendRow("Shape", "hs", [[0, 1, 0, 0], [0, 1, 1, 0], [0, 1, 2, 0]])}
          ${legendRow("Antennae", "hp", [[0, 1, 0, 0], [0, 1, 0, 1], [0, 1, 0, 2]])}
        </div>
        <p>A Set is 3 Blorbs where each feature is the same on all three, or different on all three.</p>
        <div class="example">${([[0, 1, 0, 0], [1, 1, 0, 0], [2, 1, 0, 0]] as const)
          .map((c, i) => `<span>${renderBlorb(c, `ht${i}`)}</span>`).join("")}</div>
        <p class="caption">Three different colours, everything else the same. That's a Set.</p>
        <div class="example">${([[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2]] as const)
          .map((c, i) => `<span>${renderBlorb(c, `hx${i}`)}</span>`).join("")}</div>
        <p class="caption">Every feature different on all three. Also a Set.</p>
        <p>If one feature is two of a kind, it's not a Set.</p>
        <p class="fineprint">inspired by the card game SET · not affiliated with Set Enterprises/PlayMonster</p>
      </div>
      <button class="dialog-x" aria-label="Close">${closeIcon()}</button>
    </dialog>`;

const shell = () => {
  app.innerHTML = `
    <header id="hdr">
      <div id="hdr-row1">
        <h1>Blorble</h1>
        <b id="timer"></b>
        <div class="hdr-right">
          <span class="mut">${formatDate(DATE_ISO)}</span>
          <button id="btn-help" class="chip round">?</button>
        </div>
      </div>
      <nav id="seg"></nav>
    </header>
    <section id="game">
      <section id="stage"></section>
      <div id="hint-row"><button id="btn-hint" class="chip" hidden>${bulbIcon()} Hint</button></div>
      <section id="found"></section>
    </section>
    ${howtoDialogHtml()}${resultDialogHtml()}`;
  // The toggle ALWAYS navigates to daily boards (never practice). The Practice
  // segment only exists while practicing and is inert — it marks where you are.
  el("seg").addEventListener("click", (e) => {
    const opt = (e.target as HTMLElement).closest<HTMLElement>("[data-seg]");
    if (!opt || opt.dataset.seg === "practice") return;
    const mode = opt.dataset.seg as PuzzleMode;
    if (!session.practice && session.mode === mode) return; // already on this daily
    showGame(mode, false);
  });
  el("btn-hint").addEventListener("click", onHint);
  el("btn-help").addEventListener("click", openHowTo);
  el("howto").querySelector(".dialog-x")?.addEventListener("click", () => (el("howto") as HTMLDialogElement).close());
  el("result").querySelector(".dialog-x")?.addEventListener("click", () => (el("result") as HTMLDialogElement).close());
  el("btn-r-primary").addEventListener("click", () => {
    if (session.practice) { // P3: New board — deal a fresh practice board
      (el("result") as HTMLDialogElement).close();
      showGame(session.mode, true);
    } else void onCopyImage(el("btn-r-primary")); // F6: Copy image
  });
  el("btn-r-link").addEventListener("click", () => {
    if (session.practice) void onCopyImage(el("btn-r-link")); // P3: demoted copy image
    else void onCopyText(el("btn-r-link"));                   // F6: copy text
  });
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.href = "data:image/svg+xml," + encodeURIComponent(renderBlorb([0, 1, 0, 0], "fav"));
  document.head.append(icon);
};

// Row 2 of the top bar: Blorblet | Blorble (✓ once that daily is done today),
// plus a temporary third "Practice" segment while practicing (locked P2c).
const renderSeg = () => {
  const tick = (mode: PuzzleMode) =>
    saved.days[mode]?.elapsedMs != null ? `<span class="tick">✓</span>` : "";
  const opt = (mode: PuzzleMode) =>
    `<button class="opt${!session.practice && session.mode === mode ? " active" : ""}" data-seg="${mode}">` +
    `${MODES[mode].label}${tick(mode)}</button>`;
  el("seg").innerHTML =
    opt("blorblet") +
    opt("blorble") +
    (session.practice ? `<button class="opt active" data-seg="practice">Practice</button>` : "");
};

// showModal autofocuses the first focusable element (the dialog ×) and Chrome
// treats that programmatic focus as :focus-visible, painting a stray ring on
// every open (the locked F6 × is bare). Blur it — Tab still restores full
// keyboard focus rings.
const blurAutofocus = () => (document.activeElement as HTMLElement | null)?.blur();

const openHowTo = () => {
  const dlg = el("howto") as HTMLDialogElement;
  dlg.showModal();
  blurAutofocus();
  dlg.querySelector(".dialog-scroll")!.scrollTop = 0; // reset scroll position
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
const showGame = (mode: PuzzleMode, practice: boolean) => {
  startSession(mode, practice);
  renderSeg();
};

const renderBoard = () => {
  stageEl().innerHTML = `<div id="board">${session.deal.cards
    .map((c, i) => `<button class="card" data-i="${i}">${renderBlorb(c, `c${i}`)}</button>`)
    .join("")}</div>`;
  for (const btn of stageEl().querySelectorAll<HTMLButtonElement>(".card"))
    btn.addEventListener("click", () => onTap(Number(btn.dataset.i)));
  renderFound();
};

// Fresh daily: the board renders face-down (index-cycled pale silhouettes —
// never the real cards' shapes) under the curtain card; the first tap of Play
// lifts the curtain and starts the clock (timer fairness, v2.2 §2).
const renderCurtain = () => {
  const m = MODES[session.mode];
  stageEl().innerHTML =
    `<div id="board">${session.deal.cards
      .map((_, i) => `<div class="card back">${cardBackSvg(i)}</div>`)
      .join("")}</div>` +
    `<div class="curtain"><div class="curtain-card">` +
    `<div class="curtain-mascot">${renderBlorb([0, 1, 2, 0], "cm", "happy")}</div>` +
    `<h3>${m.label}</h3>` +
    `<div class="curtain-meta mut">${m.size} Blorbs · ${m.targetSets} Sets</div>` +
    `<button id="btn-play" class="primary">Play</button>` +
    `<button id="btn-practice-instead" class="linkish">practice instead</button>` +
    `</div></div>`;
  renderFound();
  el("btn-play").addEventListener("click", () => reveal());
  el("btn-practice-instead").addEventListener("click", () => showGame(session.mode, true));
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
  // Raster affordance: a full solve wins the game, and onHint() no-ops once the
  // game is finished — so apply ?hint=1 BEFORE the solve loop when it completes
  // the puzzle (yields a genuine hints>0 result card), and AFTER for a partial
  // solve so the hint still lands on a not-yet-found Set.
  const hinting = params.get("hint") === "1";
  const fullSolve = n > 0 && n === session.deal.sets.length;
  if (hinting && fullSolve) onHint();
  for (const set of session.deal.sets.slice(0, n)) for (const i of set) onTap(i);
  if (hinting && !fullSolve) onHint();
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
  el("timer").textContent = formatTime(session.elapsedMs); // final time persists in the bar
  renderSeg(); // the finished mode's ✓ appears in the toggle
  for (let i = 0; i < session.deal.cards.length; i++) {
    setFace(i, "happy");
    cardEl(i).classList.add("happy");
  }
  renderResultBar();
  void openResult();
};

// Done row (locked L3/P1): `n/n ✓ · Results · practice` — the duplicate time
// is dropped (the final time lives in the top bar); practice is the quiet exit.
// It takes the hint row's slot (between board and slots, per the lock sheet);
// the hidden hint button stays as a sibling so el("btn-hint") keeps resolving.
const renderResultBar = () => {
  el("hint-row").insertAdjacentHTML(
    "beforeend",
    `<div class="result"><b>${session.game.foundKeys.length}/${session.game.target} ✓</b>` +
      `<button id="btn-results" class="primary">Results</button>` +
      `<button id="btn-practice" class="linkish">practice</button></div>`,
  );
  el("btn-results").addEventListener("click", () => void openResult());
  el("btn-practice").addEventListener("click", () => showGame(session.mode, true));
};

// One primary + one quiet link (locked F6/P3). Labels and roles are assigned
// per session in openResult: daily = Copy image / copy text; practice =
// New board / copy image.
const resultDialogHtml = () => `
  <dialog id="result">
    <button class="dialog-x" aria-label="Close">${closeIcon()}</button>
    <div id="result-body"></div>
    <div class="result-buttons">
      <button id="btn-r-primary" class="primary"></button>
      <button id="btn-r-link" class="linkish"></button>
    </div>
  </dialog>`;

const shareInfo = (): ShareInfo => ({
  label: MODES[session.mode].label, isoDate: DATE_ISO, elapsedMs: session.elapsedMs!,
  hints: session.hints, wrongs: session.wrongs, practice: session.practice,
  size: MODES[session.mode].size, sets: MODES[session.mode].targetSets,
});

const openResult = async () => {
  const gen = ++openResultGen;
  statsBlob = null;
  if (statsUrl) { URL.revokeObjectURL(statsUrl); statsUrl = null; }
  const primary = el("btn-r-primary") as HTMLButtonElement;
  const link = el("btn-r-link") as HTMLButtonElement;
  primary.textContent = session.practice ? "New board" : "Copy image";
  link.textContent = session.practice ? "copy image" : "copy text";
  // whichever control copies the PNG stays dead until the blob is ready
  const img = session.practice ? link : primary;
  const other = session.practice ? primary : link;
  img.disabled = true;
  img.classList.add("is-disabled");
  other.disabled = false;
  other.classList.remove("is-disabled");
  const info = shareInfo();
  const m = receiptModel(info);
  const rows = m.rows.map((r) => `<div class="rc-row"><span>${r.label}</span><span>${r.value}</span></div>`).join("");
  el("result-body").innerHTML =
    `<div class="receipt">` +
      `<div class="rc-logo">${renderBlorb(session.deal.cards[0]!, "mascot", "happy")}</div>` +
      `<div class="rc-title">${m.title}</div>` +
      `<div class="rc-size">${m.size}</div>` +
      `<div class="rc-rule"></div>` +
      rows +
      `<div class="rc-rule"></div>` +
      `<div class="rc-row rc-big"><span>TIME</span><span>${m.time}</span></div>` +
      `<div class="rc-rule"></div>` +
      `<div class="rc-note rc-quip">* ${m.quip} *</div>` +
      `<div class="rc-note">${m.note}</div>` +
      `<div class="rc-barcode"></div>` +
      `<div class="rc-foot">${m.date} · ${m.url}</div>` +
    `</div>`;
  (el("result") as HTMLDialogElement).showModal();
  blurAutofocus();
  try {
    const blob = await renderStatsCard(info, renderBlorb(session.deal.cards[0]!, "mascot", "happy"));
    if (gen !== openResultGen) return; // a newer open owns the dialog
    statsBlob = blob;
    statsUrl = URL.createObjectURL(statsBlob);
    img.disabled = false;
    img.classList.remove("is-disabled");
  } catch { /* canvas unavailable — the image control stays disabled */ }
};

// Restores an explicit resting label (NOT the captured one — capturing would
// stick "Copied!" forever if the button is clicked twice within the window).
const flashLabel = (btn: HTMLElement, msg: string, resting: string) => {
  btn.textContent = msg;
  window.setTimeout(() => (btn.textContent = resting), 1500);
};

const onCopyText = async (btn: HTMLElement) => {
  const text = shareText(shareInfo());
  try {
    await navigator.clipboard.writeText(text);
    flashLabel(btn, "Copied!", "copy text"); // only ever the daily link
  } catch {
    window.prompt("Copy your result:", text);
  }
};

const onCopyImage = async (btn: HTMLElement) => {
  if (!statsBlob) return;
  const file = new File([statsBlob], `blorble-${DATE_ISO}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; }
    catch (e) {
      if ((e as DOMException).name === "AbortError") return; // user cancelled the share sheet
    }
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": statsBlob })]);
    flashLabel(btn, "Copied!", session.practice ? "copy image" : "Copy image");
  } catch {
    saveImage(); // clipboard-image unsupported → PNG download (F6: no visible save button)
  }
};

const saveImage = () => {
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
  el("hint-row").querySelector(".result")?.remove(); // drop a previous session's done row
  el("timer").textContent = ""; // empty until a clock runs (G1 lock)
  el("found").className = mode; // slot layout hook
  if (!practice) { saved = { ...saved, lastMode: mode }; persist(); }

  if (practice) { reveal(); return; } // practice boards start instantly — no curtain
  if (dayRec?.elapsedMs != null) {           // finished earlier today
    session.game = { ...session.game, foundKeys: [...dayRec.foundKeys] };
    session.startedAt = dayRec.startedAt;
    session.elapsedMs = dayRec.elapsedMs;
    el("timer").textContent = formatTime(session.elapsedMs);
    renderBoard();
    for (let i = 0; i < session.deal.cards.length; i++) setFace(i, "happy");
    renderResultBar();
  } else if (dayRec?.startedAt != null) {    // resume mid-game — no curtain
    reveal();
  } else {                                   // untouched today — curtain down
    renderCurtain();
  }
};

// ---------- boot ----------
shell();
const qmode = params.get("mode");
// `mode` deep-links a specific daily and namespaces dev/raster flows; landing
// on a board is safe — the curtain keeps a fresh board's clock honest.
const bootMode: PuzzleMode = qmode === "blorblet" ? "blorblet" : qmode === "blorble" ? "blorble" : saved.lastMode;
showGame(bootMode, params.get("practice") === "1");
// ?autoplay=1 skips the curtain (it used to skip the landing) for raster/dev
// flows; resumed or finished boards have no curtain to lift.
if (params.get("autoplay") === "1" && !session.practice && session.startedAt === null && session.elapsedMs === null)
  reveal();
if (params.get("howto") === "1") openHowTo(); // raster affordance only — never auto-opens otherwise

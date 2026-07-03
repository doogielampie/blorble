# Blorble receipt share-card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mascot+quip result card with a deadpan **receipt** — shown BOTH in the in-app results dialog and as the copied/shared PNG — with the played mode made unmistakable (mode name as the title + "N Blorbs · N Sets" size line).

**Architecture:** One pure `receiptModel(info)` in `src/card.ts` produces the receipt's structured content; two renderers consume it — the in-app dialog (HTML, in `main.ts openResult`) and the shared image (canvas, in `renderStatsCard`). Modelling the content once kills the DOM/canvas drift risk. The Blorb art, game logic, storage, seeds, and copy-text share format are untouched.

**Tech Stack:** TypeScript strict + Vitest (`pnpm check`), Vite/GitHub Pages, `tools/phone-shot.sh` rasters, canvas 2D for the PNG.

## Context

The current shareable image (`renderStatsCard`, an 800×1000 canvas PNG) and the in-app results dialog both show a happy mascot + speech-bubble quip + big time + a marks line. The user finds it flat and wants something funnier in a group chat. After a brainstorming + mockup round (rendered inline), the **receipt** concept was locked: a monospace itemized "BLORBLE ✶ DAILY" receipt. The one refinement: because "Blorble" and "Blorblet" differ by one letter, the mode must be obvious — locked treatment is **the mode name as the receipt's big title plus a "9 Blorbs · 4 Sets" / "12 Blorbs · 6 Sets" size line** (two redundant signals), retiring the old header that always read "BLORBLE". Scope decision (locked): the receipt appears **in the results screen too**, not just the copied image — most players share daily results by screenshotting the results screen, and this keeps what-you-see-is-what-you-share. The happy mascot rides along as the receipt's small logo; the pop-in animation stays.

## Global Constraints

- **Copy-TEXT share format is FROZEN.** `shareText` output must be byte-identical (`Blorblet · practice · ⏱ 1:01 · ✨` etc.) — pinned by `src/share.test.ts`, which must keep passing. Only the IMAGE/dialog changes.
- **Spoiler-free.** The receipt never shows the day's board or its Sets. The one decorative Blorb logo is `renderBlorb(session.deal.cards[0], "happy")` — a single card, the already-shipped/accepted mascot behavior; do not add more board cards.
- **No streak/best on the card** (deliberate, unchanged).
- `src/blorb.ts` (art), `src/seed.ts`, `src/board.ts`, `src/game.ts`, `src/deck.ts`, `src/state.ts` (storage key `blorble.v1` + schema), `index.html`, `vite.config.ts` — untouched.
- Dialog and PNG must render the SAME `receiptModel` output (unified). Keep the results dialog's buttons and their roles exactly as shipped (daily: primary "Copy image" + link "copy text"; practice: primary "New board" + link "copy image"), the `openResultGen` generation guard, the disabled-until-blob logic, and `blurAutofocus()`.
- `pnpm check` (tsc strict + `noUncheckedIndexedAccess` + vitest) green at EVERY commit. Vitest on Node 25 sometimes SIGABRTs after green output — rerun once before investigating.
- Rasters use `tools/phone-shot.sh OUT.png W H "/blorble/?query" [PROFILE] [PORT]` against a fresh `pnpm build`; PNG is (W+200)×(H+200), judge the top-left W×H. Result-dialog shots need `&autoplay=1&solve=N` (and `&hint=1` to show a hint row). **Stateful multi-shot sequences must share [PROFILE] AND a pinned [PORT]** (default port is random; localStorage origin includes the port). Never screenshot the Vite dev server.
- Global `pnpm` (no corepack). NO `gh` CLI — deploy = push to `main`, verify by polling the live bundle. Commit style `feat:`/`fix:`/`docs:`.
- Work on local `main`. Ledger: append per-task entries to `.superpowers/sdd/progress.md`.

## File Structure

| File | Change |
|---|---|
| `src/share.ts` | `ShareInfo` gains `size: number` and `sets: number`; `shareText` unchanged |
| `src/share.test.ts` | fixtures gain `size`/`sets`; expected `shareText` outputs unchanged |
| `src/card.ts` | remove `cardLines`; add `receiptModel(info)`; rewrite `renderStatsCard` to draw the receipt |
| `src/card.test.ts` | replace `cardLines` suite with `receiptModel` suite; `quip` suite unchanged |
| `src/main.ts` | `shareInfo()` adds `size`/`sets`; `openResult` renders the receipt HTML from `receiptModel`; drop `cardLines` import |
| `src/style.css` | replace `.r-top/.bubble/.r-time/.r-marks/.r-ctx` with `.receipt/.rc-*` monospace styles |
| `README.md` | one-line: stats-card description → receipt |
| `docs/superpowers/specs/2026-07-04-blorble-receipt-share.md` (new) | canonical spec (Task 1) |
| `design/blorble-share-v3/receipt-mock.html` (new) | locked visual reference (Task 1) |
| `docs/superpowers/plans/2026-07-04-blorble-receipt-share.md` (new) | this plan, committed (Task 1) |

---

### Task 1: Spec + visual reference + plan commit

**Files:** create the three docs listed above.

- [ ] **Step 1: Write the canonical spec** to `docs/superpowers/specs/2026-07-04-blorble-receipt-share.md` capturing the locked design: receipt layout (logo → mode TITLE → size line → rule → SETS FOUND / HINTS / GRUMPS → rule → TIME → rule → quip note + "thank you for blorbing" → barcode → date+url footer); mode-clarity treatment (V2: title + size line); unified dialog+PNG scope; spoiler-free + copy-text-frozen constraints; the exact content mapping (see Task 2's `receiptModel`).

- [ ] **Step 2: Write the visual reference** `design/blorble-share-v3/receipt-mock.html` — a standalone static page rendering the locked receipt for Blorblet AND Blorble, clean + messy, using an inline copy of the Blorb renderer (the mock built during brainstorming is the source of truth for layout: mono title ~26px+, size line, dashed rules, right-aligned values, barcode via `repeating-linear-gradient`, "thank you for blorbing").

- [ ] **Step 3: Commit the plan + docs**

```bash
cp /Users/morrischang/.claude/plans/read-docs-superpowers-v2-2-ui-handoff-md-jazzy-grove.md docs/superpowers/plans/2026-07-04-blorble-receipt-share.md
git add docs/superpowers/specs/2026-07-04-blorble-receipt-share.md design/blorble-share-v3/receipt-mock.html docs/superpowers/plans/2026-07-04-blorble-receipt-share.md
git commit -m "docs: receipt share-card spec, visual reference, and plan"
```

---

### Task 2: `receiptModel` + `ShareInfo` extension (pure, test-first)

**Files:** Modify `src/share.ts`, `src/share.test.ts`, `src/card.ts`, `src/card.test.ts`.

**Interfaces:**
- Produces: `ShareInfo` now carries `size: number` (Blorbs) and `sets: number` (target Sets). `receiptModel(info: ShareInfo): ReceiptModel` where
  ```ts
  export type ReceiptRow = { label: string; value: string };
  export type ReceiptModel = {
    title: string;   // mode, upper-case
    size: string;    // "9 Blorbs · 4 Sets"
    rows: ReceiptRow[];
    time: string;    // "1:52"
    quip: string;
    note: string;    // "thank you for blorbing"
    date: string;    // "Jul 3" | "practice"
    url: string;     // "doogielampie.github.io/blorble"
  };
  ```
  Consumed by Task 3 (HTML dialog) and Task 4 (canvas PNG).

- [ ] **Step 1: Extend `ShareInfo`** in `src/share.ts` — add two required fields to the type (nothing else changes):

```ts
export type ShareInfo = {
  label: string;       // "Blorble" | "Blorblet" (resolved by the caller)
  isoDate: string;
  elapsedMs: number;
  hints: number;
  wrongs: number;
  practice?: boolean;
  size: number;        // Blorbs on the board (9 | 12) — for the receipt
  sets: number;        // target Sets (4 | 6) — for the receipt
};
```

`shareText` is UNCHANGED (it destructures only the old fields; the new ones are ignored → identical output).

- [ ] **Step 2: Update `src/share.test.ts` fixtures** — add `size`/`sets` to each `shareText` call so it type-checks; **expected strings stay identical** (this is the guard that the format is frozen). Example edit (apply to all five `shareText({...})` literals):

```ts
    expect(shareText({ label: "Blorblet", isoDate: "2026-07-02", elapsedMs: 161_000, hints: 0, wrongs: 0, size: 9, sets: 4 }))
      .toBe("Blorblet · Jul 2 · ⏱ 2:41 · ✨");
```
(…and likewise add `size: 12, sets: 6` to the Blorble cases and `size: 9, sets: 4` to the practice case — never touch the expected output.)

- [ ] **Step 3: Write the failing `receiptModel` tests** — replace the entire `describe("cardLines", …)` block in `src/card.test.ts` with (and change the import line to `import { quip, receiptModel } from "./card";`):

```ts
describe("receiptModel", () => {
  const base = { label: "Blorble", isoDate: "2026-07-03", elapsedMs: 348_000, size: 12, sets: 6 };

  test("daily, hints + grumps: title, size line, itemised rows, date, url", () => {
    const m = receiptModel({ ...base, hints: 1, wrongs: 2 });
    expect(m.title).toBe("BLORBLE");
    expect(m.size).toBe("12 Blorbs · 6 Sets");
    expect(m.rows).toEqual([
      { label: "SETS FOUND", value: "6 / 6" },
      { label: "HINTS", value: "x 1" },
      { label: "GRUMPS", value: "x 2" },
    ]);
    expect(m.time).toBe("5:48");
    expect(m.note).toBe("thank you for blorbing");
    expect(m.date).toBe("Jul 3");
    expect(m.url).toBe("doogielampie.github.io/blorble");
  });

  test("Blorblet clean solve: zero counts still listed, title + size reflect the small mode", () => {
    const m = receiptModel({ label: "Blorblet", isoDate: "2026-07-03", elapsedMs: 112_000, hints: 0, wrongs: 0, size: 9, sets: 4 });
    expect(m.title).toBe("BLORBLET");
    expect(m.size).toBe("9 Blorbs · 4 Sets");
    expect(m.rows).toEqual([
      { label: "SETS FOUND", value: "4 / 4" },
      { label: "HINTS", value: "x 0" },
      { label: "GRUMPS", value: "x 0" },
    ]);
    expect(m.time).toBe("1:52");
    expect(m.date).toBe("Jul 3");
  });

  test("practice: date slot reads 'practice'", () => {
    expect(receiptModel({ ...base, hints: 0, wrongs: 0, practice: true }).date).toBe("practice");
  });

  test("quip is the deterministic performance line", () => {
    const info = { ...base, hints: 1, wrongs: 0 };
    expect(receiptModel(info).quip).toBe(quip(info));
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `pnpm vitest run src/card.test.ts`
Expected: FAIL — `receiptModel` is not exported.

- [ ] **Step 5: Implement `receiptModel` and remove `cardLines`** in `src/card.ts`. Delete the `cardLines` export entirely, and add (keep `quip` and `renderStatsCard`; `formatDate`/`formatTime` are already imported):

```ts
export type ReceiptRow = { label: string; value: string };
export type ReceiptModel = {
  title: string; size: string; rows: ReceiptRow[];
  time: string; quip: string; note: string; date: string; url: string;
};

// The receipt's content, modelled once so the in-app dialog (HTML) and the
// shared PNG (canvas) render identically. Spoiler-free; no streak/best.
export const receiptModel = (info: ShareInfo): ReceiptModel => ({
  title: info.label.toUpperCase(),
  size: `${info.size} Blorbs · ${info.sets} Sets`,
  rows: [
    { label: "SETS FOUND", value: `${info.sets} / ${info.sets}` },
    { label: "HINTS", value: `x ${info.hints}` },
    { label: "GRUMPS", value: `x ${info.wrongs}` },
  ],
  time: formatTime(info.elapsedMs),
  quip: quip(info),
  note: "thank you for blorbing",
  date: info.practice ? "practice" : formatDate(info.isoDate),
  url: "doogielampie.github.io/blorble",
});
```

- [ ] **Step 6: Add `size`/`sets` to `main.ts` `shareInfo()`** so the app compiles with real data. Replace the `shareInfo` object literal (currently `label … practice`) with:

```ts
const shareInfo = (): ShareInfo => ({
  label: MODES[session.mode].label, isoDate: DATE_ISO, elapsedMs: session.elapsedMs!,
  hints: session.hints, wrongs: session.wrongs, practice: session.practice,
  size: MODES[session.mode].size, sets: MODES[session.mode].targetSets,
});
```
Add `ShareInfo` to the `./share` import in `main.ts` (currently `import { formatDate, formatTime, shareText } from "./share";`).

- [ ] **Step 7: Confirm the pure layer** — `pnpm vitest run src/card.test.ts src/share.test.ts` PASS (`share.test.ts` green proves the copy-text format is intact; `card.test.ts` green proves the model). Do NOT run the full `pnpm check` yet — `main.ts openResult` still calls `cardLines` until Task 3. **Task 2 and Task 3 land in one commit** (Task 3 Step 6); the full `pnpm check` runs there.

---

### Task 3: In-app dialog becomes the receipt

**Files:** Modify `src/main.ts` (`openResult` body), `src/style.css`.

**Interfaces:** Consumes `receiptModel` (Task 2). The dialog's `#result-body` now holds the receipt; buttons (`btn-r-primary`/`btn-r-link`), roles, guard, and `blurAutofocus()` are unchanged.

- [ ] **Step 1: Fix the `card` import** in `src/main.ts` — change `import { cardLines, quip, renderStatsCard } from "./card";` to `import { receiptModel, renderStatsCard } from "./card";` (`quip` moves into the model; `cardLines` is gone).

- [ ] **Step 2: Rewrite the `#result-body` render** in `openResult`. Replace the block from `const [marksLine …` through `…<p class="r-ctx mut">${contextLine}</p>;` (the `.r-top`/`.r-time`/`.r-marks`/`.r-ctx` template literal) with:

```ts
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
```

(The `renderStatsCard(info, …)` call and everything after it in `openResult` stays exactly as-is.)

- [ ] **Step 3: Replace the result-dialog CSS** in `src/style.css`. Replace the whole block from `/* result dialog (locked F6/P3) …` through the `.r-ctx { … }` line (the `#result`/`#result-body`/`.r-top`/`.r-mascot`/`.bubble`/`.r-time`/`.r-marks`/`.r-ctx` rules) with:

```css
/* result dialog — the receipt IS the share card (rendered identically to the
   canvas PNG in card.ts from the same receiptModel) */
#result { text-align: center; width: 300px; max-width: calc(100vw - 40px); max-height: 90dvh; overflow-y: auto; padding: 20px 20px 22px; }
#result-body { display: block; }
.receipt { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; color: var(--ink); }
.rc-logo { width: 76px; margin: 0 auto 6px; }
.rc-title { font-size: 26px; font-weight: 800; letter-spacing: 0.02em; line-height: 1; }
.rc-size { font-size: 12px; color: var(--muted); margin-top: 5px; }
.rc-rule { border-top: 1.5px dashed #c9c0b2; margin: 10px 0; }
.rc-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 2px; }
.rc-row.rc-big { font-size: 17px; font-weight: 700; }
.rc-note { font-size: 12px; color: #5f544b; margin-top: 3px; }
.rc-note.rc-quip { font-weight: 700; color: var(--ink); }
.rc-barcode { height: 30px; width: 74%; margin: 12px auto 6px;
  background: repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 5px, transparent 5px 8px, var(--ink) 8px 11px, transparent 11px 13px); }
.rc-foot { font-size: 10.5px; color: var(--muted); }
```

(`.result-buttons`, `.result-buttons .primary`, `#result .is-disabled`, and `#result[open]` popin stay unchanged.)

- [ ] **Step 4: Full check** — `pnpm check` PASS (now that `openResult` no longer calls `cardLines`, the whole app type-checks; all suites green).

- [ ] **Step 5: Build + raster checkpoint A (in-app receipt, both modes + a hint)**

```bash
pnpm build
mkdir -p .superpowers/sdd/shots
tools/phone-shot.sh .superpowers/sdd/shots/rc-blorble.png    390 844 "/blorble/?date=2026-07-04&mode=blorble&autoplay=1&solve=6"
tools/phone-shot.sh .superpowers/sdd/shots/rc-blorblet.png   390 844 "/blorble/?date=2026-07-04&mode=blorblet&autoplay=1&solve=4"
tools/phone-shot.sh .superpowers/sdd/shots/rc-hinted.png     390 844 "/blorble/?date=2026-07-04&mode=blorble&autoplay=1&solve=6&hint=1"
tools/phone-shot.sh .superpowers/sdd/shots/rc-375.png        375 667 "/blorble/?date=2026-07-04&mode=blorblet&autoplay=1&solve=4"
pkill -f 'headless=new' || true
```

Judge (controller): the receipt renders in the open dialog — small happy mascot logo, big mode TITLE (BLORBLE vs BLORBLET clearly different), size line ("12 Blorbs · 6 Sets" vs "9 Blorbs · 4 Sets"), dashed rules, right-aligned SETS FOUND / HINTS / GRUMPS, bold TIME row, "* quip *" + "thank you for blorbing", barcode, "Jul 4 · doogielampie.github.io/blorble" footer; buttons (Copy image / copy text) unchanged beneath; fits within 375×667 without clipping.

- [ ] **Step 6: Commit Tasks 2 + 3 together**

```bash
git add src/share.ts src/share.test.ts src/card.ts src/card.test.ts src/main.ts src/style.css
git commit -m "feat: receipt result card — pure receiptModel + in-app dialog renders the receipt"
```

---

### Task 4: Shared PNG becomes the receipt (canvas)

**Files:** Modify `src/card.ts` (`renderStatsCard`).

**Interfaces:** Consumes `receiptModel`. Signature unchanged: `renderStatsCard(info: ShareInfo, blorbSvg: string): Promise<Blob>` (still 800×1000). The dialog (Task 3) and this PNG both render `receiptModel(info)` — keep them visually matched.

- [ ] **Step 1: Rewrite `renderStatsCard`'s draw body** — replace everything inside `img.onload = () => { … }` (the bubble/mascot/time/marks/context/url drawing) with a receipt layout drawn from the model. Keep the surrounding Promise/canvas/`img.src` scaffolding (paper fill, the `sized` SVG data-URI, `toBlob`) exactly as-is. New `onload`:

```ts
    img.onload = () => {
      const m = receiptModel(info);
      const cx = 400;
      const mono = (px: number, weight = "400") => `${weight} ${px}px "SF Mono", Menlo, Consolas, monospace`;
      const rule = (y: number) => {
        ctx.strokeStyle = "#c9c0b2"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(680, y); ctx.stroke(); ctx.setLineDash([]);
      };
      // mascot logo (aspect-correct 200×224), centred at top
      const lw = 150, lh = Math.round((lw * 224) / 200);
      ctx.drawImage(img, cx - lw / 2, 44, lw, lh);
      // title + size
      ctx.fillStyle = "#2a2320"; ctx.textAlign = "center";
      ctx.font = mono(64, "800"); ctx.fillText(m.title, cx, 320);
      ctx.font = mono(28); ctx.fillStyle = "#8a7d74"; ctx.fillText(m.size, cx, 360);
      rule(398);
      // itemised rows: label left, value right
      ctx.fillStyle = "#2a2320"; ctx.font = mono(30);
      let y = 452;
      for (const r of m.rows) {
        ctx.textAlign = "left"; ctx.fillText(r.label, 140, y);
        ctx.textAlign = "right"; ctx.fillText(r.value, 660, y);
        y += 46;
      }
      rule(y - 8);
      // TIME (bold)
      ctx.font = mono(44, "700"); const ty = y + 44;
      ctx.textAlign = "left"; ctx.fillText("TIME", 140, ty);
      ctx.textAlign = "right"; ctx.fillText(m.time, 660, ty);
      rule(ty + 34);
      // quip + note
      ctx.textAlign = "center";
      ctx.font = mono(28, "700"); ctx.fillStyle = "#2a2320"; ctx.fillText(`* ${m.quip} *`, cx, ty + 92);
      ctx.font = mono(26); ctx.fillStyle = "#5f544b"; ctx.fillText(m.note, cx, ty + 132);
      // barcode (bars of deterministic-but-varied width — stable per result)
      const bx0 = 240, bw = 320, by = ty + 168; ctx.fillStyle = "#2a2320";
      let bx = bx0; let seed = m.title.length + m.time.length;
      while (bx < bx0 + bw) { const w = 2 + (seed % 3); ctx.fillRect(bx, by, w, 44); bx += w + 2 + (seed % 2); seed = (seed * 7 + 3) % 97; }
      // footer
      ctx.font = mono(24); ctx.fillStyle = "#8a7d74"; ctx.textAlign = "center";
      ctx.fillText(`${m.date} · ${m.url}`, cx, by + 96);
      ctx.textAlign = "left";
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
```

(Coordinates are a starting layout — tune in Step 3 against the browser render so nothing crowds the 1000px height.)

- [ ] **Step 2: Check** — `pnpm check` PASS (no test asserts canvas pixels; tsc gates the rewrite).

- [ ] **Step 3: Verify the PNG in a real browser** (canvas needs a DOM). Build, and via the Chrome MCP tooling open `/blorble/?date=2026-07-04&mode=blorble&autoplay=1&solve=6` on the served `dist/`; the results dialog builds the blob. Click "Copy image" (on desktop the clipboard-image path falls back to a PNG download) and open the PNG, or read `statsUrl` into an `<img>` and screenshot. Confirm the PNG visually matches the on-screen dialog receipt (same title, size, rows, TIME, quip, barcode, footer). Controller tunes the Step 1 coordinates if they diverge.

- [ ] **Step 4: Commit**

```bash
git add src/card.ts
git commit -m "feat: shared PNG renders the receipt from receiptModel (matches the dialog)"
```

---

### Task 5: Full raster sweep + PNG parity + USER GATE

- [ ] **Step 1: Fresh build + dialog sweep** (both modes, clean vs hinted, practice, both phone sizes):

```bash
pnpm check && pnpm build
mkdir -p .superpowers/sdd/shots/receipt
tools/phone-shot.sh .superpowers/sdd/shots/receipt/r1-blorble.png   390 844 "/blorble/?date=2026-07-04&mode=blorble&autoplay=1&solve=6"
tools/phone-shot.sh .superpowers/sdd/shots/receipt/r2-blorblet.png  390 844 "/blorble/?date=2026-07-04&mode=blorblet&autoplay=1&solve=4"
tools/phone-shot.sh .superpowers/sdd/shots/receipt/r3-hinted.png    390 844 "/blorble/?date=2026-07-04&mode=blorble&autoplay=1&solve=6&hint=1"
tools/phone-shot.sh .superpowers/sdd/shots/receipt/r4-practice.png  390 844 "/blorble/?practice=1&mode=blorblet&solve=4"
tools/phone-shot.sh .superpowers/sdd/shots/receipt/r5-375.png       375 667 "/blorble/?date=2026-07-04&mode=blorble&autoplay=1&solve=6"
pkill -f 'headless=new' || true
```

Judge: mode is unmistakable (title + size), clean solve shows HINTS x0 / GRUMPS x0, hinted shows x1, practice date reads "practice", everything fits 375×667.

- [ ] **Step 2: PNG parity check** (browser) — for Blorble and Blorblet, generate the copied PNG and confirm it matches the on-screen receipt (Task 4 Step 3 method). Grumps (wrongs>0) can't be induced via URL params — rely on the `receiptModel` unit tests for the value and confirm the row renders for the hinted case; note this in the report.

- [ ] **Step 3: USER APPROVAL GATE (blocking)** — present the `receipt/` shots (and a copied-PNG sample) to the USER for look approval against the locked mock. Apply any tuning (spacing, sizes, barcode), re-shoot, re-present. Do not proceed without approval.

---

### Task 6: README + final review + deploy + smoke + ledger/memory

- [ ] **Step 1: README** — update the stats-card sentence (the "result popup makes a shareable stats-card image" line) to describe the receipt.

- [ ] **Step 2: Final whole-branch review** — `scripts/review-package <pre-plan HEAD> HEAD` (record the pre-plan HEAD before Task 1); dispatch the reviewer (most capable model) with the spec + these constraints (esp. copy-text-frozen, spoiler-free, dialog/PNG parity). Fix confirmed findings, re-check, commit.

- [ ] **Step 3: Deploy + poll live bundle** (no `gh`):

```bash
git push origin main
for i in $(seq 1 40); do B=$(curl -s https://doogielampie.github.io/blorble/ | grep -o 'assets/index-[^"]*\.js' | head -1); curl -s "https://doogielampie.github.io/blorble/$B" | grep -q "thank you for blorbing" && { echo "LIVE: $B"; break; }; sleep 20; done
```

- [ ] **Step 4: Live smoke** (browser, against the live site): finish a daily → results screen shows the receipt with the correct mode title + size; "Copy image" yields a PNG that matches; a screenshot of the screen looks right; copy-text still produces the frozen format `Blorble · Jul 4 · ⏱ … · …`; practice → receipt with "practice" date + "New board" button.

- [ ] **Step 5: Ledger + memory + report** — append entries + `=== RECEIPT SHARE-CARD SHIPPED … ===` to `.superpowers/sdd/progress.md`; update project memory ([[blorble-v1-shipped]]) with the receipt redesign; report to the user.

---

## Verification (end-to-end)

1. `pnpm check` green at every commit — `receiptModel` unit-tested for daily/clean/practice/quip; `share.test.ts` unchanged-output proves the copy-text format is frozen.
2. Raster sweep (both modes, clean/hinted, practice, 390×844 + 375×667) judged vs the locked mock; USER approval gates deploy.
3. Dialog↔PNG parity confirmed in a real browser.
4. Deploy verified by live-bundle polling (`thank you for blorbing` marker) + browser smoke (receipt on screen, matching PNG, frozen copy-text).

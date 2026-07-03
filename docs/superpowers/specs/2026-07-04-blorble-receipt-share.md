# Blorble receipt share-card — design spec

**Status:** LOCKED. This is the canonical design reference for the receipt result/share card. It replaces the previous mascot+speech-bubble+quip card.

## Summary

The result card becomes a deadpan **receipt**: a monospace, itemized slip that reports the day's Blorble/Blorblet result the way a store receipt reports a purchase. It is spoiler-free, carries no streak/best data, and is rendered from a single content model shared by both places it appears.

## Unified scope

The receipt is rendered from **one shared model** (`receiptModel`, see below) and appears in exactly two places, which must always match:

1. **In-app results dialog** — HTML, shown the moment a board is solved.
2. **Copied/shared PNG** — canvas image produced when the player taps "Copy image".

Both consume the same model output, so the on-screen dialog and the shared image are always visually identical in content (not necessarily pixel-identical rendering technology, but identical information and layout intent). There is no separate "card" concept anymore — the receipt IS the share card.

The **copy-TEXT share format is frozen and unchanged** by this redesign (e.g. `Blorblet · practice · ⏱ 1:01 · ✨`). Only the image/dialog visual changes.

## Hard constraints

- **Spoiler-free.** The receipt never shows the day's board or its Sets. The only art is one decorative happy Blorb logo (a single card, not the board) — the already-shipped mascot behavior. Do not add more board cards or hint at unsolved Sets.
- **Copy-text format frozen.** `shareText` output is byte-identical to what ships today; this redesign touches only the dialog HTML and the PNG.
- **No streak/best on the card.** Deliberate, unchanged from the prior card.
- Game logic, art (`blorb.ts`), seeds, board/deck/state, and storage are untouched — this is a presentation-only change.

## Layout (top to bottom)

Monospace throughout (`ui-monospace, "SF Mono", Menlo, Consolas, monospace`). Paper background `#fbf8f3`, ink `#2a2320`, muted `#8a7d74`, dashed-rule color `#c9c0b2`.

1. **Logo** — small (~76px) happy mascot Blorb, centered. In the app: `renderBlorb(session.deal.cards[0], "happy")` — a single card from the day's deal, decorative and spoiler-free.
2. **Title** — the mode name, UPPERCASE, big and bold (~26px+, weight ~800): `BLORBLET` or `BLORBLE`. This is the **primary** mode signal.
3. **Size line** — muted, small (~12px): `9 Blorbs · 4 Sets` (Blorblet) or `12 Blorbs · 6 Sets` (Blorble). This is the **secondary, redundant** mode signal.
4. **Dashed rule.**
5. **Itemized rows** — label left, value right, monospace-aligned:
   - `SETS FOUND   n / n`
   - `HINTS   x n`
   - `GRUMPS   x n`
   (values always render even at zero — a clean solve shows `x 0`, not a blank/omitted row.)
6. **Dashed rule.**
7. **Time row** — `TIME   1:52`, bold, larger (~17px) than the itemized rows above.
8. **Dashed rule.**
9. **Quip note** — `* <quip> *`, bold, centered. The existing deterministic performance quip (same `quip()` logic as today — one of three lines depending on clean / hinted / wrong-guess outcome, seeded by date+mode so every viewer of a shared result sees the same line).
10. **Footer note** — `thank you for blorbing`, muted, centered. Fixed text, not data-driven.
11. **Barcode** — a decorative horizontal bar-code strip, no encoded meaning. CSS:
    ```css
    background: repeating-linear-gradient(90deg,
      #2a2320 0 2px, transparent 2px 4px,
      #2a2320 4px 5px, transparent 5px 8px,
      #2a2320 8px 11px, transparent 11px 13px);
    ```
12. **Footer line** — muted, small (~10.5px): `<date> · doogielampie.github.io/blorble`. Date is `Jul 3`-style (`formatDate(isoDate)`) for a daily result, or the literal word `practice` for a practice board.

## Mode-clarity treatment

Blorble and Blorblet differ by a single letter, and the prior card's header always read a fixed "BLORBLE" regardless of mode — a real ambiguity risk when reading a shared screenshot at a glance. The fix, locked after review, is **two redundant signals**:

- The mode name itself is promoted to the receipt's title — the single largest, boldest text on the card.
- The size line beneath it restates the mode numerically (`9 Blorbs · 4 Sets` vs `12 Blorbs · 6 Sets`), so even a viewer who misreads "Blorblet"/"Blorble" gets a second, differently-shaped cue.

No other part of the design carries mode information; these two lines are sufficient and intentionally redundant.

## Content mapping (`receiptModel`)

The receipt's content is produced by one pure function, `receiptModel(info: ShareInfo): ReceiptModel`, consumed identically by the HTML dialog renderer and the canvas PNG renderer:

```ts
export type ReceiptRow = { label: string; value: string };
export type ReceiptModel = {
  title: string;   // mode, upper-case: "BLORBLE" | "BLORBLET"
  size: string;     // "9 Blorbs · 4 Sets" | "12 Blorbs · 6 Sets"
  rows: ReceiptRow[];
  time: string;     // formatTime(elapsedMs), e.g. "1:52"
  quip: string;     // quip(info) — deterministic performance line
  note: string;     // fixed: "thank you for blorbing"
  date: string;     // formatDate(isoDate) e.g. "Jul 3", or "practice"
  url: string;      // fixed: "doogielampie.github.io/blorble"
};
```

Exact mapping from `ShareInfo` (`label`, `isoDate`, `elapsedMs`, `hints`, `wrongs`, `practice?`, `size`, `sets`):

| Receipt field | Value |
|---|---|
| `title` | `info.label.toUpperCase()` |
| `size` | `` `${info.size} Blorbs · ${info.sets} Sets` `` |
| `rows[0]` | `{ label: "SETS FOUND", value: `${info.sets} / ${info.sets}` }` |
| `rows[1]` | `{ label: "HINTS", value: `x ${info.hints}` }` |
| `rows[2]` | `{ label: "GRUMPS", value: `x ${info.wrongs}` }` |
| `time` | `formatTime(info.elapsedMs)` |
| `quip` | `quip(info)` — unchanged logic: one of three CLEAN / HINTY / WRONGY lines, chosen deterministically by a hash of `isoDate:label` |
| `note` | `"thank you for blorbing"` (fixed) |
| `date` | `info.practice ? "practice" : formatDate(info.isoDate)` |
| `url` | `"doogielampie.github.io/blorble"` (fixed) |

"GRUMPS" = wrong guesses (`info.wrongs`); "HINTS" = hints used (`info.hints`); "SETS FOUND" always shows the completed total over target (`n/n`, since the receipt only appears after a full solve).

## Reference implementation

- Visual reference mockup: `design/blorble-share-v3/receipt-mock.html` — a standalone comparison sheet of four receipts (Blorblet clean/messy, Blorble clean/messy) rendering this exact layout.
- Full implementation plan (model, dialog, PNG, CSS): `docs/superpowers/plans/2026-07-04-blorble-receipt-share.md`.

# Blorble v2.4 — How-to clarity + "Pod" rename — Handoff & Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This doc IS the handoff package — it can be executed in a fresh session directly.

**Goal:** Make the "How to play" dialog actually teach the SET rule to first-timers (reframe as "no odd one out", add a trait-by-trait walkthrough + a counter-example), rename the player-facing term **"Set" → "Pod"** (copy-only), add a light premise line, and add a first-visit "New here?" nudge so newcomers find the how-to before they bounce.

**Architecture:** All changes are UI copy + how-to dialog markup/CSS in `src/main.ts` + `src/style.css`, plus a copy-only rename touching `src/card.ts` (receipt), `index.html` (meta), `README.md`, and two `src/card.test.ts` pins. Game logic, seeds, storage, art (`renderBlorb`), and the internal `sets`/`targetSets` identifiers are untouched. The how-to reuses `renderBlorb` and the existing `.legend`/`.example` CSS patterns.

**Tech Stack:** TypeScript strict + Vitest (`pnpm check`), Vite/GitHub Pages, `tools/phone-shot.sh` rasters.

## Context

A playtester unfamiliar with the card game SET could not understand what counts as a valid group until it was explained in person — the current how-to states the rule abstractly ("each feature is the same on all three, or different on all three"), shows two *valid* examples but never a *wrong* one, and **never auto-opens** (a first-timer must notice the "?" to see it). This update (1) reframes the rule as "**no odd one out**" (intuitive, and it doubles as the story hook), (2) adds a trait-by-trait "is this a pod?" walkthrough plus a **counter-example** with the odd one out flagged — the missing "this is wrong, here's why" that people learn categories from, (3) renames the term to "**Pod**" (chosen via a 3-model LLM Council: unanimous over party/crew/trio; "trio" names the count not validity; "match" collides with the match-3 genre; a pod's members are related-but-distinguishable, quietly supporting "all-different still belongs"), and (4) adds a first-visit nudge. All copy passed the humanizer (em-dashes removed to match the game's period-based style) and plain-language skills (**Flesch Reading Ease 96.17, grade 1.35, textstat 0.7.10 — PASS**).

## LOCKED COPY (use verbatim; humanizer + plain-language applied — do NOT re-add em-dashes)

How-to dialog, top to bottom:
- Heading: `How to play`
- Premise (muted): `Blorbs love company. Help them into pods where nobody's the odd one out.`
- `Every Blorb has 4 features: colour, eyes, shape, and antennae.` (unchanged)
- Feature legend: labels `Colour` / `Eyes` / `Shape` / `Antennae` with the existing example trios (unchanged).
- Rule: `A pod is 3 Blorbs where each feature is the same on all three, or different on all three. No odd one out.`
- Walkthrough (valid) heading: `Is this a pod?` then rows `colour: all different ✓` / `eyes: all same ✓` / `shape: all same ✓` / `antennae: all same ✓` then verdict `No odd one out. It's a pod!`
- Counter-example heading: `And this one?` then row `colour: two blue, one orange ✗` then verdict `The orange one is the odd one out. Not a pod.`
- Second valid example verdict: `Every feature different on all three. Also a pod.`
- Fineprint (UNCHANGED, legal): `inspired by the card game SET · not affiliated with Set Enterprises/PlayMonster`

First-visit curtain nudge (link): `New here? How to play`

Example card tuples `[colour, eyes, shape, antenna-tip]` (decorative, spoiler-free — NOT the day's board):
- Walkthrough valid trio: `[0,1,0,0]`, `[1,1,0,0]`, `[2,1,0,0]` (colour all-different, everything else all-same).
- Counter-example trio: `[0,0,0,0]`, `[0,1,0,0]`, `[1,2,0,0]` — colours are `0,0,1` (two blue, one orange). The **odd one out is index 2** (the orange one). (Eyes differ across the three, which is a valid pattern, so colour is the only violation — the caption focuses only on colour.)
- Second valid trio (all-different): `[0,0,0,0]`, `[1,1,1,1]`, `[2,2,2,2]`.
- Feature legend trios stay exactly as in the current `howtoDialogHtml`.

Visual reference (the locked look, minus the em-dashes now removed): the mockup rendered during brainstorming — a `330px` paper dialog with the premise, the 4-feature legend, a tinted rule box, a green-bordered valid walkthrough (trio + ✓ checklist + verdict), a red-bordered counter-example (trio with the odd one out ringed in red dashed outline + an "odd one out" tag + ✗ + verdict), then the all-different example. Task 1 recreates it as a committed static HTML reference.

## Global Constraints

- **Copy-only rename.** Change only player-visible "Set"/"Sets" strings. Do NOT touch internal identifiers `sets`, `targetSets`, `isSet`, `allSets`, `foundKeys`, `trioKey`, `TOTAL_SETS`, `deal.sets` (in `board.ts`, `game.ts`, `deck.ts`, `main.ts`).
- **Attribution stays.** The "inspired by the card game SET · not affiliated with Set Enterprises/PlayMonster" lines (main.ts + README) name the real game SET — keep verbatim. (The rename actually reduces trademark surface.)
- **Copy-TEXT share format is FROZEN and unaffected** — `shareText`/`src/share.test.ts` never contained "Set"; do not touch them.
- **This re-touches the v2.3 receipt:** `receiptModel` "N Blorbs · N Sets" → "N Blorbs · N Pods" and row "SETS FOUND" → "PODS FOUND", plus the two `card.test.ts` pins. Expected and in-scope.
- **Spoiler-free.** How-to example Blorbs are decorative tuples above, never the day's board.
- `renderBlorb(card, uid, expression)` and all art untouched. `src/seed.ts`, `src/board.ts` (logic), `src/state.ts` schema/key untouched (the nudge only *reads/writes* the existing `seenHowTo` field).
- `pnpm check` (tsc strict + `noUncheckedIndexedAccess` + vitest) green at every commit. Vitest on Node 25 sometimes SIGABRTs after green output — rerun once.
- Rasters: `tools/phone-shot.sh OUT.png W H "/blorble/?query" [PROFILE] [PORT]` against a fresh `pnpm build`; PNG is (W+200)×(H+200), judge top-left W×H. How-to shot uses `?howto=1`; curtain-nudge shot is a first-visit boot (fresh profile). Stateful multi-shot sequences share [PROFILE] AND a pinned [PORT]. Never screenshot the Vite dev server.
- Global `pnpm` (no corepack). NO `gh` CLI — deploy = push to `main`, verify by polling the live bundle. Commit style `feat:`/`fix:`/`docs:`. Work on local `main`; ledger = `.superpowers/sdd/progress.md`.

## Blast-radius map (from a full audit)

| File | Change |
|---|---|
| `src/main.ts` | `howtoDialogHtml` full rewrite (Task 3); curtain size line `· N Sets` → `· N Pods` (Task 2); first-visit nudge in `renderCurtain` + `openHowTo` sets `seenHowTo` (Task 4) |
| `src/style.css` | new `.walk`/`.chk`/`.verdict`/`.odd` how-to styles (Task 3); nudge link style (Task 4) |
| `src/card.ts` | `receiptModel`: `· ${sets} Sets` → `Pods`, `"SETS FOUND"` → `"PODS FOUND"` (Task 2) |
| `src/card.test.ts` | 4 pins: "N Blorbs · N Pods", "PODS FOUND" (Task 2) |
| `index.html` | meta description + og:description "Sets" → "Pods" (Task 2) |
| `README.md` | user-facing "Sets"/"Set" → "Pods"/"pod" (keep the SET attribution line) (Task 2) |
| `package.json` | version `2.3.0` → `2.4.0` (Task 6) |
| new docs | spec, mockup reference, this plan (Task 1) |

---

### Task 1: Confirm the handoff package + record the base
The handoff package is already committed: this plan, `design/blorble-howto-v4/howto-mock.html` (the LOCKED visual reference for Task 3), and `docs/superpowers/V2.4-HOWTO-POD-HANDOFF.md` (the entry point). This plan doubles as the design spec (see the Context + LOCKED COPY sections).
- [ ] `git log --oneline -3` — confirm the handoff/docs commit is present; record the current HEAD as the final-review base for Task 6.
- [ ] Open or raster `design/blorble-howto-v4/howto-mock.html` — it is the visual target for Task 3 (final copy is em-dash-free; do not re-add em-dashes).

### Task 2: "Set" → "Pod" copy-only rename (test-first)
**Files:** `src/card.ts`, `src/card.test.ts`, `src/main.ts` (curtain line only), `index.html`, `README.md`.
- [ ] **Test-first:** update the 4 `card.test.ts` pins — `"12 Blorbs · 6 Sets"`→`"12 Blorbs · 6 Pods"`, `"9 Blorbs · 4 Sets"`→`"9 Blorbs · 4 Pods"`, and the two `{ label: "SETS FOUND", … }`→`{ label: "PODS FOUND", … }`. Run `pnpm vitest run src/card.test.ts` → FAIL.
- [ ] In `src/card.ts` `receiptModel`: `size: \`${info.size} Blorbs · ${info.sets} Pods\``; row label `"PODS FOUND"`. Rerun → PASS.
- [ ] In `src/main.ts` `renderCurtain`: `${m.size} Blorbs · ${m.targetSets} Pods`.
- [ ] `index.html`: meta + og descriptions, "4 Sets"/"6 Sets"/"hidden Sets" → Pods.
- [ ] `README.md`: user-facing "Sets"/"Set" → "Pods"/"pod" (e.g. "4 Pods", "an unfound pod", "become a pod"); **keep line ~36 attribution verbatim**.
- [ ] `pnpm check` green. Commit `feat: rename player-facing "Set" to "Pod" (copy-only; internal identifiers + SET credit unchanged)`.

### Task 3: How-to dialog redesign
**Files:** `src/main.ts` (`howtoDialogHtml`), `src/style.css`.
- [ ] Rewrite `howtoDialogHtml` with the LOCKED COPY: premise, the (unchanged) 4-feature legend via `legendRow`, the rule line, the valid walkthrough (trio via `renderBlorb` + a per-feature ✓ checklist + verdict), the counter-example (trio with the odd-one-out tile ringed + `colour: two blue, one orange ✗` + verdict), the all-different example + verdict, and the unchanged fineprint. Use the example tuples above; keep uids namespaced (`hw*`, `hc*`, etc.) so they never collide with in-game `c${i}`.
- [ ] Add `src/style.css` rules `.walk`/`.walk.ok`/`.walk.no`/`.wh`/`.chk`/`.verdict`/`.trio .cell`/`.cell.odd` (green/red accents `#2f8f6b`/`#c2452f`, dashed odd-one-out ring, an "odd one out" tag) reusing the dialog/legend look. Keep the dialog scrollable (`.dialog-scroll`) and within `330px`.
- [ ] `pnpm check`; `pnpm build`; raster `?howto=1` at 390×844 and 375×667 (`pkill -f 'headless=new'` after). Judge vs `design/blorble-howto-v4/howto-mock.html`: reframed rule reads clearly, the ✓ walkthrough and the red counter-example (odd one out obvious) both render, fits/scrolls on the small phone.
- [ ] Commit `feat: how-to redesign — no-odd-one-out reframe, trait-by-trait walkthrough, counter-example`.

### Task 4: First-visit "New here?" nudge
**Files:** `src/main.ts` (`renderCurtain`, `openHowTo`), `src/style.css`.
- [ ] In `renderCurtain`, when `!saved.seenHowTo`, render a quiet `New here? How to play` link (id e.g. `btn-howto-nudge`) inside the curtain card (below "practice instead"); wire its click to `openHowTo()`.
- [ ] In `openHowTo`, set `saved = { ...saved, seenHowTo: true }` and `persist()` (activates the previously-vestigial flag; non-breaking — field already in the v:2 schema). The nudge then stops appearing once the player has opened the how-to once.
- [ ] `pnpm check`; `pnpm build`; raster a first-visit boot (fresh profile, `?date=2026-07-04`) at 390×844 — the Blorblet curtain shows the nudge; after opening how-to once, a reload with the same profile shows no nudge. Commit `feat: first-visit "New here?" how-to nudge on the curtain`.

### Task 5: Full raster sweep + USER GATE
- [ ] `pnpm check && pnpm build`; shots into `.superpowers/sdd/shots/howto/`: how-to 390 + 375; first-visit curtain-with-nudge; a receipt showing `PODS FOUND` / `· N Pods` (`?autoplay=1&solve=N`); a curtain showing `· N Pods`. `pkill -f 'headless=new'`.
- [ ] Present to the USER for look approval (the how-to is the crux — confirm the explanation lands). Apply tweaks, re-shoot, re-present. Blocking.

### Task 6: Version + README + final review + deploy + smoke + ledger
- [ ] Bump `package.json` `2.3.0` → `2.4.0`.
- [ ] Final whole-branch review (most capable model; base = pre-plan HEAD `git rev-parse HEAD` recorded at Task 1). Fix confirmed findings; re-check; commit.
- [ ] `git push origin main`; poll live bundle for a v2.4 marker (e.g. `nobody's the odd one out` or `PODS FOUND`).
- [ ] Live smoke: how-to shows the new copy + counter-example + "Pod" everywhere; curtain/receipt read "Pods"/"PODS FOUND"; first-visit nudge appears then clears; copy-text share still the frozen format. If Pages flakes (a known transient `deploy-pages` failure), re-trigger with an empty commit.
- [ ] Ledger + memory ([[blorble-v1-shipped]]) updated; `=== V2.4 SHIPPED … ===`; report to user.

## Verification (end-to-end)
1. `pnpm check` green every commit (updated `card.test.ts` pins; `share.test.ts` untouched proves copy-text frozen; quip tests untouched).
2. Raster DoD (how-to both phones, curtain nudge, receipt "PODS FOUND") judged vs the mockup; USER approval gates deploy.
3. Copy verified plain (FRE 96.17 / grade 1.35, recorded in the spec) and em-dash-free.
4. Deploy verified by live-bundle polling + browser smoke; internal `sets`/`targetSets` and the SET attribution confirmed unchanged.

import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { renderBlorb } from "./blorb";
import { dailyBoard } from "./board";
import { DECK } from "./deck";

// Not a unit test: PREVIEW=1 writes a static grid for headless-Chrome raster
// review (the real gate for art). Guarded so normal runs skip it.
test.runIf(process.env.PREVIEW === "1")("write preview grid", () => {
  const tile = (svg: string, cap = "") =>
    `<div><div class="tile">${svg}</div>${cap ? `<div class="cap">${cap}</div>` : ""}</div>`;
  const board = dailyBoard("2026-07-01");
  const EXPR_CARDS = [[0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2]] as const;
  const exprRow = (["rest", "happy", "grumpy"] as const)
    .map((ex) => EXPR_CARDS.map((c, i) => tile(renderBlorb(c, `x${ex}${i}`, ex), ex)).join(""))
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#fbf8f3;color:#3a2c26;font-family:ui-sans-serif,system-ui;padding:20px}
    h2{font-size:15px;margin:16px 0 8px}
    .row{display:grid;grid-template-columns:repeat(9,90px);gap:10px}
    .tile{background:#f4f0ea;border-radius:14px;padding:6px}
    .cap{font-size:11px;color:#6b5d54;text-align:center;margin-top:3px}
  </style>
  <h2>Expressions — rest / happy / grumpy</h2><div class="row">${exprRow}</div>
  <h2>Daily board 2026-07-01</h2>
  <div class="row">${board.cards.map((c, i) => tile(renderBlorb(c, `b${i}`), `#${i}`)).join("")}</div>
  <h2>Full deck — all 81</h2>
  <div class="row">${DECK.map((c, i) => tile(renderBlorb(c, `d${i}`))).join("")}</div>`;
  mkdirSync("preview", { recursive: true });
  writeFileSync("preview/blorbs.html", html);
});

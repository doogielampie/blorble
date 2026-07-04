import { type ShareInfo, formatDate, formatTime } from "./share";

// Performance-aware mascot quip, deterministic per (isoDate, label, outcome) —
// same result day so every viewer of a shared card sees the same line.
export const quip = (info: { isoDate: string; label: string; hints: number; wrongs: number }): string => {
  const CLEAN = ["clean blorbing!", "flawless. the Blorbs bow.", "not a single grump."];
  const HINTY = ["hints were consumed.", "a little help never hurt.", "the bulb did its part."];
  const WRONGY = ["a scenic route!", "the Blorbs forgive you.", "grumps happened."];
  const pool = info.hints === 0 && info.wrongs === 0 ? CLEAN : info.hints > 0 ? HINTY : WRONGY;
  let h = 0;
  const key = `${info.isoDate}:${info.label}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return pool[h % pool.length]!;
};

export type ReceiptRow = { label: string; value: string };
export type ReceiptModel = {
  title: string; size: string; rows: ReceiptRow[];
  time: string; quip: string; note: string; date: string; url: string;
};

// The receipt's content, modelled once so the in-app dialog (HTML) and the
// shared PNG (canvas) render identically. Spoiler-free; no streak/best.
export const receiptModel = (info: ShareInfo): ReceiptModel => ({
  title: info.label.toUpperCase(),
  size: `${info.size} Blorbs · ${info.sets} Pods`,
  rows: [
    { label: "PODS FOUND", value: `${info.sets} / ${info.sets}` },
    { label: "HINTS", value: `x ${info.hints}` },
    { label: "GRUMPS", value: `x ${info.wrongs}` },
  ],
  time: formatTime(info.elapsedMs),
  quip: quip(info),
  note: "thank you for blorbing",
  date: info.practice ? "practice" : formatDate(info.isoDate),
  url: "doogielampie.github.io/blorble",
});

// Portrait 800×1000 shareable PNG — the receipt, drawn from the same
// receiptModel the in-app dialog renders, so the two always match: mascot
// logo, mode title + size, itemised rows, time, quip, barcode, footer.
// Never shows the board (spoiler-free).
export const renderStatsCard = (info: ShareInfo, blorbSvg: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbf8f3";
    ctx.fillRect(0, 0, 800, 1000);
    const img = new Image();
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
    img.onerror = () => reject(new Error("blorb image failed"));
    // SVGs without intrinsic width/height are a known canvas failure mode
    // outside Chrome — inject explicit dimensions before encoding.
    const sized = blorbSvg.replace("<svg ", '<svg width="200" height="224" ');
    img.src = "data:image/svg+xml," + encodeURIComponent(sized);
  });

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

// Text lines for the shareable stats image (pure — the canvas part is thin).
// [marksLine, contextLine] — no streak/best (those live only in-app now).
export const cardLines = (info: ShareInfo): string[] => {
  const marksLine = info.hints === 0 && info.wrongs === 0
    ? "no hints, no misses"
    : [info.hints > 0 ? `💡${info.hints}` : "", info.wrongs > 0 ? `✖️${info.wrongs}` : ""].filter(Boolean).join(" ");
  // Daily: "Blorble · Jul 3" (F6). Practice: "Practice · Blorble" (P3) — the
  // stats-card PNG mirrors the dialog. shareText (the copy-text format) is
  // untouched and still reads "Blorble · practice · …".
  const contextLine = info.practice ? `Practice · ${info.label}` : `${info.label} · ${formatDate(info.isoDate)}`;
  return [marksLine, contextLine];
};

// Portrait 800×1000 shareable PNG mirroring the results dialog — mascot with
// a speech-bubble quip, huge time, marks line, context line, URL footer.
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
      // speech bubble first, top-center, flattened bottom-left corner
      const [marksLine = "", contextLine = ""] = cardLines(info);
      const q = quip(info);
      const bubbleX = 40;
      const bubbleY = 40;
      const bubbleW = 720;
      const bubbleH = 110;
      const r = 22;
      ctx.fillStyle = "#f4f0ea";
      ctx.strokeStyle = "#2a2320";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bubbleX + r, bubbleY);
      ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
      ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r, r);
      ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
      ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH, r);
      ctx.lineTo(bubbleX + 2, bubbleY + bubbleH); // flattened bottom-left corner
      ctx.lineTo(bubbleX, bubbleY + bubbleH - 2);
      ctx.lineTo(bubbleX, bubbleY + r);
      ctx.arcTo(bubbleX, bubbleY, bubbleX + r, bubbleY, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2320";
      ctx.font = "600 34px ui-rounded, ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(q, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2 + 12);

      // mascot, below the bubble, aspect-correct (source SVG is 200×224) so
      // antennae aren't squashed — drawn after the bubble so its bottom edge
      // (bubbleY + bubbleH = 150) never covers them, with a clear gap below it.
      const mascotW = 320;
      const mascotH = Math.round((mascotW * 224) / 200); // 358
      const mascotX = (800 - mascotW) / 2;
      const mascotY = bubbleY + bubbleH + 20; // 170 — ≥20px clear of the bubble
      ctx.drawImage(img, mascotX, mascotY, mascotW, mascotH);
      const mascotBottom = mascotY + mascotH; // 528

      // huge time
      ctx.fillStyle = "#2a2320";
      ctx.font = "700 120px ui-rounded, ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(formatTime(info.elapsedMs), 400, mascotBottom + 80);

      // marks line
      ctx.font = "600 42px ui-rounded, ui-sans-serif, system-ui";
      ctx.fillStyle = "#1f97f0";
      ctx.fillText(marksLine, 400, mascotBottom + 150);

      // context line
      ctx.font = "500 34px ui-rounded, ui-sans-serif, system-ui";
      ctx.fillStyle = "#8a7d74";
      ctx.fillText(contextLine, 400, mascotBottom + 210);

      // URL footer
      ctx.font = "500 26px ui-rounded, ui-sans-serif, system-ui";
      ctx.fillStyle = "#8a7d74";
      ctx.fillText("doogielampie.github.io/blorble", 400, 950);

      ctx.textAlign = "left";
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("blorb image failed"));
    // SVGs without intrinsic width/height are a known canvas failure mode
    // outside Chrome — inject explicit dimensions before encoding.
    const sized = blorbSvg.replace("<svg ", '<svg width="200" height="224" ');
    img.src = "data:image/svg+xml," + encodeURIComponent(sized);
  });

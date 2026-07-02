import { type ShareInfo, formatDate, formatTime } from "./share";

// Text lines for the shareable stats image (pure — the canvas part is thin).
export const cardLines = (info: ShareInfo & { streak: number; best: number | null }): string[] => {
  const marks = info.hints === 0 && info.wrongs === 0
    ? "✨"
    : [info.hints > 0 ? `💡${info.hints}` : "", info.wrongs > 0 ? `✖️${info.wrongs}` : ""].filter(Boolean).join(" ");
  const head = `${info.practice ? "practice" : formatDate(info.isoDate)} · ⏱ ${formatTime(info.elapsedMs)} · ${marks}`;
  if (info.practice) return [head];
  const lines = [head, `🔥 ${info.streak}-day streak`];
  if (info.best !== null) lines.push(`🏆 best ${formatTime(info.best)}`);
  return lines;
};

// 1000×620 shareable PNG. Never shows the board (spoiler-free) — one happy
// Blorb reacting to your time.
export const renderStatsCard = (
  info: ShareInfo & { streak: number; best: number | null },
  blorbSvg: string,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 620;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fbf8f3";
    ctx.fillRect(0, 0, 1000, 620);
    ctx.fillStyle = "#f4f0ea";
    ctx.beginPath();
    ctx.roundRect(40, 40, 400, 540, 28);
    ctx.fill();
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 70, 90, 340, 364);
      ctx.fillStyle = "#2a2320";
      ctx.font = "700 84px ui-rounded, ui-sans-serif, system-ui";
      ctx.fillText("Blorble", 500, 160);
      ctx.font = "700 44px ui-rounded, ui-sans-serif, system-ui";
      ctx.fillStyle = "#1f97f0";
      ctx.fillText(info.label, 502, 224);
      ctx.fillStyle = "#2a2320";
      ctx.font = "600 40px ui-rounded, ui-sans-serif, system-ui";
      cardLines(info).forEach((line, i) => ctx.fillText(line, 502, 320 + i * 72));
      ctx.fillStyle = "#8a7d74";
      ctx.font = "500 30px ui-rounded, ui-sans-serif, system-ui";
      ctx.fillText("doogielampie.github.io/blorble", 502, 560);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => reject(new Error("blorb image failed"));
    // SVGs without intrinsic width/height are a known canvas failure mode
    // outside Chrome — inject explicit dimensions before encoding.
    const sized = blorbSvg.replace("<svg ", '<svg width="200" height="214" ');
    img.src = "data:image/svg+xml," + encodeURIComponent(sized);
  });

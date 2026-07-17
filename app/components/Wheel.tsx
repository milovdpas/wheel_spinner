"use client";

import { useCallback, useEffect, useRef } from "react";

const TAU = Math.PI * 2;

const COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#EC4899", // pink
];

function segmentColor(index: number, total: number): string {
  // Avoid the last segment matching the first one when the palette wraps.
  if (total > 1 && index === total - 1 && total % COLORS.length === 1) {
    return COLORS[(index + 3) % COLORS.length];
  }
  return COLORS[index % COLORS.length];
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

type WheelProps = {
  names: string[];
  disabled?: boolean;
  /** Called at the moment of the tap; returns the index the wheel must land on. */
  pickWinnerIndex: () => number | null;
  onSpinStart?: () => void;
  onSpinEnd?: (name: string, index: number) => void;
};

export default function Wheel({
  names,
  disabled = false,
  pickWinnerIndex,
  onSpinStart,
  onSpinEnd,
}: WheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const rafRef = useRef(0);
  const namesRef = useRef<string[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = container.clientWidth;
    if (size === 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 12;
    const list = namesRef.current;

    if (list.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fillStyle = "#d4d4d4";
      ctx.fill();
      ctx.fillStyle = "#525252";
      ctx.font = `600 ${Math.max(14, r * 0.08)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add names below", cx, cy);
      return;
    }

    const seg = TAU / list.length;
    const rot = rotationRef.current;

    // Wedges
    for (let i = 0; i < list.length; i++) {
      const a0 = rot + i * seg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a0 + seg);
      ctx.closePath();
      ctx.fillStyle = segmentColor(i, list.length);
      ctx.fill();
      if (list.length > 1) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Labels
    const chord = seg * r * 0.62; // room available across the wedge at the text radius
    const fontSize = Math.max(7, Math.min(r * 0.11, chord * 0.7));
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i < list.length; i++) {
      const mid = rot + i * seg + seg / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);
      ctx.fillText(fitText(ctx, list[i], r * 0.55), r * 0.9, 0);
      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.15, 0, TAU);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#404040";
    ctx.font = `700 ${Math.max(10, r * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);

    // Pointer (right side, pointing into the wheel)
    ctx.beginPath();
    ctx.moveTo(cx + r + 8, cy - 16);
    ctx.lineTo(cx + r + 8, cy + 16);
    ctx.lineTo(cx + r - 20, cy);
    ctx.closePath();
    ctx.fillStyle = "#262626";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.fill();
    ctx.stroke();
  }, []);

  useEffect(() => {
    namesRef.current = names;
    draw();
  }, [names, draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const spin = () => {
    const list = namesRef.current;
    if (spinningRef.current || disabled || list.length === 0) return;
    const index = pickWinnerIndex();
    if (index == null || index < 0 || index >= list.length) return;

    spinningRef.current = true;
    onSpinStart?.();

    const seg = TAU / list.length;
    // Land somewhere inside the winning segment, not dead-center every time.
    const jitter = (Math.random() * 0.7 - 0.35) * seg;
    // The pointer sits at angle 0; solve rotation so the segment midpoint ends up there.
    const target = (((-(index * seg + seg / 2 + jitter)) % TAU) + TAU) % TAU;
    const from = rotationRef.current;
    const fromMod = ((from % TAU) + TAU) % TAU;
    const delta = ((target - fromMod) % TAU + TAU) % TAU;
    const turns = 5 + Math.floor(Math.random() * 3);
    const total = delta + turns * TAU;
    const duration = 4200 + Math.random() * 800;
    const start = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      rotationRef.current = from + total * eased;
      draw();
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        spinningRef.current = false;
        onSpinEnd?.(list[index], index);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Spin the wheel"
      onClick={spin}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          spin();
        }
      }}
      className="relative mx-auto aspect-square w-full max-w-[480px] cursor-pointer select-none outline-none lg:max-w-[560px]"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

const CONFETTI_COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vr: number;
  color: string;
};

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (fromTop: boolean): Particle => ({
      x: Math.random() * width,
      y: fromTop ? -20 : Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2 + Math.random() * 3,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    });

    const particles = Array.from({ length: 130 }, () => spawn(false));

    let raf = 0;
    const frame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        if (p.y > height + 20) Object.assign(p, spawn(true));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />;
}

type WinnerOverlayProps = {
  name: string;
  onRemove: () => void;
  onClose: () => void;
};

export default function WinnerOverlay({ name, onRemove, onClose }: WinnerOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Winner"
    >
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <Confetti />
      <div className="animate-pop-in relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-neutral-900">
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          We have a winner!
        </p>
        <p className="break-words py-5 text-4xl font-bold">🎉 {name}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium transition active:scale-95 dark:border-neutral-700"
          >
            Remove from wheel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition active:scale-95 dark:bg-white dark:text-neutral-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

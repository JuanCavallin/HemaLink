"use client";

import { useEffect, useRef } from "react";

// Minimal, safe Particles component. Renders a fixed, pointer-ignoring canvas.
export default function Particles() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
  const canvas = ref.current as HTMLCanvasElement;
  const ctxMaybe = canvas.getContext("2d");
  if (!ctxMaybe) return;
  const ctx = ctxMaybe as CanvasRenderingContext2D;

    // canvas sizing
    let w = 0;
    let h = 0;
    const fit = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    };

    // particle state
    type P = {
      x: number; y: number; vx: number; vy: number; r: number; a: number; theta: number; dtheta: number;
    };
    const particles: P[] = [];
    const mouse = { x: -9999, y: -9999 };
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    // RBC drawing (simple, performant)
    function drawRbc(radius: number, alpha: number) {
      // base red gradient
      const g = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
      g.addColorStop(0.0, "#b3131a");
      g.addColorStop(0.6, "#e23b3b");
      g.addColorStop(1.0, "#6f0a0f");
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // biconcave dimple (darker center)
      ctx.globalAlpha = alpha * 0.6;
      const d = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.7);
      d.addColorStop(0.0, "rgba(60,0,0,0.55)");
      d.addColorStop(0.5, "rgba(160,20,28,0.15)");
      d.addColorStop(1.0, "rgba(0,0,0,0.0)");
      ctx.fillStyle = d;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // subtle rim sheen
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = "rgba(255,140,140,0.2)";
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
      ctx.stroke();

      // small highlight
      ctx.globalAlpha = alpha * 0.35;
      const hi = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, 0, -radius * 0.35, -radius * 0.35, radius * 0.55);
      hi.addColorStop(0.0, "rgba(255,255,255,0.35)");
      hi.addColorStop(0.5, "rgba(255,255,255,0.10)");
      hi.addColorStop(1.0, "rgba(255,255,255,0.0)");
      ctx.fillStyle = hi;
      ctx.beginPath();
      ctx.ellipse(-radius * 0.25, -radius * 0.25, radius * 0.55, radius * 0.38, -0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    const seed = () => {
      particles.length = 0;
      const area = w * h;
      const count = Math.min(90, Math.max(30, Math.floor(area / 45000)));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: rand(-0.15, 0.15),
          vy: rand(-0.15, 0.15),
          r: rand(8, 16),
          a: rand(0.6, 1.0),
          theta: rand(0, Math.PI * 2),
          dtheta: rand(-0.01, 0.01),
        });
      }
    };

    // animation loop
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // interactivity
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const repelRadius = 140;
        if (dist < repelRadius) {
          const strength = (1 - dist / repelRadius) * 0.8;
          p.vx += (dx / dist) * strength * 0.5;
          p.vy += (dy / dist) * strength * 0.5;
        }

        // integrate
        p.vx *= 0.996;
        p.vy *= 0.996;
        p.x += p.vx + Math.cos(p.theta) * 0.05;
        p.y += p.vy + Math.sin(p.theta * 1.2) * 0.05;
        p.theta += p.dtheta;

        // wrap edges
        const m = 24;
        if (p.x < -m) p.x = w + m;
        if (p.x > w + m) p.x = -m;
        if (p.y < -m) p.y = h + m;
        if (p.y > h + m) p.y = -m;

        // draw RBC with slight tilt squish
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.theta);
        const tiltY = 0.88 + 0.12 * Math.sin(p.theta * 1.2);
        ctx.scale(1, tiltY);
        drawRbc(p.r, p.a);
        ctx.restore();
      }
    };

    // events
    const onResize = () => { fit(); seed(); };
    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    };
    const onTouchEnd = onMouseLeave;

    fit();
    seed();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    raf = requestAnimationFrame(step);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onTouchEnd);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      aria-hidden
      style={{ zIndex: 0, display: "block" }}
    />
  );
}

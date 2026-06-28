"use client";

import React, { useEffect, useRef } from "react";

/**
 * Agent Constellation — canvas-rendered signature animation.
 *
 * Six nodes positioned around a circle: Sponsor (entry), Maestro Case (orchestrator,
 * center), Agent Builder, LangChain, Action Center, NEAR/TEE. Data packets flow
 * along edges between Maestro and each peripheral node in a rhythm that mirrors
 * the case lifecycle. Pure canvas, no dependencies, respects reduced motion.
 */

type NodeDef = {
  id: string;
  label: string;
  sub: string;
  angle: number; // radians, 0 = right, increases CCW
  ring: number;  // 0 = center, 1 = peripheral
};

const NODES: NodeDef[] = [
  { id: "sponsor",  label: "SPONSOR",         sub: "intake",          angle: Math.PI,           ring: 1 },
  { id: "maestro",  label: "MAESTRO",         sub: "orchestrator",    angle: 0,                 ring: 0 },
  { id: "agent_b",  label: "AGENT BUILDER",   sub: "triage · route",  angle: -Math.PI / 2.4,    ring: 1 },
  { id: "langchain",label: "LANGCHAIN",       sub: "insight",         angle: Math.PI / 2.4,     ring: 1 },
  { id: "action",   label: "ACTION CENTER",   sub: "humans",          angle: -Math.PI / 6,      ring: 1 },
  { id: "near",     label: "NEAR + TEE",      sub: "split · attest",  angle: Math.PI / 6,       ring: 1 },
];

const EDGES: { from: string; to: string; stage: string }[] = [
  { from: "sponsor",   to: "maestro",  stage: "intake"       },
  { from: "maestro",   to: "agent_b",  stage: "triage"       },
  { from: "maestro",   to: "langchain",stage: "analyze"      },
  { from: "maestro",   to: "action",   stage: "approve"      },
  { from: "maestro",   to: "near",     stage: "settle"       },
];

export default function AgentConstellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Resolved node positions, recomputed each frame in case of resize
    function positions() {
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.36;
      const map: Record<string, { x: number; y: number }> = {};
      for (const n of NODES) {
        if (n.ring === 0) {
          map[n.id] = { x: cx, y: cy };
        } else {
          map[n.id] = { x: cx + Math.cos(n.angle) * radius, y: cy + Math.sin(n.angle) * radius };
        }
      }
      return map;
    }

    function drawEdge(p0: {x:number;y:number}, p1: {x:number;y:number}, dim = false) {
      ctx!.beginPath();
      ctx!.moveTo(p0.x, p0.y);
      ctx!.lineTo(p1.x, p1.y);
      ctx!.strokeStyle = dim ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.14)";
      ctx!.lineWidth = 1;
      ctx!.stroke();
    }

    function drawPacket(p0: {x:number;y:number}, p1: {x:number;y:number}, t: number, alpha = 1) {
      const x = p0.x + (p1.x - p0.x) * t;
      const y = p0.y + (p1.y - p0.y) * t;
      // glow
      const grad = ctx!.createRadialGradient(x, y, 0, x, y, 18);
      grad.addColorStop(0, `rgba(185,255,102,${0.6 * alpha})`);
      grad.addColorStop(1, "rgba(185,255,102,0)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(x, y, 18, 0, Math.PI * 2);
      ctx!.fill();
      // core
      ctx!.fillStyle = `rgba(185,255,102,${alpha})`;
      ctx!.beginPath();
      ctx!.arc(x, y, 3, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawNode(p: {x:number;y:number}, label: string, sub: string, center: boolean, pulsePhase: number) {
      // outer hairline ring
      const r = center ? 56 : 38;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx!.strokeStyle = center ? "rgba(185,255,102,0.5)" : "rgba(255,255,255,0.22)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // breathing inner ring on center node
      if (center) {
        const breathR = r + 8 + Math.sin(pulsePhase) * 5;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, breathR, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(185,255,102,${0.18 + 0.18 * Math.max(0, Math.sin(pulsePhase))})`;
        ctx!.stroke();
      }

      // inner dot
      ctx!.fillStyle = center ? "rgba(185,255,102,0.95)" : "rgba(243,239,230,0.85)";
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, center ? 5 : 3.5, 0, Math.PI * 2);
      ctx!.fill();

      // label
      ctx!.fillStyle = center ? "rgba(185,255,102,0.95)" : "rgba(243,239,230,0.85)";
      ctx!.font = `500 11px ui-monospace, JetBrains Mono, monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";
      ctx!.fillText(label, p.x, p.y + r + 10);

      ctx!.fillStyle = "rgba(243,239,230,0.45)";
      ctx!.font = `10px ui-monospace, JetBrains Mono, monospace`;
      ctx!.fillText(sub, p.x, p.y + r + 24);
    }

    function frame(now: number) {
      if (!startedAtRef.current) startedAtRef.current = now;
      const elapsed = (now - startedAtRef.current) / 1000;
      const pulsePhase = elapsed * 1.4;
      ctx!.clearRect(0, 0, w, h);
      const pos = positions();

      // edges
      for (const e of EDGES) drawEdge(pos[e.from], pos[e.to]);

      // packets: each edge has a packet that loops with a per-edge offset so
      // the pattern feels staggered and "alive"
      EDGES.forEach((e, i) => {
        const period = 2.8; // seconds per traversal
        const phase = (elapsed / period + i * 0.18) % 1;
        const reverse = e.from === "sponsor"; // sponsor → maestro one-way
        const t = reverse ? phase : phase;
        const alpha = 0.7 + 0.3 * Math.sin(elapsed * 2 + i);
        drawPacket(pos[e.from], pos[e.to], t, alpha);

        // a second packet returning maestro → peripheral (except sponsor)
        if (e.from === "maestro") {
          const t2 = ((phase + 0.5) % 1);
          drawPacket(pos[e.to], pos[e.from], t2, 0.5);
        }
      });

      // nodes (draw last so they sit on top of edges)
      for (const n of NODES) {
        drawNode(pos[n.id], n.label, n.sub, n.ring === 0, pulsePhase);
      }

      if (!prefersReduced) rafRef.current = requestAnimationFrame(frame);
    }

    if (prefersReduced) {
      // still draw a single static frame
      frame(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 9", maxHeight: "560px" }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

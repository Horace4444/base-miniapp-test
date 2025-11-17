"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./DrawingCanvas.module.css";

export type DrawingSeed = Uint8Array;

type Point = {
  x: number;
  y: number;
  t: number;
};

type DrawingCanvasProps = {
  onComplete: (seed: DrawingSeed) => void;
  onInvalid?: () => void;
};

export function DrawingCanvas({ onComplete, onInvalid }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const pointsRef = useRef<Point[]>([]);
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw(ctx, pointsRef.current);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    redraw(ctx, points);
  }, [points]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  function startNewStroke(point: Point) {
    cancelFade();
    pointsRef.current = [point];
    setPoints(pointsRef.current);
    setIsDrawing(true);
  }

  function extendStroke(point: Point) {
    if (!isDrawing) return;
    pointsRef.current = [...pointsRef.current, point];
    setPoints(pointsRef.current);
  }

  function cancelFade() {
    if (fadeTimeoutRef.current) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
  }

  function scheduleFade() {
    cancelFade();
    fadeTimeoutRef.current = window.setTimeout(() => {
      pointsRef.current = [];
      setPoints([]);
      fadeTimeoutRef.current = null;
    }, 1000);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    startNewStroke({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      t: now,
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    extendStroke({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      t: now,
    });
  }

  async function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    extendStroke({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      t: now,
    });

    const stroke = pointsRef.current;
    if (stroke.length < 12) {
      onInvalid?.();
      scheduleFade();
      return;
    }

    const looksC = looksLikeC(stroke, rect.width, rect.height);
    if (!looksC) {
      onInvalid?.();
      scheduleFade();
      return;
    }

    const seed = await drawingToSeed(stroke, rect.width, rect.height);
    onComplete(seed);
    scheduleFade();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.canvasShell}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            setIsDrawing(false);
            scheduleFade();
          }}
        />
      </div>
    </div>
  );
}

function redraw(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0, 82, 255, 0.4)";
  ctx.shadowBlur = 14;

  for (let i = 1; i < points.length; i += 1) {
    const progress = i / points.length;
    const alpha = 0.25 + progress * 0.75;
    const width = 8 + progress * 10;
    ctx.strokeStyle = `rgba(0, 82, 255, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  ctx.restore();
}

function looksLikeC(points: Point[], width: number, height: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((point) => {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  });

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const minSpan = Math.min(width, height) * 0.25;

  if (spanX < minSpan || spanY < minSpan) {
    return false;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const rightQuarterX = width * 0.5;
  const topQuarterY = height * 0.5;

  const startNearTopRight = start.x > rightQuarterX && start.y < topQuarterY;
  const endNearBottomRight = end.x > rightQuarterX && end.y > topQuarterY;
  if (!startNearTopRight || !endNearBottomRight) {
    return false;
  }

  const gapToRightEdge = width - maxX;
  if (gapToRightEdge < width * 0.05) {
    return false;
  }

  return true;
}

async function drawingToSeed(
  points: Point[],
  width: number,
  height: number,
): Promise<DrawingSeed> {
  const payload = {
    width,
    height,
    points: points.map((p) => ({
      x: p.x / width,
      y: p.y / height,
      t: p.t - points[0].t,
    })),
    sessionId: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hash);
}


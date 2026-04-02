'use client';

import { useRef } from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';
import type { CreateTypes as CanvasConfettiInstance } from 'canvas-confetti';

export function useConfetti() {
  const confettiRef = useRef<CanvasConfettiInstance | null>(null);

  function fire() {
    if (!confettiRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const shoot = (particleCount: number, angle: number, spread: number, originX: number) => {
      confettiRef.current?.({
        particleCount,
        angle,
        spread,
        startVelocity: 42,
        ticks: 180,
        gravity: 1,
        origin: { x: originX, y: 0.35 },
      });
    };

    shoot(80, 55, 70, 0.1);
    window.setTimeout(() => shoot(70, 125, 70, 0.9), 180);
    window.setTimeout(() => shoot(90, 90, 90, 0.5), 360);
  }

  const canvas = (
    <ReactCanvasConfetti
      onInit={({ confetti }) => {
        confettiRef.current = confetti;
      }}
      className="pointer-events-none fixed inset-0 z-30 h-full w-full"
      style={{ width: '100%', height: '100%' }}
    />
  );

  return { fire, canvas };
}

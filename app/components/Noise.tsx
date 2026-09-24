'use client';

import { useEffect, useRef } from 'react';
import './Noise.css';

type NoiseProps = {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
};

export default function Noise({
  patternSize = 250,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 2,
  patternAlpha = 15,
}: NoiseProps) {
  const grainRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    let frame = 0;
    let animationId = 0;
    const canvasSize = 1024;
    const refreshInterval = Math.max(1, Math.round(patternRefreshInterval));
    const alpha = Math.max(0, Math.min(255, patternAlpha));

    const resize = () => {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    };

    const drawGrain = () => {
      const imageData = context.createImageData(canvasSize, canvasSize);
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        const value = Math.random() * 255;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = alpha;
      }
      context.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (frame % refreshInterval === 0) drawGrain();
      frame += 1;
      animationId = window.requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationId);
    };
  }, [patternSize, patternScaleX, patternScaleY, patternRefreshInterval, patternAlpha]);

  return (
    <canvas
      ref={grainRef}
      className="noise-overlay"
      aria-hidden="true"
      style={{
        imageRendering: 'pixelated',
        transform: `scale(${patternScaleX}, ${patternScaleY})`,
        backgroundSize: `${patternSize}px ${patternSize}px`,
      }}
    />
  );
}

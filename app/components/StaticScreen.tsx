'use client';

import { useEffect, useRef } from 'react';

// TV static for the 404 page's screen: a tiny canvas of random greys,
// redrawn a few times a second and scaled up so the grain stays chunky.
export default function StaticScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const image = context.createImageData(canvas.width, canvas.height);
    const draw = () => {
      for (let index = 0; index < image.data.length; index += 4) {
        const value = 40 + Math.random() * 200;
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
      context.putImageData(image, 0, 0);
    };
    draw();

    // One still frame is enough for anyone who has asked for less motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(draw, 70);
    return () => clearInterval(timer);
  }, []);

  return <canvas ref={canvasRef} width={62} height={74} aria-hidden="true" />;
}

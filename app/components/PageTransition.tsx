'use client';

import { useCallback, useEffect, useRef } from 'react';
import { TransitionRouter } from 'next-transition-router';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { SQUIGGLE_PATH_D, SQUIGGLE_VIEWBOX, SQUIGGLE_COLOR, SQUIGGLE_STROKE_THIN, SQUIGGLE_STROKE_THICK } from './squiggle';

gsap.registerPlugin(DrawSVGPlugin);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      gsap.set(pathRef.current, { drawSVG: '0%', strokeWidth: SQUIGGLE_STROKE_THIN });
    }
  }, []);

  // Leave: the squiggle draws itself in while thickening into a blob that
  // swallows the outgoing page.
  const handleLeave = useCallback((next: () => void) => {
    if (prefersReducedMotion()) {
      next();
      return;
    }

    const tl = gsap.timeline({ onComplete: next });

    tl.to(overlayRef.current, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.inOut',
    }).to(
      pathRef.current,
      {
        drawSVG: '100%',
        strokeWidth: SQUIGGLE_STROKE_THICK,
        duration: 1.5,
        ease: 'power2.inOut',
      },
      0
    );

    return () => tl.kill();
  }, []);

  // Enter: the blob thins back into a line and erases from its start,
  // uncovering the new page as it goes.
  const handleEnter = useCallback((next: () => void) => {
    if (prefersReducedMotion()) {
      if (pathRef.current) gsap.set(pathRef.current, { drawSVG: '0%', strokeWidth: SQUIGGLE_STROKE_THIN });
      if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0 });
      next();
      return;
    }

    const tl = gsap.timeline({ onComplete: next });

    tl.to(pathRef.current, {
      drawSVG: '100% 100%',
      strokeWidth: SQUIGGLE_STROKE_THIN,
      duration: 2.2,
      ease: 'power2.inOut',
    })
      .to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 1.2,
          ease: 'power2.inOut',
        },
        1
      )
      .set(pathRef.current, {
        drawSVG: '0%',
        strokeWidth: SQUIGGLE_STROKE_THIN,
      });

    return () => tl.kill();
  }, []);

  return (
    <TransitionRouter auto leave={handleLeave} enter={handleEnter}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        className="fixed inset-0 z-[9999] flex items-center justify-center opacity-0 pointer-events-none"
      >
        <svg
          width="100%"
          height="100%"
          viewBox={SQUIGGLE_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          style={{ transform: 'scale(1.3)' }}
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            ref={pathRef}
            d={SQUIGGLE_PATH_D}
            stroke={SQUIGGLE_COLOR}
            strokeWidth={SQUIGGLE_STROKE_THIN}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </TransitionRouter>
  );
}

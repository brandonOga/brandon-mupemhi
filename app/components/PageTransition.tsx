'use client';

import { useCallback, useEffect, useRef } from 'react';
import { TransitionRouter } from 'next-transition-router';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      gsap.set(pathRef.current, { drawSVG: '0%', strokeWidth: 2 });
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
        strokeWidth: 300,
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
      if (pathRef.current) gsap.set(pathRef.current, { drawSVG: '0%', strokeWidth: 2 });
      if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0 });
      next();
      return;
    }

    const tl = gsap.timeline({ onComplete: next });

    tl.to(pathRef.current, {
      drawSVG: '100% 100%',
      strokeWidth: 2,
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
        strokeWidth: 2,
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
          viewBox="0 0 1316 664"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          style={{ transform: 'scale(1.3)' }}
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            ref={pathRef}
            d="M13.4746 291.27C13.4746 291.27 100.646 -18.6724 255.617 16.8418C410.588 52.356 61.0296 431.197 233.017 546.326C431.659 679.299 444.494 21.0125 652.73 100.784C860.967 180.556 468.663 430.709 617.216 546.326C765.769 661.944 819.097 48.2722 988.501 120.156C1174.21 198.957 809.424 543.841 988.501 636.726C1189.37 740.915 1301.67 149.213 1301.67 149.213"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </TransitionRouter>
  );
}

'use client';

import { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';

type Direction = 'enter-zoomed' | 'exit-to-home';

type TransitionContextType = {
  navigateTo: (href: string, direction?: Direction) => void;
};

const TransitionContext = createContext<TransitionContextType>({ navigateTo: () => {} });

const FULL_CLIP = 'inset(0% 0% 0% 0% round 0px)';
const OFF_TOP   = 'inset(0% 0% 100% 0%)';

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevPath   = useRef(pathname);
  const pending    = useRef<Direction | null>(null);
  const busy       = useRef(false);

  useEffect(() => {
    if (pathname === prevPath.current || !pending.current) return;
    const dir    = pending.current;
    prevPath.current = pathname;
    pending.current  = null;

    const overlay = overlayRef.current;
    if (!overlay) return;

    if (dir === 'enter-zoomed') {
      // Snap overlay off immediately — project page appears with no animation
      gsap.set(overlay, { autoAlpha: 0 });
      busy.current = false;
    } else {
      // exit-to-home: keep overlay on while the homepage model reloads,
      // then fade out as the camera zooms back out (timed to match)
      setTimeout(() => {
        gsap.to(overlay, {
          autoAlpha: 0,
          duration: 0.65,
          ease: 'power2.inOut',
          onComplete: () => { busy.current = false; },
        });
      }, 300);
    }
  }, [pathname]);

  const navigateTo = useCallback((href: string, direction: Direction = 'exit-to-home') => {
    // enter-zoomed bypasses the busy lock — Three.js zoom is the lock
    if (busy.current && direction !== 'enter-zoomed') return;

    const overlay = overlayRef.current;
    if (!overlay) { router.push(href); return; }

    busy.current    = true;
    pending.current = direction;

    if (direction === 'enter-zoomed') {
      // Snap overlay on for one React render cycle to prevent flash, then navigate
      gsap.set(overlay, { autoAlpha: 1, clipPath: FULL_CLIP });
      requestAnimationFrame(() => router.push(href));
    } else {
      // exit-to-home: black drops from top to cover the screen
      gsap.set(overlay, { autoAlpha: 1, clipPath: OFF_TOP });
      gsap.to(overlay, {
        clipPath: FULL_CLIP,
        duration: 0.45,
        ease: 'power3.in',
        onComplete: () => router.push(href),
      });
    }
  }, [router]);

  return (
    <TransitionContext.Provider value={{ navigateTo }}>
      {children}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#000',
          clipPath: OFF_TOP,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </TransitionContext.Provider>
  );
}

export const usePageTransition = () => useContext(TransitionContext);

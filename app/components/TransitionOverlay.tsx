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

    if (dir === 'enter-zoomed') {
      // Project page — no overlay at all, just unlock
      busy.current = false;
    } else {
      // Returned to homepage — cover briefly while the model reloads,
      // then fade out in sync with the camera zoom-out
      if (overlay) {
        gsap.set(overlay, { autoAlpha: 1, clipPath: FULL_CLIP });
        setTimeout(() => {
          gsap.to(overlay, {
            autoAlpha: 0,
            duration: 0.65,
            ease: 'power2.inOut',
            onComplete: () => { busy.current = false; },
          });
        }, 300);
      }
    }
  }, [pathname]);

  const navigateTo = useCallback((href: string, direction: Direction = 'exit-to-home') => {
    if (busy.current && direction !== 'enter-zoomed') return;

    busy.current    = true;
    pending.current = direction;

    // No overlay on either direction — navigate directly
    requestAnimationFrame(() => router.push(href));
  }, [router]);

  return (
    <TransitionContext.Provider value={{ navigateTo }}>
      {children}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#000',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </TransitionContext.Provider>
  );
}

export const usePageTransition = () => useContext(TransitionContext);

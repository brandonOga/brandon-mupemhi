'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';

function resolveInternalHref(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute('href');
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;
  return url.pathname + url.search;
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // y is a translateY percentage: 100 = parked below the viewport (at rest),
  // 0 = fully covering, -100 = exited above the viewport.
  const stateRef = useRef({
    isAnimating: false,
    pendingReveal: false,
    y: 100,
  });

  const applyTransform = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.style.transform = `translateY(${stateRef.current.y}%)`;
    }
  }, []);

  const navigate = useCallback((href: string) => {
    if (href === pathname) return;

    const state = stateRef.current;
    if (state.isAnimating) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      router.push(href);
      return;
    }

    state.isAnimating = true;
    if (overlayRef.current) overlayRef.current.style.pointerEvents = 'auto';

    // Curtain rises from below to fully cover the screen.
    gsap.to(state, {
      y: 0,
      duration: 0.6,
      ease: 'power3.inOut',
      onUpdate: applyTransform,
      onComplete: () => {
        state.pendingReveal = true;
        router.push(href);
      },
    });
  }, [pathname, router, applyTransform]);

  // Global capture-phase interceptor: catches clicks on any same-origin anchor,
  // regardless of which component rendered it or whether that DOM node was
  // just replaced by a re-render — it always reads the live click target.
  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = resolveInternalHref(anchor);
      if (!href) return;
      if (href === pathname) return; // hash-only / same-page links stay untouched
      if (pathname.startsWith('/admin') || href.startsWith('/admin')) return;

      e.preventDefault();
      navigate(href);
    };

    document.addEventListener('click', onDocumentClick, { capture: true });
    return () => document.removeEventListener('click', onDocumentClick, { capture: true });
  }, [pathname, navigate]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state.pendingReveal) return;

    state.pendingReveal = false;

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Curtain continues rising, exiting off the top to reveal the new page.
        gsap.to(state, {
          y: -100,
          duration: 1.1,
          ease: 'elastic.out(1, 0.5)',
          onUpdate: applyTransform,
          onComplete: () => {
            state.isAnimating = false;
            if (overlayRef.current) overlayRef.current.style.pointerEvents = 'none';
            // Snap back below the viewport (invisible either way) so the next
            // navigation can rise from the bottom again.
            state.y = 100;
            applyTransform();
          },
        });
      });
    });

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, applyTransform]);

  return (
    <>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#000',
          transform: 'translateY(100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { TransitionRouter } from 'next-transition-router';
import gsap from 'gsap';

// Page transition: a wipe of primary-colour columns that line up with the
// site grid (see GridLines). Each column's edge falls midway between a pair
// of grid rules, so the wipe splits the screen exactly where the grid does
// (.page-transition in globals.css sets the column widths).
//
// Leave: every column opens from a hairline at the height of the click out
// to the full screen, starting at the clicked column and rippling outward.
// Enter: on the new page, the columns wipe up and away in the same ripple.
// Navigations without a recent click (back/forward, the keyboard) ripple
// from the middle of the screen.

const RIPPLE_STEP = 0.04; // seconds between neighbouring columns
const COVER = { duration: 0.75, ease: 'expo.inOut' };
const REVEAL = { duration: 0.85, ease: 'expo.inOut' };
// A click this recent (ms) is taken as the one that started the navigation.
const CLICK_WINDOW = 2000;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Plays a paused timeline from the ticker, advancing at most 1/30s per frame.
// The homepage turns GSAP's lag smoothing off, so a long frame (mounting the
// new page blocks the main thread) would otherwise jump the wipe to its end
// and the reveal would never be seen. Returns a stop function.
function playCapped(tl: gsap.core.Timeline) {
  tl.pause();
  const tick = (_time: number, deltaTime: number) => {
    tl.time(Math.min(tl.duration(), tl.time() + Math.min(deltaTime, 1000 / 30) / 1000), false);
    if (tl.time() >= tl.duration()) gsap.ticker.remove(tick);
  };
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    tl.kill();
  };
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  // The column the ripple starts from, kept from leave to enter.
  const originColumn = useRef(0);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      lastPointer.current = { x: event.clientX, y: event.clientY, t: performance.now() };
    };
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, []);

  // Columns shown at this width (the outer ones hide below md).
  const getColumns = () =>
    Array.from(overlayRef.current?.children ?? []).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null
    );

  const handleLeave = useCallback((next: () => void) => {
    const overlay = overlayRef.current;
    if (!overlay || isAdmin || prefersReducedMotion()) {
      next();
      return;
    }
    const columns = getColumns();
    const pointer = lastPointer.current;
    const fromClick = pointer && performance.now() - pointer.t < CLICK_WINDOW;
    const x = fromClick ? pointer.x : window.innerWidth / 2;
    const y = fromClick ? pointer.y : window.innerHeight / 2;
    const h = window.innerHeight;

    const hit = columns.findIndex((col) => {
      const r = col.getBoundingClientRect();
      return x >= r.left && x < r.right;
    });
    const origin = hit < 0 ? Math.floor(columns.length / 2) : hit;
    originColumn.current = origin;

    gsap.killTweensOf(columns);
    gsap.set(overlay, { autoAlpha: 1 });
    gsap.set(columns, { clipPath: `inset(${y}px 0px ${h - y}px 0px)` });
    const tl = gsap.timeline({ onComplete: next });
    columns.forEach((col, i) => {
      tl.to(col, {
        clipPath: 'inset(0px 0px 0px 0px)',
        ...COVER,
        // Fully open, drop the clip: its anti-aliased edges would leave
        // hairlines of the page between columns while the screen is covered.
        onComplete: () => {
          gsap.set(col, { clipPath: 'none' });
        },
      }, Math.abs(i - origin) * RIPPLE_STEP);
    });
    return playCapped(tl);
  }, [isAdmin]);

  const handleEnter = useCallback((next: () => void) => {
    const overlay = overlayRef.current;
    if (!overlay || isAdmin || prefersReducedMotion()) {
      if (overlay) gsap.set(overlay, { autoAlpha: 0 });
      next();
      return;
    }
    const columns = getColumns();
    const origin = Math.min(originColumn.current, Math.max(0, columns.length - 1));
    // Back from 'none' (see leave) to a clip GSAP can tween from.
    gsap.set(columns, { clipPath: 'inset(0% 0% 0% 0%)' });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(overlay, { autoAlpha: 0 });
        gsap.set(columns, { clearProps: 'clipPath' });
        next();
      },
    });
    columns.forEach((col, i) => {
      tl.to(col, { clipPath: 'inset(0% 0% 100% 0%)', ...REVEAL }, Math.abs(i - origin) * RIPPLE_STEP);
    });
    return playCapped(tl);
  }, [isAdmin]);

  return (
    <TransitionRouter auto leave={handleLeave} enter={handleEnter}>
      {children}
      {/* 12 columns from md up, 6 below (the last 6 hide), as in GridLines. */}
      <div ref={overlayRef} aria-hidden className="page-transition">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={i >= 6 ? 'hidden md:block' : undefined} />
        ))}
      </div>
    </TransitionRouter>
  );
}

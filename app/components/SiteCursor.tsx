'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { FaHandPointer } from 'react-icons/fa';

// The site cursor: a primary-colour dot that replaces the system pointer on
// devices with a mouse or trackpad (globals.css hides the native cursor
// there). Over anything clickable it turns into the usual link hand, also in
// the primary colour. It hides over elements that draw their own cursor
// (`data-cursor="custom"`, e.g. CursorLink's round button). Touch screens
// never render it.

const CLICKABLE = 'a, button, [role="button"], label, summary, select, [data-cursor="link"]';

export default function SiteCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const handRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const hand = handRef.current;
    if (!cursor || !dot || !hand) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const follow = reduceMotion ? 0 : 0.12;
    const swap = reduceMotion ? 0 : 0.2;
    gsap.set(cursor, { autoAlpha: 0 });
    gsap.set(hand, { autoAlpha: 0, scale: 0.6 });
    const toX = gsap.quickTo(cursor, 'x', { duration: follow, ease: 'power3.out' });
    const toY = gsap.quickTo(cursor, 'y', { duration: follow, ease: 'power3.out' });

    let shown = false;
    let state: 'hidden' | 'dot' | 'hand' = 'hidden';
    const setState = (next: typeof state) => {
      if (next === state) return;
      state = next;
      gsap.to(cursor, { autoAlpha: next === 'hidden' ? 0 : 1, duration: swap, overwrite: 'auto' });
      if (next === 'hidden') return;
      const isHand = next === 'hand';
      gsap.to(dot, { autoAlpha: isHand ? 0 : 1, scale: isHand ? 0.4 : 1, duration: swap, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(hand, { autoAlpha: isHand ? 1 : 0, scale: isHand ? 1 : 0.6, duration: swap, ease: 'power2.out', overwrite: 'auto' });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (!shown) {
        gsap.set(cursor, { x: event.clientX, y: event.clientY });
        shown = true;
      }
      toX(event.clientX);
      toY(event.clientY);

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-cursor="custom"]')) setState('hidden');
      else if (target?.closest(CLICKABLE)) setState('hand');
      else setState('dot');
    };
    const onLeaveWindow = () => {
      shown = false;
      setState('hidden');
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveWindow);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
      gsap.killTweensOf([cursor, dot, hand]);
    };
  }, []);

  // `cursor` is a zero-size point at the pointer's position; the dot is
  // centred on it and the hand's fingertip sits on it.
  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="site-cursor pointer-events-none fixed left-0 top-0 z-2147483647 will-change-transform"
    >
      <span
        ref={dotRef}
        className="absolute left-0 top-0 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-color"
      />
      <span
        ref={handRef}
        className="site-cursor-hand absolute -left-[8px] -top-[1px] block origin-[8px_1px] text-primary-color"
      >
        <FaHandPointer size={24} />
      </span>
    </div>
  );
}

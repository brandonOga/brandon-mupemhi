'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

// A link that covers its (positioned) parent and swaps the cursor for a round
// orange button that follows the pointer, e.g. the About portrait's "View
// resume". On touch screens, where nothing can hover, the button sits in the
// bottom-left corner instead; keyboard focus centres it.

type Props = {
  href: string;
  label: string;
  children: ReactNode;
};

export default function CursorLink({ href, label, children }: Props) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const link = linkRef.current;
    const dot = dotRef.current;
    if (!link || !dot) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const follow = reduceMotion ? 0 : 0.35;
    gsap.set(dot, { left: 0, top: 0, bottom: 'auto', xPercent: -50, yPercent: -50, scale: 0 });
    const toX = gsap.quickTo(dot, 'x', { duration: follow, ease: 'power3.out' });
    const toY = gsap.quickTo(dot, 'y', { duration: follow, ease: 'power3.out' });

    const place = (event: PointerEvent, instant = false) => {
      const rect = link.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (instant) gsap.set(dot, { x, y });
      toX(x);
      toY(y);
    };
    const onEnter = (event: PointerEvent) => {
      place(event, true);
      gsap.to(dot, { scale: 1, duration: reduceMotion ? 0 : 0.4, ease: 'back.out(1.7)', overwrite: 'auto' });
    };
    const onMove = (event: PointerEvent) => place(event);
    const onLeave = () => {
      gsap.to(dot, { scale: 0, duration: reduceMotion ? 0 : 0.3, ease: 'power2.in', overwrite: 'auto' });
    };
    const onFocus = () => {
      if (!link.matches(':focus-visible')) return;
      const rect = link.getBoundingClientRect();
      gsap.set(dot, { x: rect.width / 2, y: rect.height / 2 });
      gsap.to(dot, { scale: 1, duration: 0.3, overwrite: 'auto' });
    };

    link.addEventListener('pointerenter', onEnter);
    link.addEventListener('pointermove', onMove);
    link.addEventListener('pointerleave', onLeave);
    link.addEventListener('focus', onFocus);
    link.addEventListener('blur', onLeave);
    return () => {
      link.removeEventListener('pointerenter', onEnter);
      link.removeEventListener('pointermove', onMove);
      link.removeEventListener('pointerleave', onLeave);
      link.removeEventListener('focus', onFocus);
      link.removeEventListener('blur', onLeave);
      gsap.killTweensOf(dot);
      gsap.set(dot, { clearProps: 'all' });
    };
  }, []);

  return (
    <a
      ref={linkRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-cursor="custom"
      className="absolute inset-0 z-10 [@media(hover:hover)_and_(pointer:fine)]:cursor-none focus-visible:outline-none"
    >
      <span
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-5 bottom-5 grid size-24 md:size-28 place-items-center rounded-full bg-primary-color text-center text-[11px] md:text-xs font-medium uppercase leading-tight tracking-wider text-site-black will-change-transform"
      >
        {children}
      </span>
    </a>
  );
}

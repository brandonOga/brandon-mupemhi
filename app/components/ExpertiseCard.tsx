'use client';

import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { LiaAsteriskSolid } from 'react-icons/lia';
import { FaArrowRight } from 'react-icons/fa';

// One About › Expertise card: a title and description, and a pile of the
// group's skills as hero-style pills, piled in a loose heap at the bottom
// under matter-js. The pills fall in whenever the card scrolls into view.
// Hovering (or tapping) the card tosses the heap so it tumbles and
// resettles; the loop sleeps once every pill is at rest. With reduced motion the heap is a static, slightly tilted wrap.
// Every pill sits absolutely at the heap's top-left (PILL_BASE), hidden until
// the heap is built, and is placed via transform.

const PILL_BASE = 'expertise-pill absolute top-0 left-0 whitespace-nowrap select-none invisible will-change-transform';

type Props = {
  title: string;
  description: string;
  items: string[];
  index: number;
};

// Pill looks, cycled per skill: a colour and a shape each (shapes in
// globals.css, as on the hero's pills), so no two neighbours match. The
// outlined pills stay plain pills, since a border can't follow a masked
// shape. They all look the same: filled with the card's own colour (so pills
// behind don't show through) with a white outline.
const OUTLINE_PILL = 'bg-[#111111] text-white rounded-full border border-white';
const PILL_STYLES = [
  'bg-primary-color text-site-black rounded-full',
  'bg-secondary-color text-white shape-wavy',
  'bg-off-white text-site-black shape-ribbon',
  OUTLINE_PILL,
  'bg-primary-color text-site-black shape-ticket',
  'bg-secondary-color text-white shape-box',
  'bg-off-white text-site-black shape-bow',
  OUTLINE_PILL,
];

// Icon-only pills sprinkled into the heap, as in the hero: a burst and a
// flower.
const ICON_PILLS = [
  { icon: <LiaAsteriskSolid className="text-lg sm:text-2xl" />, style: 'bg-off-white text-site-black shape-burst' },
  { icon: <FaArrowRight className="text-lg sm:text-2xl" />, style: 'bg-primary-color text-site-black shape-flower' },
];

export default function ExpertiseCard({ title, description, items, index }: Props) {
  const number = String(index + 1).padStart(2, '0');
  const cardRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const pile = pileRef.current;
    if (!card || !pile) return;
    const pills = Array.from(pile.querySelectorAll<HTMLElement>('.expertise-pill'));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion: a static wrap at the bottom of the card, each pill
    // tilted a little. Inline, so it beats the pills' absolute utilities.
    if (reduceMotion) {
      Object.assign(pile.style, {
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-end',
        alignItems: 'flex-end',
        gap: '0.25rem',
        padding: '1.5rem',
      });
      pills.forEach((pill, i) => {
        pill.style.position = 'static';
        pill.style.visibility = 'visible';
        pill.style.transform = `rotate(${[-6, 4, 0][i % 3]}deg)`;
      });
      return;
    }

    let engine: Matter.Engine | null = null;
    let bodies: Matter.Body[] = [];
    let rafId: number | null = null;
    let lastFrame = 0;
    let builtWidth = 0;

    const render = () => {
      bodies.forEach((body, i) => {
        const pill = pills[i];
        const { x, y } = body.position;
        pill.style.transform = `translate(${x - pill.offsetWidth / 2}px, ${y - pill.offsetHeight / 2}px) rotate(${body.angle}rad)`;
      });
    };

    // Pills can lean steeply but never tip past this, so no label ends up
    // upside down.
    const MAX_TILT = 1.45; // rad, about 83°

    const step = (delta: number) => {
      if (!engine) return;
      Matter.Engine.update(engine, delta);
      bodies.forEach((body) => {
        if (Math.abs(body.angle) > MAX_TILT) {
          Matter.Body.setAngle(body, Math.sign(body.angle) * MAX_TILT);
          Matter.Body.setAngularVelocity(body, 0);
        }
      });
    };

    // Runs until every pill has settled (fallen asleep), then idles.
    const tick = (now: number) => {
      if (!engine) return;
      // rAF's timestamp can be a touch earlier than the performance.now()
      // taken when the loop started; a negative step makes matter-js put
      // every pill to sleep mid-air, freezing the drop. Keep it positive.
      step(Math.min(Math.max(now - lastFrame, 1), 1000 / 30));
      lastFrame = now;
      render();
      rafId = bodies.every((body) => body.isSleeping) ? null : requestAnimationFrame(tick);
    };

    const run = () => {
      if (rafId !== null) return;
      lastFrame = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      if (engine) Matter.Engine.clear(engine);
      engine = null;
      bodies = [];
    };

    // Builds a fresh heap: every pill drops in from above the heap's top
    // edge. With `settled`, the drop is simulated straight away, off screen,
    // so the heap is already at rest when it first paints.
    const build = (settled: boolean) => {
      stop();

      const width = pile.clientWidth;
      const height = pile.clientHeight;
      if (!width || !height) return;
      builtWidth = width;
      engine = Matter.Engine.create({ gravity: { x: 0, y: 1.4 }, enableSleeping: true });
      engine.positionIterations = 10;
      engine.velocityIterations = 8;

      // The heap runs flush to the card's bottom and sides, and the card's
      // rounded, overflow-hidden corners would clip pills resting right on
      // those edges. Keep the floor and walls INSET inside them.
      const INSET = 12;
      const wall = { isStatic: true, friction: 0.4 };
      const walls = [
        Matter.Bodies.rectangle(width / 2, height - INSET + 30, width * 2, 60, wall),
        Matter.Bodies.rectangle(INSET - 30, height / 2, 60, height * 4, wall),
        Matter.Bodies.rectangle(width - INSET + 30, height / 2, 60, height * 4, wall),
      ];

      // Shuffle the drop order so the heap differs every time.
      const order = pills.map((_, i) => i).sort(() => Math.random() - 0.5);
      bodies = pills.map((pill, i) => {
        const w = pill.offsetWidth;
        const h = pill.offsetHeight;
        const slot = order.indexOf(i);
        const x = INSET + w / 2 + Math.random() * Math.max(1, width - 2 * INSET - w);
        const y = -h - slot * (h * 1.1);
        return Matter.Bodies.rectangle(x, y, w, h, {
          chamfer: { radius: Math.min(h / 2, w / 2) - 0.5 },
          angle: (Math.random() - 0.5) * 1.2,
          restitution: 0.25,
          friction: 0.5,
          frictionAir: 0.01,
          density: 0.002,
        });
      });

      Matter.Composite.add(engine.world, [...walls, ...bodies]);
      if (settled) {
        for (let i = 0; i < 900 && !bodies.every((body) => body.isSleeping); i++) step(1000 / 60);
      }
      render();
      pills.forEach((pill) => {
        pill.style.visibility = 'visible';
      });
      run();
    };

    // Hover: toss the settled heap up so it tumbles and resettles (or drop it
    // in, if it hasn't been built yet).
    const toss = () => {
      if (!engine) {
        build(false);
        return;
      }
      bodies.forEach((body) => {
        Matter.Sleeping.set(body, false);
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 5,
          y: -4 - Math.random() * 5,
        });
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.12);
      });
      run();
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') toss();
    };
    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('click', toss);

    // The pills fall in each time the heap comes into view, like the hero's.
    // It's the heap area (the bottom of the card) that has to be on screen,
    // not the card: the card's top showing while the heap is still below
    // the fold would let the pills land unseen. Measured from the on-screen
    // rect, so it holds up inside About's horizontal track and scrubbed
    // scrollTop. In view at 80% shown; gone at 0%, so the drop replays only
    // after the heap fully leaves.
    let inView = false;
    const checkView = () => {
      const rect = pile.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const visibleX = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      const visibleY = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      const ratio = visibleX > 0 && visibleY > 0 ? (visibleX * visibleY) / (rect.width * rect.height) : 0;
      if (!inView && ratio >= 0.8) {
        inView = true;
        build(false);
      } else if (inView && ratio === 0) {
        inView = false;
      }
    };
    checkView();
    const viewTimer = setInterval(checkView, 150);

    // The walls are sized to the heap: rebuild it, already at rest, if its
    // width changes.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (!engine || Math.abs(pile.clientWidth - builtWidth) < 2) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => build(true), 200);
    });
    resizeObserver.observe(pile);

    return () => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('click', toss);
      clearInterval(viewTimer);
      resizeObserver.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      stop();
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="expertise-card group relative isolate flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111111] hover:border-white/25 transition-colors duration-300 pt-8 px-6 md:pt-10 md:px-8"
    >
      {/* Oversized ghost number in the corner, behind the copy. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 -top-2 right-5 md:right-7 font-heading font-bold leading-none tracking-tighter text-white/4 text-[clamp(7rem,10vw,10rem)] select-none"
      >
        {number}
      </span>

      <span className="text-[13px] text-white tabular-nums">{number}</span>
      {/* Size, weight and font come from the global h5 style; white because
          that style's colour is for light backgrounds, and uppercase like
          About's other headings (the global style only capitalises h1/h2). */}
      <h5 className="mt-6 md:mt-8 text-white uppercase">
        {title}
      </h5>
      <p className="mt-10 md:mt-14 text-body font-light leading-relaxed text-white max-w-[40ch]">{description}</p>
      <span aria-hidden="true" className="mt-8 mb-6 block h-0.5 w-12 bg-primary-color" />

      {/* The heap: its own area under the description, out to the card's
          edges and clipped at its top, so pills enter from there and never
          cover the copy. mt-auto lines the heaps up across the row.
          Spans, not li/p: About's entrance splits those into lines. */}
      <div ref={pileRef} role="list" aria-label={`${title} skills`} className="expertise-pile relative mt-auto -mx-6 md:-mx-7 h-64 md:h-72 shrink-0 overflow-hidden pointer-events-none">
        {items.map((item, i) => (
          <span
            key={item}
            role="listitem"
            className={`${PILL_BASE} text-sm sm:text-base leading-[1.2] py-2.5 px-4 sm:py-3 sm:px-5 ${PILL_STYLES[(i + index) % PILL_STYLES.length]}`}
          >
            {item}
          </span>
        ))}
        {ICON_PILLS.map((pill, i) => (
          <span
            key={`icon-${i}`}
            aria-hidden="true"
            className={`${PILL_BASE} flex p-3 sm:p-3.5 ${pill.style}`}
          >
            {pill.icon}
          </span>
        ))}
      </div>
    </div>
  );
}

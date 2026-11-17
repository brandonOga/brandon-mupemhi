'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// Column grid that stays still on screen: 12 columns (6 below md) on the
// page's side gutters, with a gap between columns and a faint rule down both
// edges of each column, so the rules sit in close pairs.
//
// Every block with a background of its own (the preloader, the About, Work
// and Say Hello sections, the header, the footer, the case study and its CTA
// band) holds
// its own copy, so the rules sit above that background but behind the
// block's content. The block must be `relative isolate [clip-path:inset(0)]`:
// isolate keeps the -z-10 layer above its background, and the clip-path trims
// the layer to the block (overflow doesn't clip fixed elements). One more
// copy, straight inside <body> in the layout, sits behind everything and
// covers what has no background of its own (the hero, gaps between sections);
// <body> is `isolate` so that copy lands above body's background.
//
// Each copy is viewport-sized and fixed, so they all line up. Where an
// ancestor is transformed (the homepage's sliding track on desktop), fixed is
// relative to that ancestor instead, so a shared ticker measures each layer
// every frame and shifts it back onto the viewport. Elsewhere the layers
// never move and the ticker writes nothing.
//
// The rules are faint white with `mix-blend-mode: difference`: light lines on
// dark backgrounds, dark lines on light ones.

// Flip to false to hide the grid everywhere.
const SHOW_GRID_LINES = true;

type Placement = { x: number; y: number; w: number; h: number };
const layers = new Map<HTMLElement, Placement>();
let tickerTimer: ReturnType<typeof setTimeout> | null = null;
let tickerOn = false;

// Reads every layer first, then writes, so there's one layout per frame.
function alignLayers() {
  const w = document.documentElement.clientWidth;
  const h = window.innerHeight;
  const reads = Array.from(layers, ([el, placed]) => ({ el, placed, rect: el.getBoundingClientRect() }));
  reads.forEach(({ el, placed, rect }) => {
    const x = placed.x - rect.left;
    const y = placed.y - rect.top;
    if (Math.abs(x - placed.x) < 0.5 && Math.abs(y - placed.y) < 0.5 && placed.w === w && placed.h === h) return;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    layers.set(el, { x, y, w, h });
  });
}

function register(el: HTMLElement) {
  layers.set(el, { x: 0, y: 0, w: 0, h: 0 });
  alignLayers();
  if (tickerOn || tickerTimer) return;
  // Added a tick late so it runs after the homepage's own ticker work
  // (Lenis, the scroll timeline), which its effects add after ours.
  tickerTimer = setTimeout(() => {
    tickerTimer = null;
    if (!layers.size) return;
    gsap.ticker.add(alignLayers);
    tickerOn = true;
  }, 0);
}

function unregister(el: HTMLElement) {
  layers.delete(el);
  if (layers.size) return;
  if (tickerTimer) clearTimeout(tickerTimer);
  tickerTimer = null;
  if (tickerOn) gsap.ticker.remove(alignLayers);
  tickerOn = false;
}

export default function GridLines() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    register(el);
    return () => unregister(el);
  }, []);

  if (!SHOW_GRID_LINES) return null;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 -z-10 grid h-screen w-screen grid-cols-6 md:grid-cols-12 gap-4 px-5 md:px-7.5 mix-blend-difference"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={`h-full border-x border-white/10 ${i >= 6 ? 'hidden md:block' : ''}`}
        />
      ))}
    </div>
  );
}

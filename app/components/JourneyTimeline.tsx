'use client';

import { useEffect, useRef } from 'react';

// About › Journey: a vertical timeline, newest first. A thin rail runs
// through each stop's node and fills in orange as the reader scrolls past
// (progress comes from the list's position on screen, so it works whether
// About scrolls itself on desktop or with the page when stacked). Each node
// lights up, and its entry brightens, once the fill reaches it. The current
// role carries a pulsing "Now" marker. With reduced motion everything shows
// filled and lit from the start.

export type JourneyEntry = {
  kind: string;
  dates: string;
  place: string;
  role: string;
  body: string;
  current?: boolean;
};

export default function JourneyTimeline({ entries }: { entries: JourneyEntry[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const rail = railRef.current;
    const fill = fillRef.current;
    if (!list || !rail || !fill) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-entry]'));
    const nodes = items.map((item) => item.querySelector<HTMLElement>('[data-node]')!);

    // The rail runs from the first node's centre to the last one's.
    const centreOf = (node: HTMLElement, listTop: number) => {
      const rect = node.getBoundingClientRect();
      return rect.top + rect.height / 2 - listTop;
    };
    const sizeRail = (listTop: number) => {
      const first = centreOf(nodes[0], listTop);
      const last = centreOf(nodes[nodes.length - 1], listTop);
      rail.style.top = `${first}px`;
      rail.style.height = `${Math.max(0, last - first)}px`;
      return { first, last };
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sizeRail(list.getBoundingClientRect().top);
      fill.style.transform = 'scaleY(1)';
      items.forEach((item) => { item.dataset.active = 'true'; });
      return;
    }

    let rafId: number | null = null;
    const update = () => {
      const listTop = list.getBoundingClientRect().top;
      const { first, last } = sizeRail(listTop);
      // The "reading line": 65% of the way down the viewport.
      const line = window.innerHeight * 0.65 - listTop;
      const span = Math.max(1, last - first);
      fill.style.transform = `scaleY(${Math.min(1, Math.max(0, (line - first) / span))})`;
      nodes.forEach((node, i) => {
        items[i].dataset.active = String(centreOf(node, listTop) <= line + 1);
      });
      rafId = requestAnimationFrame(update);
    };

    // Only track while the timeline is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && rafId === null) rafId = requestAnimationFrame(update);
      if (!entry.isIntersecting && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
    observer.observe(list);

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={listRef} role="list" aria-label="Journey" className="relative">
      {/* Rail and its fill, sized by the effect. */}
      <div ref={railRef} aria-hidden="true" className="absolute left-[11.5px] top-3 h-0 w-px bg-white/20">
        <div ref={fillRef} className="absolute inset-0 origin-top bg-primary-color" style={{ transform: 'scaleY(0)' }} />
      </div>

      {entries.map((entry) => (
        <div
          key={entry.role}
          role="listitem"
          data-entry
          data-active="false"
          className="group relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-6 md:gap-x-10 pb-16 lg:pb-24 last:pb-0"
        >
          {/* Node: a ring with a dot that turns orange when reached. */}
          <span
            data-node
            aria-hidden="true"
            className="relative z-10 mt-0.5 grid size-6 place-items-center rounded-full border border-white/30 bg-site-black transition-colors duration-500 group-data-[active=true]:border-primary-color"
          >
            <span className="size-2 rounded-full bg-white/40 transition-all duration-500 group-data-[active=true]:scale-125 group-data-[active=true]:bg-primary-color" />
            {entry.current && (
              <span className="absolute inset-0 rounded-full border border-primary-color opacity-70 animate-ping motion-reduce:hidden" />
            )}
          </span>

          <div className="min-w-0 opacity-45 transition-opacity duration-700 group-data-[active=true]:opacity-100">
            {/* Tags then dates on one line, level with the node. */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/30 px-3 py-1 text-[12px] uppercase tracking-wider text-white transition-colors duration-500 group-data-[active=true]:border-white/60">
                {entry.kind}
              </span>
              {entry.current && (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-color px-3 py-1 text-[12px] uppercase tracking-wider text-site-black">
                  <span className="size-1.5 rounded-full bg-site-black animate-pulse motion-reduce:animate-none" />
                  Now
                </span>
              )}
              <span className="text-[12px] uppercase tracking-wider text-white tabular-nums whitespace-nowrap">
                {entry.dates}
              </span>
            </div>
            <h5 className="mt-5 text-white uppercase">{entry.place}</h5>
            <p className="mt-1 text-body text-primary-color">{entry.role}</p>
            <p className="mt-4 max-w-[52ch] text-body font-light leading-relaxed text-white">{entry.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

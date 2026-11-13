'use client'

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // The admin dashboard has its own chrome, and project pages end with their
  // own bottom links — don't show the site footer on either.
  if (pathname.startsWith('/admin') || pathname.startsWith('/work/')) return null;

  return (
    <footer
      // Below lg every page scrolls natively, so it's only pinned from lg up.
      className={`relative w-full lg:w-screen lg:fixed lg:bottom-0 lg:left-0 lg:right-0 lg:z-40 flex items-center justify-between gap-4 px-5 md:px-7.5 py-2.5 md:py-3 border-t lg:border-t-0 pointer-events-none`}
      style={{
        color: 'var(--footer-color, #65615d)',
        background: 'var(--footer-bar-background, var(--footer-background, #fefff8))',
        borderColor: 'var(--footer-border-color, #e5e7eb)',
      }}
    >
      <p className="text-[10px] sm:text-xs text-inherit whitespace-nowrap">
        {/* Roboto Mono draws © small and low, so draw it larger than the caps, centred on them
            (cap height is 0.71em, so a 0.9em icon drops 0.1em below the baseline). */}
        <svg
          viewBox="0 0 24 24"
          aria-label="©"
          role="img"
          className="inline-block h-[0.9em] w-[0.9em] align-[-0.1em]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
        >
          <circle cx="12" cy="12" r="10.8" />
          <path d="M15.5 9a4.5 4.5 0 1 0 0 6" strokeLinecap="round" />
        </svg>{' '}
        2026 Portfolio.
      </p>
      <p className="text-[10px] sm:text-xs text-inherit whitespace-nowrap">Design & Code by Brandon</p>
    </footer>
  );
}

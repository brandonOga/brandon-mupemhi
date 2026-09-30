'use client'

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // The admin dashboard has its own chrome — don't show the site footer there.
  if (pathname.startsWith('/admin')) return null;

  // Project pages scroll normally, so the footer sits at the end of the page
  // instead of staying pinned to the bottom of the viewport.
  const position = pathname.startsWith('/projects/')
    ? 'relative w-full'
    : 'w-screen fixed bottom-0 left-0 right-0 z-40';

  return (
    <footer
      className={`${position} flex items-center justify-between gap-4 px-5 md:px-10 lg:px-15 py-2.5 md:py-3 border-t pointer-events-none`}
      style={{
        color: 'var(--footer-color, #65615d)',
        background: 'var(--footer-bar-background, var(--footer-background, #fefff8))',
        borderColor: 'var(--footer-border-color, #e5e7eb)',
      }}
    >
      <p className="text-[10px] sm:text-xs md:text-sm uppercase text-inherit whitespace-nowrap">© 2026 Portfolio.</p>
      <p className="text-[10px] sm:text-xs md:text-sm uppercase text-inherit whitespace-nowrap">Design & Code by Brandon</p>
    </footer>
  );
}

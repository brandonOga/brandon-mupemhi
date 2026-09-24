'use client'

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // The admin dashboard has its own chrome — don't show the site footer there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer
      className="w-screen fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-15 py-3 border-t pointer-events-none"
      style={{
        color: 'var(--footer-color, #65615d)',
        background: 'var(--footer-background, #fefff8)',
        borderColor: 'var(--footer-border-color, #e5e7eb)',
      }}
    >
      <p className="text-sm uppercase text-inherit">© 2026 Portfolio.</p>
      <p className="text-sm uppercase text-inherit">Design & Code by Brandon</p>
    </footer>
  );
}

'use client'

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // The admin dashboard has its own chrome — don't show the site footer there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="w-screen fixed bottom-0 left-0 right-0 z-40  flex items-center justify-between px-8 py-3">
      <p className="text-sm text-gray-500 uppercase">© 2026 Portfolio.</p>
      <p className="text-sm text-gray-500 uppercase">Design & Code by Brandon</p>
    </footer>
  );
}

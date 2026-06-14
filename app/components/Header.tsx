'use client';

import { usePathname } from 'next/navigation';
import { usePageTransition } from './TransitionOverlay';

const menuItems = [
  { label: 'home',      id: 'home' },
  { label: 'about',     id: 'about' },
  { label: 'work',      id: 'work' },
  { label: 'say hello', id: 'say-hello' },
];

export default function Header() {
  const pathname   = usePathname();
  const { navigateTo } = usePageTransition();

  // The admin dashboard has its own chrome — don't show the site nav there.
  if (pathname.startsWith('/admin')) return null;

  const goToSection = (id: string) => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('navigate-section', { detail: id }));
    } else {
      sessionStorage.setItem('scroll-to-section', id);
      navigateTo('/', 'exit-to-home');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-transparent">
      <nav className="w-full h-20 flex items-center justify-between px-8">
        {/* Left Menu */}
        <ul className="flex gap-8">
          {menuItems.slice(0, 2).map(({ label, id }) => (
            <li key={id}>
              <a
                href={`/#${id}`}
                onClick={(e) => { e.preventDefault(); goToSection(id); }}
                className="text-black uppercase text-sm font-medium hover:text-gray-300 transition"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right Menu */}
        <ul className="flex gap-8">
          {menuItems.slice(2).map(({ label, id }) => (
            <li key={id}>
              <a
                href={`/#${id}`}
                onClick={(e) => { e.preventDefault(); goToSection(id); }}
                className="text-black uppercase text-sm font-medium hover:text-gray-300 transition"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

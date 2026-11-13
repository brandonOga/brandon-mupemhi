'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useTransitionRouter } from 'next-transition-router';

const menuItems = [
  { label: 'Home',      id: 'home' },
  { label: 'About',     id: 'about' },
  { label: 'Work',      id: 'work' },
  { label: 'Say hello', id: 'say-hello' },
];

const subscribeToSection = (onChange: () => void) => {
  window.addEventListener('section-change', onChange);
  return () => window.removeEventListener('section-change', onChange);
};

export default function Header() {
  const pathname = usePathname();
  const router = useTransitionRouter();
  // The home page reports the section in view (see setActiveSection there).
  const homeSection = useSyncExternalStore(
    subscribeToSection,
    () => document.documentElement.dataset.activeSection ?? null,
    () => null
  );

  // The admin dashboard has its own chrome, and project pages carry their own
  // back and bottom links — don't show the site nav on either.
  if (pathname.startsWith('/admin') || pathname.startsWith('/work/')) return null;

  const activeId = pathname === '/' ? homeSection : null;

  const goToSection = (id: string) => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('navigate-section', { detail: id }));
    } else {
      // Stash the target section, then drive the cross-page navigation
      // ourselves — these links carry data-transition-ignore so the
      // TransitionRouter's auto-detection doesn't also handle the click.
      sessionStorage.setItem('scroll-to-section', id);
      router.push('/');
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        color: 'var(--header-color, #111111)',
        background: 'var(--header-background, var(--footer-background, #fefff8))',
      }}
    >
      <nav className="w-full h-16 md:h-20 flex items-center justify-between gap-3 px-5 md:px-7.5">
        {/* Left Menu */}
        <ul className="flex gap-4 sm:gap-6 md:gap-8">
          {menuItems.slice(0, 2).map(({ label, id }) => (
            <li key={id}>
              <Link
                href={`/#${id}`}
                data-transition-ignore
                onClick={(e) => { e.preventDefault(); goToSection(id); }}
                aria-current={activeId === id ? 'true' : undefined}
                className="nav-link contact-swap-button text-inherit uppercase text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                <span className="contact-button__label">
                  <span>{label}</span>
                  <span aria-hidden="true">{label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Logo — static rendering of the name the hero heading animates in */}
        <Link
          href="/#home"
          data-transition-ignore
          onClick={(e) => { e.preventDefault(); goToSection('home'); }}
          className="contact-swap-button font-heading font-bold uppercase text-2xl md:text-3xl tracking-wide text-inherit whitespace-nowrap"
        >
          <span className="contact-button__label ">
            <span>BM</span>
            <span aria-hidden="true">BM</span>
          </span>
        </Link>

        {/* Right Menu */}
        <ul className="flex gap-4 sm:gap-6 md:gap-8">
          {menuItems.slice(2).map(({ label, id }) => (
            <li key={id}>
              <Link
                href={`/#${id}`}
                data-transition-ignore
                onClick={(e) => { e.preventDefault(); goToSection(id); }}
                aria-current={activeId === id ? 'true' : undefined}
                className="nav-link contact-swap-button text-inherit uppercase text-xs sm:text-sm font-medium whitespace-nowrap"
              >
                <span className="contact-button__label">
                  <span>{label}</span>
                  <span aria-hidden="true">{label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

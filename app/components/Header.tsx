'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransitionRouter } from 'next-transition-router';

const menuItems = [
  { label: 'home',      id: 'home' },
  { label: 'about',     id: 'about' },
  { label: 'work',      id: 'work' },
  { label: 'say hello', id: 'say-hello' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useTransitionRouter();

  // The admin dashboard has its own chrome — don't show the site nav there.
  if (pathname.startsWith('/admin')) return null;

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
    <header className="fixed top-0 left-0 right-0 z-40 bg-transparent">
      <nav className="w-full h-20 flex items-center justify-between px-8">
        {/* Left Menu */}
        <ul className="flex gap-8">
          {menuItems.slice(0, 2).map(({ label, id }) => (
            <li key={id}>
              <Link
                href={`/#${id}`}
                data-transition-ignore
                onClick={(e) => { e.preventDefault(); goToSection(id); }}
                className="text-black uppercase text-sm font-medium hover:text-gray-300 transition"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Logo — static rendering of the name the hero heading animates in */}
        <Link
          href="/#home"
          data-transition-ignore
          onClick={(e) => { e.preventDefault(); goToSection('home'); }}
          className="font-heading font-bold uppercase text-3xl tracking-wide text-black whitespace-nowrap"
        >
          BM
        </Link>

        {/* Right Menu */}
        <ul className="flex gap-8">
          {menuItems.slice(2).map(({ label, id }) => (
            <li key={id}>
              <Link
                href={`/#${id}`}
                data-transition-ignore
                onClick={(e) => { e.preventDefault(); goToSection(id); }}
                className="text-black uppercase text-sm font-medium hover:text-gray-300 transition"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

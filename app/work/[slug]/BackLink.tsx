'use client';
import Link from "next/link";
import { useTransitionRouter } from "next-transition-router";

// Back to the homepage's Work section. The home page reads this key on mount
// and scrolls there. As in the header nav, the link carries
// data-transition-ignore and drives the navigation itself, so the
// TransitionRouter's auto-detection doesn't swallow the click first.
export default function BackLink() {
  const router = useTransitionRouter();

  return (
    <Link
      href="/"
      className="case-back"
      data-transition-ignore
      onClick={(e) => {
        e.preventDefault();
        sessionStorage.setItem('scroll-to-section', 'work');
        router.push('/');
      }}
    >
      {/* The "Back to top" ↑ turned on its side: the site font has no ← glyph. */}
      <span aria-hidden="true">↑</span> Back to work
    </Link>
  );
}

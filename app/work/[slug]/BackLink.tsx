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
      className="keycap case-back"
      aria-label="Back to work"
      data-transition-ignore
      onClick={(e) => {
        e.preventDefault();
        sessionStorage.setItem('scroll-to-section', 'work');
        router.push('/');
      }}
    >
      <svg aria-hidden="true" width="1.4em" height="1.4em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="m8 5l-5 5l5 5" />
        <path d="M3 10h8c5.523 0 10 4.477 10 10v1" />
      </svg>
      Back<span className="hidden sm:inline">&nbsp;to work</span>
    </Link>
  );
}

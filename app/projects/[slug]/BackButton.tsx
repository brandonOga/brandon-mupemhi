'use client';

import { usePageTransition } from "@/app/components/TransitionOverlay";

export default function BackButton() {
  const { navigateTo } = usePageTransition();
  return (
    <button
      onClick={() => navigateTo('/', 'exit-to-home')}
      className="inline-flex items-center gap-2 uppercase text-sm tracking-widest hover:opacity-60 transition-opacity"
    >
      ← Back
    </button>
  );
}

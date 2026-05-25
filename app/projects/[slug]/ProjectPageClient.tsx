'use client';

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export default function ProjectPageClient({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current,
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.15 }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}

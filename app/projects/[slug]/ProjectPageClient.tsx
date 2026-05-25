'use client';
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export default function ProjectPageClient({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });

      // Expand from a monitor-shaped inset to full screen
      tl.fromTo(
        ".project-reveal",
        { clipPath: "inset(35% 25% 35% 25% round 12px)", scale: 1.15 },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", scale: 1, duration: 1.2 }
      )
      // Fade in the text content slightly after
      .fromTo(
        ".project-content",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.4"
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  return <div ref={wrapperRef}>{children}</div>;
}

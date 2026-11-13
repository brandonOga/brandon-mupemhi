'use client';

// Scrolls the project page back to the top. Like BackLink, it carries
// data-transition-ignore so the TransitionRouter's auto-detection doesn't
// treat the #top click as a page navigation. The scroll is eased by hand
// (rather than scroll-behavior: smooth) so long pages glide up at a steady,
// consistent pace instead of the browser's abrupt default.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export default function BackToTop() {
  const scrollToTop = () => {
    const start = window.scrollY;
    if (start === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, 0);
      return;
    }

    // Longer pages take a little longer, between 0.8s and 1.6s.
    const duration = Math.min(1600, Math.max(800, start * 0.25));
    const startTime = performance.now();

    // Any wheel or touch input hands control straight back to the visitor.
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener('wheel', cancel, { passive: true, once: true });
    window.addEventListener('touchstart', cancel, { passive: true, once: true });

    const step = (now: number) => {
      if (cancelled) return;
      const progress = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, start * (1 - easeInOutCubic(progress)));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        window.removeEventListener('wheel', cancel);
        window.removeEventListener('touchstart', cancel);
      }
    };
    requestAnimationFrame(step);
  };

  return (
    <a
      href="#top"
      data-transition-ignore
      onClick={(e) => {
        e.preventDefault();
        scrollToTop();
      }}
    >
      ↑ Back to top
    </a>
  );
}

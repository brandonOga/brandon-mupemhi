'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';

const selector = 'button, .projects li a, #say-hello a, .case-visit';

function contrastingFill(color: string) {
  const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [255, 255, 255];
  const luminance = values[0] * 0.299 + values[1] * 0.587 + values[2] * 0.114;
  return luminance > 145 ? '#242124' : '#fefff8';
}

export default function ButtonFlair() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/admin') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cleanups = new Map<HTMLElement, () => void>();
    const enhance = (element: HTMLElement) => {
      if (cleanups.has(element) || element.closest('[data-admin]')) return;
      const styles = getComputedStyle(element);
      const baseColor = styles.color;
      const baseBackground = styles.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#fefff8' : styles.backgroundColor;
      const fill = contrastingFill(baseBackground);
      const fillText = contrastingFill(fill);

      element.classList.add('button-flair');
      element.style.setProperty('--button-base-bg', baseBackground);
      element.style.setProperty('--button-base-color', baseColor);
      element.style.setProperty('--button-flair-fill', fill);
      element.style.setProperty('--button-flair-color', fillText);
      element.style.setProperty('--button-flair-x', '50%');
      element.style.setProperty('--button-flair-y', '50%');
      element.style.setProperty('--button-flair-scale', '0');
      let entryPoint = { x: 50, y: 100 };

      const position = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        const x = gsap.utils.clamp(0, 100, ((event.clientX - rect.left) / rect.width) * 100);
        const y = gsap.utils.clamp(0, 100, ((event.clientY - rect.top) / rect.height) * 100);
        return { x, y };
      };
      const onEnter = (event: PointerEvent) => {
        const { x, y } = position(event);
        entryPoint = { x, y };
        element.style.setProperty('--button-flair-x', `${x}%`);
        element.style.setProperty('--button-flair-y', `${y}%`);
        gsap.to(element, { '--button-flair-scale': 1, duration: 0.7, ease: 'power2.out', overwrite: true });
      };
      const onMove = (event: PointerEvent) => {
        const { x, y } = position(event);
        gsap.to(element, { '--button-flair-x': `${x}%`, '--button-flair-y': `${y}%`, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      };
      const onLeave = () => {
        const dx = entryPoint.x - 50;
        const dy = entryPoint.y - 50;
        const furthestAxis = Math.max(Math.abs(dx), Math.abs(dy));
        const distanceToOutside = furthestAxis > 0.01 ? 70 / furthestAxis : 1;
        const exitX = furthestAxis > 0.01 ? 50 - dx * distanceToOutside : 50;
        const exitY = furthestAxis > 0.01 ? 50 - dy * distanceToOutside : -20;
        gsap.to(element, {
          '--button-flair-x': `${exitX}%`,
          '--button-flair-y': `${exitY}%`,
          '--button-flair-scale': 0,
          duration: 0.55,
          ease: 'power2.out',
          overwrite: true,
        });
      };

      element.addEventListener('pointerenter', onEnter);
      element.addEventListener('pointermove', onMove);
      element.addEventListener('pointerleave', onLeave);
      cleanups.set(element, () => {
        gsap.killTweensOf(element);
        element.removeEventListener('pointerenter', onEnter);
        element.removeEventListener('pointermove', onMove);
        element.removeEventListener('pointerleave', onLeave);
        element.classList.remove('button-flair');
        ['--button-base-bg', '--button-base-color', '--button-flair-fill', '--button-flair-color', '--button-flair-x', '--button-flair-y', '--button-flair-scale'].forEach((property) => element.style.removeProperty(property));
      });
    };

    const scan = () => document.querySelectorAll<HTMLElement>(selector).forEach(enhance);
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, [pathname]);

  return null;
}

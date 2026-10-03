'use client';
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import type { ProjectCard } from "@/lib/projects";

const CARD_GAP = 12;
const CARD_MAX_WIDTH = 448;

// Touch-screen stand-in for the Work section's project pills: one card per
// project, swiped (or stepped with the arrows/dots) one at a time. The active
// card plays the role a hovered pill does on desktop — it drives the monitor.
export default function ProjectCarousel({
  projects,
  onSelect,
}: {
  projects: ProjectCard[];
  onSelect?: (project: ProjectCard) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setViewportWidth(viewport.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  if (projects.length === 0) return null;

  const cardWidth = Math.max(0, Math.min(viewportWidth - 48, CARD_MAX_WIDTH));
  // Keep the active card centred; on phones that leaves a 24px gutter each side.
  const trackX = (viewportWidth - cardWidth) / 2 - index * (cardWidth + CARD_GAP);

  const goTo = (next: number) => {
    const wrapped = (next + projects.length) % projects.length;
    setIndex(wrapped);
    onSelect?.(projects[wrapped]);
  };

  return (
    <div className="project-carousel" role="region" aria-label="Projects">
      <div className="pc-viewport" ref={viewportRef}>
        <motion.div
          className="pc-track"
          drag="x"
          dragElastic={0.2}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50 || info.velocity.x < -500) goTo(index + 1);
            else if (info.offset.x > 50 || info.velocity.x > 500) goTo(index - 1);
          }}
          initial={false}
          animate={{ x: trackX }}
          transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.5 }}
        >
          {projects.map((project, i) => (
            <div
              key={project.slug}
              className="pc-card"
              style={{ width: cardWidth }}
              aria-hidden={i !== index}
            >
              <div className="pc-card-copy">
                <p className="pc-position">
                  {String(i + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                  {project.year && <span> · {project.year}</span>}
                </p>
                <h3 className="pc-title">{project.name}</h3>
                {project.description && <p className="pc-desc">{project.description}</p>}
              </div>
              <Link
                href={`/projects/${project.slug}`}
                className="pc-view"
                tabIndex={i === index ? 0 : -1}
                aria-label={`View ${project.name}`}
              >
                View <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="pc-controls">
        <button type="button" className="pc-arrow" aria-label="Previous project" onClick={() => goTo(index - 1)}>
          <FiArrowLeft aria-hidden="true" />
        </button>
        <div className="pc-dots" role="tablist" aria-label="Project pages">
          {projects.map((project, i) => (
            <button
              key={project.slug}
              type="button"
              className="pc-dot"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to ${project.name}`}
              onClick={() => i !== index && goTo(i)}
            >
              <motion.span
                className="pc-dot-pill"
                initial={false}
                animate={{
                  width: i === index ? 16 : 8,
                  backgroundColor: i === index ? "#242124" : "rgba(36, 33, 36, 0.3)",
                }}
                transition={{
                  backgroundColor: { duration: 0.18 },
                  width: { type: "spring", stiffness: 640, damping: 16, mass: 0.38 },
                }}
              />
            </button>
          ))}
        </div>
        <button type="button" className="pc-arrow" aria-label="Next project" onClick={() => goTo(index + 1)}>
          <FiArrowRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import StaticScreen from "./components/StaticScreen";
import { SQUIGGLE_PATH_D, SQUIGGLE_VIEWBOX } from "./components/squiggle";

export const metadata: Metadata = { title: "Page not found" };

// Shown for any URL that matches no route, and when a project slug doesn't
// exist. The "0" of the 404 is a screen with no signal, a nod to the monitor
// in the Work section, and the site's squiggle wanders behind it as the
// wrong turn that led here.
export default function NotFound() {
  return <main className="case-study not-found">
    <section className="case-shell nf">
      <div className="case-hero-meta"><p className="case-eyebrow"><span>404 /</span>Page not found</p><p>No signal</p></div>
      <div className="nf-stage">
        <svg className="nf-path" viewBox={SQUIGGLE_VIEWBOX} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d={SQUIGGLE_PATH_D} pathLength={1} />
        </svg>
        <h1 className="nf-code" aria-label="404">
          <span aria-hidden="true">4</span>
          <span className="nf-screen" aria-hidden="true">
            <StaticScreen />
            <span className="nf-screen-label">No signal</span>
          </span>
          <span aria-hidden="true">4</span>
        </h1>
      </div>
      <div className="nf-foot">
        <p>You took a wrong turn. This page doesn&apos;t exist, or it has moved.</p>
        <Link className="btn-outline" href="/">Back to home</Link>
      </div>
    </section>
  </main>;
}

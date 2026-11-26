import Image from "next/image";
import Link from "next/link";
import ArrowUpRight from "@/app/components/ArrowUpRight";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import { getProjectBySlug, getPublishedProjects, getPublishedSlugs } from "@/lib/projects";
import { problemProcessHtml, solutionHtml } from "@/lib/caseStudyHtml";
import { deviceFrameKey, devicePreset, deviceSlots } from "@/lib/devices";
import Noise from "@/app/components/Noise";
import GridLines from "@/app/components/GridLines";
import SocialLinks from "@/app/components/SocialLinks";
import BackLink from "./BackLink";
import BackToTop from "./BackToTop";
import DeviceShowcase from "./DeviceShowcase";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPublishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = await getProjectBySlug((await params).slug);
  return { title: project ? `${project.name} — Design By Brandon` : "Project", description: project?.description || undefined };
}

// Handwriting for the sticky notes in the overview, loaded on this page only.
const handwriting = Kalam({ variable: "--font-hand", subsets: ["latin"], weight: ["400", "700"] });

const pad = (value: number) => String(value).padStart(2, "0");

function Media({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  return <div className={`case-media ${className}`}>{src ? <Image src={src} alt={alt} fill className="object-cover" sizes="100vw" /> : <span className="case-media-placeholder">Image coming soon</span>}</div>;
}

// The header menu's hover: the label rolls up and a copy rolls in from below.
function SwapLabel({ children }: { children: React.ReactNode }) {
  return <span className="contact-button__label"><span>{children}</span><span aria-hidden="true">{children}</span></span>;
}

function Eyebrow({ number, children }: { number: string; children: React.ReactNode }) {
  return <p className="case-eyebrow"><span>{number}</span>{children}</p>;
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, projects] = await Promise.all([getProjectBySlug(slug), getPublishedProjects()]);
  if (!project) notFound();

  const currentIndex = Math.max(0, projects.findIndex((item) => item.slug === slug));
  const nextProject = projects[(currentIndex + 1) % projects.length];
  const gallery = project.gallery ?? [];
  const imageAt = (index: number) => gallery[index % Math.max(gallery.length, 1)] || project.cover_image;
  // Roles are entered one per row in the editor and stored comma-joined.
  const roles = project.role.split(',').map((item) => item.trim()).filter(Boolean);
  const roleLines = roles.length ? roles : ["Designer"];
  const disciplines = project.tags.length ? project.tags : roles.length ? roles : ["Design"];
  const cs = project.case_study;
  const responsibilities = cs.responsibilities.length ? cs.responsibilities : roleLines;
  // Each is one rich-text field; projects saved before that are converted
  // from their old separate fields, so every project gets the same layout.
  const problemHtml = problemProcessHtml(cs);
  const solutionCopyHtml = solutionHtml(cs);
  // The solution's device mockups. A device with no screenshot of its own
  // borrows an image so the row is never empty: the desktop takes the old
  // main solution image, the others the gallery in order, then the cover.
  const devices = deviceSlots.map((slot, index) => ({
    ...slot,
    src: cs.media[slot.key] || (slot.kind === 'desktop' && cs.media.solution) || imageAt(index),
    preset: devicePreset(slot.kind, cs.media[deviceFrameKey(slot.key)]),
  }));

  return <main className="case-study relative isolate [clip-path:inset(0)]" id="top">
    <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternRefreshInterval={2} patternAlpha={15} />
    <GridLines />
    <section className="case-hero case-shell">
      <BackLink />
      <div className="case-hero-meta"><Eyebrow number={`Project ${pad(currentIndex + 1)} of ${pad(projects.length)} /`}>{cs.industry || "Selected work"}</Eyebrow><p>{project.year || "—"}</p></div>
      <h1 className="case-title">{project.name}</h1>
      <div className="case-hero-copy"><p>{project.description}</p><div className="case-tags">{disciplines.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      <Media src={project.cover_image} alt={`${project.name} project cover`} className="case-hero-image" />
    </section>

    <section className="case-section case-shell case-overview">
      <Eyebrow number="01 /">Project overview</Eyebrow><h2>At a glance.</h2>
      {/* Overview copy on the left, the facts in two columns on the right. */}
      <div className="case-glance">
        <div className="case-narrative">
          <span>The project</span><p>{cs.overview || project.description}</p>
          {project.url && <a className="keycap btn-outline" href={project.url} target="_blank" rel="noreferrer">View live site <ArrowUpRight /></a>}
        </div>
        <div className={`case-facts ${handwriting.variable}`}>
          <div><span>Role</span>{roleLines.map((line) => <p key={line}>{line}</p>)}</div>
          <div><span>Timeline</span><p>{cs.timeline || project.year || "Not specified"}</p></div>
          <div><span>Industry</span><p>{cs.industry || "Not specified"}</p></div>
          {cs.tools.length > 0 && <div><span>Tools</span><p>{cs.tools.join(", ")}</p></div>}
          <div><span>Responsibilities</span><p>{responsibilities.join(", ")}</p></div>
        </div>
      </div>
    </section>

    <section className="case-section case-shell case-challenge">
      <Eyebrow number="02 /">Problem and process</Eyebrow><h2>What needed to be solved?</h2>
      {problemHtml
        ? <div className="case-side-copy rich-text" dangerouslySetInnerHTML={{ __html: problemHtml }} />
        : <p className="case-side-copy">{project.description}</p>}
    </section>

    <section className="case-section case-solution"><div className="case-shell">
      <Eyebrow number="03 /">The solution</Eyebrow><h2>The finished experience.</h2>
      {/* Solution copy on the left, the device mockups on the right. */}
      <div className="case-solution-split">
        {solutionCopyHtml && <div className="case-side-copy rich-text" dangerouslySetInnerHTML={{ __html: solutionCopyHtml }} />}
        <div className="case-solution-media">
          <DeviceShowcase devices={devices} name={project.name} />
        </div>
      </div>
    </div></section>

    {nextProject && <section className="case-next"><div className="case-shell"><div className="case-next-row"><Eyebrow number="Next">Project</Eyebrow><div className="case-next-heading"><h2><Link href={`/work/${nextProject.slug}`} className="case-next-link">{nextProject.title}</Link></h2><span><ArrowUpRight /></span></div></div></div></section>}

    {/* Let's talk closes the page, like the homepage's "Say Hello" band. */}
    <section className="case-section case-cta relative isolate [clip-path:inset(0)]" aria-labelledby="case-cta-heading"><GridLines /><div className="case-shell">
      {/* The heading in the left half, the copy in the right half, centred
          against each other. */}
      <div className="case-cta-split">
        <h2 id="case-cta-heading">Let&rsquo;s<br />talk.</h2>
        <div className="case-cta-body">
          <p>Have a project in mind, or want to hear more about how this one came together? I&rsquo;d love to hear from you.</p>
          <div className="case-cta-email">
            <span>Email me</span>
            <a href="mailto:brandoneemupemhi@gmail.com">
              <span className="case-cta-email-text email-underline">brandoneemupemhi@gmail.com</span>
            </a>
          </div>
          <SocialLinks />
        </div>
      </div>
    </div></section>
    <div className="case-bottom case-shell"><Link href="/" className="contact-swap-button"><SwapLabel>Home</SwapLabel></Link><Link href="/#about" className="contact-swap-button"><SwapLabel>About</SwapLabel></Link><BackToTop /></div>
  </main>;
}

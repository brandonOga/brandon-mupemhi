import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectBySlug, getPublishedProjects, getPublishedSlugs } from "@/lib/projects";
import { problemProcessHtml, solutionHtml } from "@/lib/caseStudyHtml";
import { deviceFrameKey, devicePreset, deviceSlots } from "@/lib/devices";
import BackLink from "./BackLink";
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

const pad = (value: number) => String(value).padStart(2, "0");

function Media({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  return <div className={`case-media ${className}`}>{src ? <Image src={src} alt={alt} fill className="object-cover" sizes="100vw" /> : <span className="case-media-placeholder">Image coming soon</span>}</div>;
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

  return <main className="case-study" id="top">
    <section className="case-hero case-shell">
      <BackLink />
      <div className="case-hero-meta"><Eyebrow number={`${pad(currentIndex + 1)} /`}>Selected work</Eyebrow><p>{project.year || "—"}</p></div>
      <h1 className="case-title">{project.name}</h1>
      <div className="case-hero-copy"><p>{project.description}</p><div className="case-tags">{disciplines.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      <Media src={project.cover_image} alt={`${project.name} project cover`} className="case-hero-image" />
    </section>

    <section className="case-section case-shell case-overview">
      <Eyebrow number="01">Project overview</Eyebrow><h2>At a glance.</h2>
      {/* Overview copy on the left, the facts in two columns on the right. */}
      <div className="case-glance">
        <div className="case-narrative">
          <span>01 / The project</span><p>{cs.overview || project.description}</p>
          {project.url && <a className="case-visit" href={project.url} target="_blank" rel="noreferrer">View live site ↗</a>}
        </div>
        <div className="case-facts">
          <div><span>Role</span>{roleLines.map((line) => <p key={line}>{line}</p>)}</div>
          <div><span>Timeline</span><p>{cs.timeline || project.year || "Not specified"}</p></div>
          <div><span>Industry</span><p>{cs.industry || "Not specified"}</p></div>
          {cs.tools.length > 0 && <div><span>Tools</span>{cs.tools.map((tool) => <p key={tool}>{tool}</p>)}</div>}
          <div><span>Responsibilities</span>{responsibilities.map((item) => <p key={item}>{item}</p>)}</div>
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

    <section className="case-section case-shell case-outcome">
      <Eyebrow number="04 /">Outcome</Eyebrow><h2>What the work delivered.</h2><p className="case-outcome-lead">{cs.outcome || project.description}</p>
      {(cs.what_worked.length > 0 || cs.improvements.length > 0) && <div className="case-outcome-grid"><div><span>What worked</span>{cs.what_worked.map((item) => <p key={item}>{item}</p>)}</div><div><span>Next iteration</span>{cs.improvements.map((item) => <p key={item}>{item}</p>)}</div></div>}
      {project.url && <a className="case-visit" href={project.url} target="_blank" rel="noreferrer">Visit live project ↗</a>}
    </section>

    {nextProject && <section className="case-next"><Link href={`/projects/${nextProject.slug}`} className="case-next-link"><div className="case-shell"><Eyebrow number="Next">Project</Eyebrow><div className="case-next-heading"><h2>{nextProject.name}</h2><span>↗</span></div><p>{nextProject.description}</p></div><Media src={nextProject.cover_image} alt={`${nextProject.name} project`} /></Link></section>}
    <div className="case-bottom case-shell"><Link href="/">Home</Link><Link href="/#about">About</Link><a href="#top">↑ Back to top</a></div>
  </main>;
}

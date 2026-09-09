import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectBySlug, getPublishedProjects, getPublishedSlugs } from "@/lib/projects";

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
  const disciplines = project.tags.length ? project.tags : project.role ? [project.role] : ["Design"];
  const roleLines = project.role ? project.role.split(/[,/&]+/).map((item) => item.trim()).filter(Boolean) : ["Designer"];
  const cs = project.case_study;
  const responsibilities = cs.responsibilities.length ? cs.responsibilities : roleLines;
  const insights = cs.insights.length ? cs.insights : [];
  const processSteps = cs.process_steps.length ? cs.process_steps : [];
  const features = cs.features.length ? cs.features : [];

  return <main className="case-study" id="top">
    <section className="case-hero case-shell">
      <div className="case-hero-meta"><Eyebrow number={`${pad(currentIndex + 1)} /`}>Selected work</Eyebrow><p>{project.year || "—"}</p></div>
      <h1 className="case-title">{project.name}</h1>
      <div className="case-hero-copy"><p>{project.description}</p><div className="case-tags">{disciplines.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
      <Media src={project.cover_image} alt={`${project.name} project cover`} className="case-hero-image" />
    </section>

    <section className="case-section case-shell case-overview">
      <Eyebrow number="01">Project overview</Eyebrow><h2>At a glance.</h2>
      <div className="case-facts">
        <div><span>Role</span>{roleLines.map((line) => <p key={line}>{line}</p>)}</div>
        <div><span>Timeline</span><p>{cs.timeline || project.year || "Not specified"}</p></div>
        <div><span>Industry</span><p>{cs.industry || "Not specified"}</p></div>
        <div><span>Responsibilities</span>{responsibilities.map((item) => <p key={item}>{item}</p>)}</div>
      </div>
      <div className="case-narrative"><span>01 / The project</span>{project.body ? <div className="rich-text" dangerouslySetInnerHTML={{ __html: project.body }} /> : <p>{cs.overview || project.description}</p>}</div>
    </section>

    <section className="case-section case-shell case-challenge">
      <Eyebrow number="02">The challenge</Eyebrow><h2>{cs.challenge_question || "What needed to be solved?"}</h2>
      <p className="case-side-copy">{cs.challenge || project.description}</p>
      <div className="case-media-pair"><Media src={imageAt(0)} alt={`${project.name} challenge view one`} /><Media src={imageAt(1)} alt={`${project.name} challenge view two`} /></div>
    </section>

    {(cs.understanding || insights.length > 0) && <section className="case-section case-shell">
      <Eyebrow number="03 /">Understanding the problem</Eyebrow><h2>Start with what matters.</h2>
      {cs.understanding && <p className="case-side-copy">{cs.understanding}</p>}
      {insights.length > 0 && <div className="case-insights">{insights.map((insight, index) => <article key={insight}><span>{pad(index + 1)}</span><p>{insight}</p></article>)}</div>}
    </section>}

    {processSteps.length > 0 && <section className="case-section case-shell case-flow">
      <Eyebrow number="04">Information architecture</Eyebrow><h2>Making the complex simple.</h2>
      <div className="case-flow-track">{processSteps.map((step, index) => <div key={step}><span>{pad(index + 1)}</span><p>{step}</p></div>)}</div>
    </section>}

    <section className="case-section case-shell case-exploration">
      <Eyebrow number="05 /">Exploration</Eyebrow><h2>From structure to interface.</h2>
      <div className="case-explore-grid">{[0, 1, 2].map((index) => <Media key={index} src={imageAt(index)} alt={`${project.name} exploration ${index + 1}`} />)}</div>
      <p className="case-side-copy">{cs.exploration || project.description}</p>
    </section>

    <section className="case-section case-solution"><div className="case-shell"><Eyebrow number="06 /">The solution</Eyebrow><h2>{cs.solution || "The finished experience."}</h2><Media src={imageAt(3)} alt={`${project.name} finished solution`} className="case-solution-image" /></div></section>

    {features.length > 0 && <section className="case-section case-shell case-features">
      <Eyebrow number="07 /">Key experiences</Eyebrow>
      {features.map((feature, index) => <article className="case-feature" key={`${feature.title}-${index}`}><Media src={imageAt(index + 4)} alt={`${project.name} ${feature.title}`} /><div><span>{pad(index + 1)}</span><h3>{feature.title}</h3><p>{feature.description}</p></div></article>)}
    </section>}

    {cs.design_system && <section className="case-section case-shell case-system">
      <Eyebrow number="08">Design system</Eyebrow><h2>Built for consistency.</h2>
      <div className="case-system-grid"><div><span>System</span><strong>Aa</strong></div><div><span>Approach</span><p>{cs.design_system}</p></div><div><span>Project disciplines</span><div className="case-tags">{disciplines.map((tag) => <span key={tag}>{tag}</span>)}</div></div></div>
    </section>}

    {cs.development && <section className="case-section case-shell case-build">
      <Eyebrow number="09 /">Development</Eyebrow><h2>Designed. Then built.</h2>
      <div className="case-build-grid"><div><span>Responsibilities</span>{responsibilities.map((item) => <p key={item}>{item}</p>)}</div><div><span>Tools</span>{cs.tools.map((tool) => <p key={tool}>{tool}</p>)}</div><p>{cs.development}</p></div>
    </section>}

    {cs.responsive && <section className="case-section case-shell case-responsive">
      <Eyebrow number="10 /">Responsive</Eyebrow><h2>Built for every screen.</h2>
      <p className="case-side-copy">{cs.responsive}</p>
      <div className="case-devices"><Media src={imageAt(0)} alt={`${project.name} mobile view`} className="case-device-mobile" /><Media src={imageAt(1)} alt={`${project.name} tablet view`} className="case-device-tablet" /><Media src={imageAt(2)} alt={`${project.name} desktop view`} className="case-device-desktop" /></div>
    </section>}

    <section className="case-section case-shell case-outcome">
      <Eyebrow number="11 /">Outcome</Eyebrow><h2>What the work delivered.</h2><p className="case-outcome-lead">{cs.outcome || project.description}</p>
      {(cs.what_worked.length > 0 || cs.improvements.length > 0) && <div className="case-outcome-grid"><div><span>What worked</span>{cs.what_worked.map((item) => <p key={item}>{item}</p>)}</div><div><span>Next iteration</span>{cs.improvements.map((item) => <p key={item}>{item}</p>)}</div></div>}
      {project.url && <a className="case-visit" href={project.url} target="_blank" rel="noreferrer">Visit live project ↗</a>}
    </section>

    {nextProject && <section className="case-next"><Link href={`/projects/${nextProject.slug}`} className="case-next-link"><div className="case-shell"><Eyebrow number="Next">Project</Eyebrow><div className="case-next-heading"><h2>{nextProject.name}</h2><span>↗</span></div><p>{nextProject.description}</p></div><Media src={nextProject.cover_image} alt={`${nextProject.name} project`} /></Link></section>}
    <div className="case-bottom case-shell"><Link href="/">Home</Link><Link href="/#about">About</Link><a href="#top">↑ Back to top</a></div>
  </main>;
}

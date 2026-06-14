import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BackButton from "./BackButton";
import ProjectPageClient from "./ProjectPageClient";
import { getProjectBySlug, getPublishedSlugs } from "@/lib/projects";

// New projects render on demand and are cached/revalidated every minute.
export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  return {
    title: project ? `${project.name} — Design By Brandon` : "Project",
    description: project?.description || undefined,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const meta = [
    project.year && { label: "Year", value: project.year },
    project.role && { label: "Role", value: project.role },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <ProjectPageClient>
      <main className="min-h-screen bg-background pt-20">
        <div className="px-7 mb-10">
          <BackButton />
        </div>

        <div className="relative w-full h-[70vh] bg-neutral-900">
          {project.cover_image && (
            <Image
              src={project.cover_image}
              alt={project.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          )}
        </div>

        <div className="px-7 pt-12 pb-24 flex flex-col gap-8 max-w-4xl">
          <h1 className="font-bold uppercase">{project.name}</h1>
          <p className="text-xl uppercase">{project.description}</p>

          {(meta.length > 0 || project.tags.length > 0 || project.url) && (
            <div className="flex flex-wrap gap-x-12 gap-y-4 border-y border-foreground/15 py-6">
              {meta.map((m) => (
                <div key={m.label} className="flex flex-col">
                  <span className="text-xs uppercase opacity-50">{m.label}</span>
                  <span className="text-base uppercase">{m.value}</span>
                </div>
              ))}
              {project.tags.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs uppercase opacity-50">Tags</span>
                  <span className="text-base uppercase">
                    {project.tags.join(", ")}
                  </span>
                </div>
              )}
              {project.url && (
                <div className="flex flex-col">
                  <span className="text-xs uppercase opacity-50">Link</span>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base uppercase underline"
                  >
                    Visit ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {project.body && (
            <div
              className="rich-text"
              dangerouslySetInnerHTML={{ __html: project.body }}
            />
          )}
        </div>

        {project.gallery.length > 0 && (
          <div className="px-7 pb-24 flex flex-col gap-6">
            {project.gallery.map((src, i) => (
              <div
                key={src + i}
                className="relative w-full h-[80vh] bg-neutral-900"
              >
                <Image
                  src={src}
                  alt={`${project.name} — image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </ProjectPageClient>
  );
}

import Image from "next/image";
import { notFound } from "next/navigation";
import { projects } from "@/app/data/projects";
import type { Metadata } from "next";
import BackButton from "./BackButton";
import ProjectPageClient from "./ProjectPageClient";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return { title: project ? `${project.name} — Design By Brandon` : "Project" };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <ProjectPageClient>
      <main className="min-h-screen bg-background pt-20">
        <div className="px-7 mb-10">
          <BackButton />
        </div>

        <div className="relative w-full h-[70vh] bg-neutral-900">
          <Image
            src={project.image}
            alt={project.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>

        <div className="px-7 pt-12 pb-24 flex flex-col gap-6 max-w-4xl">
          <h1 className="font-bold uppercase">{project.name}</h1>
          <p className="text-xl uppercase">{project.description}</p>
        </div>
      </main>
    </ProjectPageClient>
  );
}

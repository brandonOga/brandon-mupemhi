import 'server-only';
import { createClient } from './supabase/server';
import { createPublicClient } from './supabase/public';
import { isSupabaseConfigured } from './supabase/env';
import { fallbackProjects } from '@/app/data/projects';

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  body: string;
  case_study: CaseStudy;
  cover_image: string;
  gallery: string[];
  year: string;
  role: string;
  tags: string[];
  url: string | null;
  display_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseStudyFeature = { title: string; description: string };

export type CaseStudy = {
  industry: string;
  timeline: string;
  responsibilities: string[];
  tools: string[];
  overview: string;
  challenge_question: string;
  challenge: string;
  understanding: string;
  insights: string[];
  process_steps: string[];
  exploration: string;
  solution: string;
  features: CaseStudyFeature[];
  design_system: string;
  development: string;
  responsive: string;
  outcome: string;
  what_worked: string[];
  improvements: string[];
};

const emptyCaseStudy: CaseStudy = {
  industry: '', timeline: '', responsibilities: [], tools: [], overview: '',
  challenge_question: '', challenge: '', understanding: '', insights: [],
  process_steps: [], exploration: '', solution: '', features: [],
  design_system: '', development: '', responsive: '', outcome: '',
  what_worked: [], improvements: [],
};

function normalizeCaseStudy(value: unknown): CaseStudy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyCaseStudy };
  const source = value as Record<string, unknown>;
  const text = (key: keyof CaseStudy) => String(source[key] ?? '');
  const list = (key: keyof CaseStudy) => Array.isArray(source[key]) ? (source[key] as unknown[]).map(String).filter(Boolean) : [];
  const features = Array.isArray(source.features) ? source.features.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const feature = item as Record<string, unknown>;
    return [{ title: String(feature.title ?? ''), description: String(feature.description ?? '') }];
  }).filter((item) => item.title || item.description) : [];
  return {
    industry: text('industry'), timeline: text('timeline'),
    responsibilities: list('responsibilities'), tools: list('tools'),
    overview: text('overview'), challenge_question: text('challenge_question'),
    challenge: text('challenge'), understanding: text('understanding'),
    insights: list('insights'), process_steps: list('process_steps'),
    exploration: text('exploration'), solution: text('solution'), features,
    design_system: text('design_system'), development: text('development'),
    responsive: text('responsive'), outcome: text('outcome'),
    what_worked: list('what_worked'), improvements: list('improvements'),
  };
}

// Shape used by the homepage's 3D monitor list — kept minimal on purpose.
export type ProjectCard = Pick<
  Project,
  'slug' | 'name' | 'description' | 'cover_image' | 'role' | 'tags' | 'year'
>;

function normalize(row: Record<string, unknown>): Project {
  return {
    id: String(row.id ?? ''),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    body: String(row.body ?? ''),
    case_study: normalizeCaseStudy(row.case_study),
    cover_image: String(row.cover_image ?? ''),
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
    year: String(row.year ?? ''),
    role: String(row.role ?? ''),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    url: (row.url as string) || null,
    display_order: Number(row.display_order ?? 0),
    published: Boolean(row.published ?? true),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

/** Published projects for the public site. Falls back to the bundled list
 *  when Supabase isn't configured yet, so the site never renders empty. */
export async function getPublishedProjects(): Promise<ProjectCard[]> {
  if (!isSupabaseConfigured) return fallbackProjects;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('projects')
    .select('slug, name, description, cover_image, role, tags, year')
    .eq('published', true)
    .order('display_order', { ascending: true });

  if (error || !data || data.length === 0) return fallbackProjects;
  return data.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    cover_image: row.cover_image,
    role: row.role,
    tags: row.tags ?? [],
    year: row.year,
  }));
}

/** A single published project by slug, or null. */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!isSupabaseConfigured) {
    const fb = fallbackProjects.find((p) => p.slug === slug);
    return fb ? normalize(fb) : null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;
  return normalize(data);
}

/** Slugs for static generation. Empty when unconfigured — pages render
 *  on demand via dynamicParams. */
export async function getPublishedSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured) return fallbackProjects.map((p) => p.slug);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('projects')
    .select('slug')
    .eq('published', true);

  if (error || !data) return [];
  return data.map((row) => row.slug);
}

/** All projects (incl. drafts) for the admin dashboard. */
export async function getAllProjectsForAdmin(): Promise<Project[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return data.map(normalize);
}

/** A single project by id for the admin edit form. */
export async function getProjectById(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return normalize(data);
}

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

// Shape used by the homepage's 3D monitor list — kept minimal on purpose.
export type ProjectCard = Pick<
  Project,
  'slug' | 'name' | 'description' | 'cover_image'
>;

function normalize(row: Record<string, unknown>): Project {
  return {
    id: String(row.id ?? ''),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    body: String(row.body ?? ''),
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
    .select('slug, name, description, cover_image')
    .eq('published', true)
    .order('display_order', { ascending: true });

  if (error || !data || data.length === 0) return fallbackProjects;
  return data.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    cover_image: row.cover_image,
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

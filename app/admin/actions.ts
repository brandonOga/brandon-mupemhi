'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type SaveState = { error?: string };

type ImportProject = Record<string, unknown>;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function parseJsonCell(value: string, fallback: unknown) {
  if (!value.trim()) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function csvList(value: unknown, separator: RegExp = /\r?\n/) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  const decoded = parseJsonCell(text, null);
  if (Array.isArray(decoded)) return stringList(decoded);
  return text.split(separator).map((item) => item.trim()).filter(Boolean);
}

function parseCsv(source: string): ImportProject[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = source.replace(/^\uFEFF/, '');

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  row.push(field.replace(/\r$/, ''));
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  if (!headers.includes('name') || !headers.includes('slug')) throw new Error('The CSV must include name and slug columns.');
  return rows.filter((cells) => cells.some((cell) => cell.trim())).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  );
}

// Create (no id) or update (with id) a project. Returns an error string for
// inline display; redirects to the dashboard on success.
export async function saveProject(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const id = (formData.get('id') as string)?.trim();
  const name = (formData.get('name') as string)?.trim() ?? '';
  let slug = (formData.get('slug') as string)?.trim() ?? '';
  if (!name) return { error: 'Name is required.' };
  slug = slug ? slugify(slug) : slugify(name);
  if (!slug) return { error: 'Could not derive a slug — add one manually.' };

  try {
    // Images are uploaded client-side directly to Supabase Storage (so large
    // files never pass through the server action / Vercel's 4.5MB function
    // body limit); the form only sends the resulting public URLs here.
    const cover_image = (formData.get('cover_image_current') as string) || '';
    const gallery = (formData.getAll('gallery_keep') as string[]).filter(Boolean);

    const tags = ((formData.get('tags') as string) || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const text = (name: string) => (formData.get(name) as string)?.trim() ?? '';
    const lines = (name: string) => text(name).split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const case_study = {
      industry: text('case_industry'), timeline: text('case_timeline'),
      responsibilities: lines('case_responsibilities'), tools: lines('case_tools'),
      overview: text('case_overview'), challenge_question: text('case_challenge_question'),
      challenge: text('case_challenge'), understanding: text('case_understanding'),
      insights: lines('case_insights'), process_steps: lines('case_process_steps'),
      exploration: text('case_exploration'), solution: text('case_solution'),
      features: Array.from({ length: Math.min(5, Math.max(1, Number(formData.get('case_feature_count')) || 3)) }, (_, offset) => offset + 1).map((index) => ({
        title: text(`case_feature_${index}_title`),
        description: text(`case_feature_${index}_description`),
      })).filter((feature) => feature.title || feature.description),
      design_system: text('case_design_system'), development: text('case_development'),
      responsive: text('case_responsive'), outcome: text('case_outcome'),
      what_worked: lines('case_what_worked'), improvements: lines('case_improvements'),
      media: Object.fromEntries([
        'challenge_1', 'challenge_2', 'exploration_1', 'exploration_2', 'exploration_3',
        'solution', 'feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5',
        'responsive_mobile', 'responsive_tablet', 'responsive_desktop',
      ].map((key) => [key, text(`case_media_${key}`)]).filter(([, value]) => value)),
    };

    const row = {
      slug,
      name,
      description: (formData.get('description') as string)?.trim() ?? '',
      body: (formData.get('body') as string) ?? '',
      case_study,
      year: (formData.get('year') as string)?.trim() ?? '',
      role: (formData.get('role') as string)?.trim() ?? '',
      url: ((formData.get('url') as string)?.trim() || null) as string | null,
      display_order: Number(formData.get('display_order')) || 0,
      published: formData.get('published') === 'on',
      cover_image,
      gallery,
      tags,
    };

    const result = id
      ? await supabase.from('projects').update(row).eq('id', id)
      : await supabase.from('projects').insert(row);

    if (result.error) {
      if (result.error.code === '23505') {
        return { error: `A project with slug "${slug}" already exists.` };
      }
      return { error: result.error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Something went wrong.' };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath(`/projects/${slug}`);
  redirect('/admin');
}

export async function deleteProject(formData: FormData) {
  const id = (formData.get('id') as string)?.trim();
  if (!id) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  await supabase.from('projects').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/admin');
  redirect('/admin');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function importProjects(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const file = formData.get('projects_file');
  if (!(file instanceof File) || file.size === 0) redirect('/admin?import_error=Choose+a+CSV+export+file.');
  if (file.size > 2 * 1024 * 1024) redirect('/admin?import_error=The+import+file+must+be+smaller+than+2MB.');

  let candidates: ImportProject[];
  try {
    candidates = parseCsv(await file.text());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The selected file is not valid CSV.';
    redirect(`/admin?import_error=${encodeURIComponent(message)}`);
  }
  if (!candidates.length) redirect('/admin?import_error=No+projects+were+found+in+the+file.');

  try {
    const rows = candidates.map((item, index) => {
      const name = String(item.name ?? '').trim();
      const slug = slugify(String(item.slug ?? name));
      if (!name || !slug) throw new Error(`Project ${index + 1} needs a name and slug.`);
      const legacyValue = parseJsonCell(String(item.case_study ?? ''), {});
      const legacy = legacyValue && typeof legacyValue === 'object' && !Array.isArray(legacyValue)
        ? legacyValue as ImportProject
        : {};
      const value = (column: string, legacyKey = column.replace(/^case_/, '')) =>
        String(item[column] ?? legacy[legacyKey] ?? '');
      const list = (column: string, legacyKey = column.replace(/^case_/, '')) =>
        item[column] !== undefined ? csvList(item[column]) : stringList(legacy[legacyKey]);
      const caseStudy = {
        industry: value('case_industry'),
        timeline: value('case_timeline'),
        overview: value('case_overview'),
        responsibilities: list('case_responsibilities'),
        tools: list('case_tools'),
        challenge_question: value('case_challenge_question'),
        challenge: value('case_challenge'),
        understanding: value('case_understanding'),
        insights: list('case_insights'),
        process_steps: list('case_process_steps'),
        exploration: value('case_exploration'),
        solution: value('case_solution'),
        features: [1, 2, 3, 4, 5].map((featureIndex) => ({
          title: value(`case_feature_${featureIndex}_title`, ''),
          description: value(`case_feature_${featureIndex}_description`, ''),
        })).filter((feature) => feature.title || feature.description),
        design_system: value('case_design_system'),
        development: value('case_development'),
        responsive: value('case_responsive'),
        outcome: value('case_outcome'),
        what_worked: list('case_what_worked'),
        improvements: list('case_improvements'),
        media: Object.fromEntries([
          'challenge_1', 'challenge_2', 'exploration_1', 'exploration_2', 'exploration_3',
          'solution', 'feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5',
          'responsive_mobile', 'responsive_tablet', 'responsive_desktop',
        ].map((key) => [key, String(item[`case_media_${key}`] ?? (legacy.media as ImportProject | undefined)?.[key] ?? '')]).filter(([, mediaValue]) => mediaValue)),
      };

      // Earlier CSV exports stored features together in case_study.
      if (caseStudy.features.length === 0 && Array.isArray(legacy.features)) {
        caseStudy.features = legacy.features.flatMap((feature) => {
          if (!feature || typeof feature !== 'object' || Array.isArray(feature)) return [];
          const data = feature as ImportProject;
          return [{ title: String(data.title ?? ''), description: String(data.description ?? '') }];
        });
      }
      return {
        slug, name,
        description: String(item.description ?? ''),
        body: String(item.body ?? ''),
        case_study: caseStudy,
        cover_image: String(item.cover_image ?? ''),
        gallery: csvList(item.gallery),
        year: String(item.year ?? ''),
        role: String(item.role ?? ''),
        tags: csvList(item.tags, /\s*,\s*|\r?\n/),
        url: item.url ? String(item.url) : null,
        display_order: Number(item.display_order) || 0,
        published: !['false', '0', 'no'].includes(String(item.published ?? 'true').toLowerCase()),
      };
    });
    const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'slug' });
    if (error) throw new Error(error.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed.';
    redirect(`/admin?import_error=${encodeURIComponent(message.slice(0, 180))}`);
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/projects/[slug]', 'page');
  redirect(`/admin?imported=${candidates.length}`);
}

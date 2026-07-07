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

    const row = {
      slug,
      name,
      description: (formData.get('description') as string)?.trim() ?? '',
      body: (formData.get('body') as string) ?? '',
      year: (formData.get('year') as string)?.trim() ?? '',
      role: (formData.get('role') as string)?.trim() ?? '',
      url: ((formData.get('url') as string)?.trim() || null) as string | null,
      display_order: Number(formData.get('display_order')) || 0,
      published: formData.get('published') === 'on',
      cover_image,
      gallery,
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

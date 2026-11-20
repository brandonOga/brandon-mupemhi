'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { BUCKET, IMAGE_COLUMNS, imageFields, isSafePath, urlPattern, usesPath, type ProjectImageRow } from './usage';

export type MediaResult = { error?: string; updated?: number };

async function signedInClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? supabase : null;
}

/** Points every project that uses the image at `oldPath` to `newUrl` instead.
 *  The old file is kept, so the change can be undone from the library. */
export async function replaceImageInProjects(oldPath: string, newUrl: string): Promise<MediaResult> {
  const supabase = await signedInClient();
  if (!supabase) return { error: 'Your session has expired. Sign in again.' };
  if (!isSafePath(oldPath)) return { error: 'That image path is not valid.' };
  if (!newUrl.includes(`/${BUCKET}/`)) return { error: 'The new image is not in the media library.' };

  const { data, error } = await supabase.from('projects').select(IMAGE_COLUMNS);
  if (error) return { error: error.message };

  let updated = 0;
  for (const row of (data ?? []) as ProjectImageRow[]) {
    if (!usesPath(row, oldPath)) continue;
    const next = JSON.parse(JSON.stringify(imageFields(row)).replace(urlPattern(oldPath), newUrl));
    const result = await supabase.from('projects').update(next).eq('id', row.id);
    if (result.error) return { error: `Updated ${updated} project(s), then failed on "${row.name}": ${result.error.message}`, updated };
    updated += 1;
  }

  revalidatePath('/', 'layout');
  return { updated };
}

/** Deletes an image from storage, refusing if any project still uses it. */
export async function deleteImage(path: string): Promise<MediaResult> {
  const supabase = await signedInClient();
  if (!supabase) return { error: 'Your session has expired. Sign in again.' };
  if (!isSafePath(path)) return { error: 'That image path is not valid.' };

  const { data, error } = await supabase.from('projects').select(IMAGE_COLUMNS);
  if (error) return { error: error.message };
  const users = ((data ?? []) as ProjectImageRow[]).filter((row) => usesPath(row, path));
  if (users.length) return { error: `Still used by ${users.map((row) => row.name).join(', ')}. Replace it there first.` };

  const removed = await supabase.storage.from(BUCKET).remove([path]);
  if (removed.error) return { error: removed.error.message };
  revalidatePath('/admin/media');
  return {};
}

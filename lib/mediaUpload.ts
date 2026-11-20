'use client';

import { createClient } from '@/lib/supabase/client';

export const BUCKET = 'project-images';
export const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = 'Max 1MB per image';

// Uploads directly to Supabase Storage from the browser so large images never
// pass through a server action — Vercel caps serverless function request
// bodies at 4.5MB regardless of Next.js's bodySizeLimit config.
export async function uploadImage(
  file: Blob,
  name = file instanceof File ? file.name : 'image.jpg'
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`"${name}" is too large — ${MAX_UPLOAD_LABEL}.`);
  }
  const supabase = createClient();
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

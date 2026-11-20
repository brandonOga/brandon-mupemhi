import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MediaLibrary, { type MediaItem } from './MediaLibrary';
import { BUCKET, IMAGE_COLUMNS, usesPath, type ProjectImageRow } from './usage';

export const dynamic = 'force-dynamic';

const PAGE = 1000;

export default async function MediaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  // Storage lists at most PAGE objects per call.
  const files: { name: string; created_at?: string | null; metadata?: Record<string, unknown> | null }[] = [];
  let listError = '';
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE, offset, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) { listError = error.message; break; }
    // Folder entries have no id; the placeholder keeps empty folders alive.
    files.push(...(data ?? []).filter((file) => file.id && file.name !== '.emptyFolderPlaceholder'));
    if (!data || data.length < PAGE) break;
  }

  const { data: projects } = await supabase.from('projects').select(IMAGE_COLUMNS);
  const rows = (projects ?? []) as ProjectImageRow[];

  const items: MediaItem[] = files.map((file) => ({
    path: file.name,
    url: supabase.storage.from(BUCKET).getPublicUrl(file.name).data.publicUrl,
    size: Number(file.metadata?.size ?? 0),
    type: String(file.metadata?.mimetype ?? ''),
    createdAt: file.created_at ?? '',
    usedBy: rows.filter((row) => usesPath(row, file.name)).map((row) => ({ id: row.id, name: row.name })),
  }));

  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8 sm:py-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-2xl font-bold uppercase">Media</p>
          <p className="text-sm opacity-60">
            {items.length} image{items.length === 1 ? '' : 's'} in the library. Select one to crop, resize or convert it.
          </p>
        </div>
        <Link href="/admin" className="text-sm no-underline opacity-60">← Projects</Link>
      </div>
      {listError && (
        <p className="mb-6 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          Could not list images: {listError}
        </p>
      )}
      <MediaLibrary items={items} />
    </div>
  );
}

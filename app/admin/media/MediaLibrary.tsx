'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MAX_UPLOAD_LABEL, formatBytes, uploadImage } from '@/lib/mediaUpload';
import { deleteImage } from './actions';
import ImageEditor from './ImageEditor';

export type MediaItem = {
  path: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
  usedBy: { id: string; name: string }[];
};

type Filter = 'all' | 'used' | 'unused';

export default function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const shown = useMemo(() => items.filter((item) =>
    filter === 'all' ? true : filter === 'used' ? item.usedBy.length > 0 : item.usedBy.length === 0
  ), [items, filter]);
  const unusedCount = items.filter((item) => item.usedBy.length === 0).length;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try { await uploadImage(file); } catch (error) { failed.push(error instanceof Error ? error.message : file.name); }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    setMessage(failed.length
      ? { tone: 'error', text: failed.join(' ') }
      : { tone: 'ok', text: `Uploaded ${files.length} image${files.length === 1 ? '' : 's'}.` });
    router.refresh();
  }

  async function remove(item: MediaItem) {
    if (!confirm('Delete this image from the library? This cannot be undone.')) return;
    setBusy(true);
    const result = await deleteImage(item.path);
    setBusy(false);
    setMessage(result.error ? { tone: 'error', text: result.error } : { tone: 'ok', text: 'Image deleted.' });
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 rounded-full border border-foreground/15 bg-white p-1 text-sm">
          {([['all', `All (${items.length})`], ['used', 'In use'], ['unused', `Unused (${unusedCount})`]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full! px-3! py-1.5! text-sm ${filter === id ? 'bg-foreground! text-white!' : 'bg-transparent! text-foreground!'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-50">{MAX_UPLOAD_LABEL}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-full bg-foreground! text-white! px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? 'Working…' : '+ Upload images'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        </div>
      </div>

      {message && (
        <p className={`mb-6 rounded-md border px-3 py-2 text-sm ${message.tone === 'ok' ? 'border-green-300 bg-green-50 text-green-800' : 'border-warning/30 bg-warning/5 text-warning'}`}>
          {message.text}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-sm opacity-60">No images here yet.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map((item) => (
            <li key={item.path} className="flex flex-col overflow-hidden rounded-[10px] border border-foreground/12 bg-white">
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-none! bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)]! bg-[length:16px_16px]! p-0!"
                aria-label={`Edit ${item.path}`}
              >
                <Image src={item.url} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-contain" />
                <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Edit image
                </span>
              </button>
              <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="opacity-60">{formatBytes(item.size)} · {(item.type.split('/')[1] || item.path.split('.').pop() || '').toUpperCase()}</span>
                  {item.usedBy.length === 0 && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-neutral-600">Unused</span>}
                </div>
                {item.usedBy.length > 0 && (
                  <p className="leading-snug">
                    {item.usedBy.map((project, index) => (
                      <span key={project.id}>
                        {index > 0 && ', '}
                        <Link href={`/admin/projects/${project.id}/edit`} className="no-underline">{project.name}</Link>
                      </span>
                    ))}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-3 pt-1">
                  <button type="button" onClick={() => navigator.clipboard.writeText(item.url)} className="bg-transparent! p-0! text-xs text-foreground! opacity-60 hover:opacity-100">
                    Copy URL
                  </button>
                  {item.usedBy.length === 0 && (
                    <button type="button" disabled={busy} onClick={() => remove(item)} className="bg-transparent! p-0! text-xs text-warning!">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ImageEditor
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setMessage({ tone: 'ok', text });
            router.refresh();
          }}
        />
      )}
    </>
  );
}

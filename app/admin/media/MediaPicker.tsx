'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { BUCKET, MAX_UPLOAD_LABEL, uploadImage } from '@/lib/mediaUpload';

type LibraryImage = { path: string; url: string };

const PAGE = 1000;

async function listLibrary(): Promise<LibraryImage[]> {
  const storage = createClient().storage.from(BUCKET);
  const images: LibraryImage[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.list('', { limit: PAGE, offset, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) throw new Error(error.message);
    for (const file of data ?? []) {
      // Folder entries have no id; the placeholder keeps empty folders alive.
      if (!file.id || file.name === '.emptyFolderPlaceholder') continue;
      images.push({ path: file.name, url: storage.getPublicUrl(file.name).data.publicUrl });
    }
    if (!data || data.length < PAGE) return images;
  }
}

/** Dialog listing the media library: click an image to use it, or upload a
 *  new one (it is added to the library and used straight away). */
export default function MediaPicker({ title, current, onSelect, onClose }: {
  title: string;
  current?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listLibrary().then(setImages).catch((e) => setError(`Could not load the library: ${e.message}`));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !uploading) onClose(); };
    window.addEventListener('keydown', onKey);
    // Keep the page behind from scrolling while the dialog is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose, uploading]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      onSelect(await uploadImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) onClose(); }}
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white text-[#1d2327] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4">
          <p className="text-[17px] font-semibold">{title}</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs opacity-50 sm:inline">{MAX_UPLOAD_LABEL}</span>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-foreground! text-white! px-4 py-2 text-sm disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : '+ Upload new'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" onClick={onClose} disabled={uploading} className="bg-transparent! text-foreground! text-sm opacity-60">
              Close ✕
            </button>
          </div>
        </div>

        {error && <p className="mx-5 mt-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">{error}</p>}

        <div className="min-h-[40vh] overflow-y-auto p-5">
          {!images && !error && <p className="text-sm opacity-60">Loading the library…</p>}
          {images?.length === 0 && <p className="text-sm opacity-60">The library is empty. Upload an image to get started.</p>}
          {images && images.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {images.map((image) => {
                const selected = current === image.url;
                return (
                  <li key={image.path}>
                    <button
                      type="button"
                      onClick={() => onSelect(image.url)}
                      aria-pressed={selected}
                      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-md! border-2 p-0! bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)]! bg-[length:16px_16px]! ${selected ? 'border-foreground' : 'border-transparent hover:border-foreground/40'}`}
                    >
                      <Image src={image.url} alt="" fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" className="object-contain" />
                      {selected && <span className="absolute right-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[11px] text-white">Current</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

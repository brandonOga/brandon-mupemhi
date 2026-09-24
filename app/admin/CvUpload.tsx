'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FileInput from './FileInput';
import { CV_BUCKET, CV_MAX_BYTES, CV_MAX_LABEL, CV_PATH } from '@/lib/cv';

// Uploads straight to Supabase Storage from the browser (like project images),
// overwriting the single CV file so /cv.pdf always serves the latest one.
export default function CvUpload({ hasCv }: { hasCv: boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Remounts FileInput after a successful upload so it forgets the chosen file.
  const [inputKey, setInputKey] = useState(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = event.currentTarget;
    const file = new FormData(form).get('cv_file') as File | null;

    if (!file || file.size === 0) {
      setMessage({ ok: false, text: 'Choose a PDF first.' });
      return;
    }
    if (file.type !== 'application/pdf') {
      setMessage({ ok: false, text: 'The CV must be a PDF.' });
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setMessage({ ok: false, text: `"${file.name}" is too large — ${CV_MAX_LABEL}.` });
      return;
    }

    setUploading(true);
    const { error } = await createClient().storage.from(CV_BUCKET).upload(CV_PATH, file, {
      contentType: 'application/pdf',
      upsert: true,
      // Keep the CDN copy short-lived so a replaced CV shows up within a minute.
      cacheControl: '60',
    });
    setUploading(false);

    if (error) {
      const text = /bucket not found/i.test(error.message)
        ? 'Upload failed: the site-files bucket doesn’t exist yet. Re-run supabase/schema.sql in the Supabase SQL Editor.'
        : `Upload failed: ${error.message}`;
      setMessage({ ok: false, text });
      return;
    }
    setInputKey((key) => key + 1);
    setMessage({ ok: true, text: 'CV uploaded. It can take up to a minute to appear at /cv.pdf.' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-60">
          <FileInput key={inputKey} name="cv_file" accept="application/pdf,.pdf" buttonLabel="Choose PDF" />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="bg-foreground! text-white! text-sm disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : hasCv ? 'Replace CV' : 'Upload CV'}
        </button>
      </div>
      <p className="text-xs opacity-45">{CV_MAX_LABEL}. Uploading replaces the current CV.</p>
      {message && (
        <p
          className={`text-sm rounded-md border px-3 py-2 ${
            message.ok
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-warning/30 bg-warning/5 text-warning'
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

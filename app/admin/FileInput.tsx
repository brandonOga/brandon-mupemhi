'use client';

import { useRef, useState } from 'react';

export default function FileInput({
  name,
  accept = 'image/*',
  multiple = false,
  buttonLabel = 'Choose file',
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  buttonLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);

  const status =
    files.length === 0
      ? 'No file selected'
      : files.length === 1
        ? files[0]
        : `${files.length} files selected`;

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-foreground/25 bg-foreground/[0.02] px-3 py-2.5">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="shrink-0 bg-foreground! text-white! text-sm px-4 py-2 rounded-md"
      >
        {buttonLabel}
      </button>
      <span
        className={`text-sm truncate ${
          files.length ? 'text-foreground' : 'opacity-45'
        }`}
      >
        {status}
      </span>
      <input
        ref={ref}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) =>
          setFiles(Array.from(e.target.files ?? []).map((f) => f.name))
        }
      />
    </div>
  );
}

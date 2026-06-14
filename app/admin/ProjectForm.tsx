'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { saveProject, type SaveState } from './actions';
import RichTextEditor from './RichTextEditor';
import FileInput from './FileInput';
import type { Project } from '@/lib/projects';

const input =
  'rounded-md border border-foreground/20 bg-white px-3 py-2 outline-none focus:border-foreground w-full text-[15px]';
const labelText = 'uppercase opacity-55 text-xs tracking-wide';
const card = 'rounded-xl border border-foreground/12 bg-white/70 p-6 flex flex-col gap-5';
const legend = 'text-xs uppercase tracking-widest opacity-40 font-medium';

export default function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProject,
    {}
  );
  const [gallery, setGallery] = useState<string[]>(project?.gallery ?? []);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-10"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold uppercase leading-none">
            {project ? 'Edit project' : 'New project'}
          </p>
          {project && (
            <p className="text-xs opacity-50 mt-1">/{project.slug}</p>
          )}
        </div>
        <Link href="/admin" className="text-sm no-underline opacity-60">
          ← Back
        </Link>
      </div>

      {project && <input type="hidden" name="id" value={project.id} />}
      <input
        type="hidden"
        name="cover_image_current"
        value={project?.cover_image ?? ''}
      />

      {/* Details */}
      <section className={card}>
        <p className={legend}>Details</p>

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Name *</span>
          <input name="name" required defaultValue={project?.name} className={input} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Slug — leave blank to auto-generate</span>
          <input
            name="slug"
            defaultValue={project?.slug}
            placeholder="e.g. ferrari"
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Short description</span>
          <input
            name="description"
            defaultValue={project?.description}
            className={input}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelText}>Year</span>
            <input name="year" defaultValue={project?.year} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelText}>Role</span>
            <input name="role" defaultValue={project?.role} className={input} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Tags (comma separated)</span>
          <input
            name="tags"
            defaultValue={project?.tags.join(', ')}
            placeholder="branding, web, 3d"
            className={input}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>External link (optional)</span>
          <input
            name="url"
            type="url"
            defaultValue={project?.url ?? ''}
            placeholder="https://…"
            className={input}
          />
        </label>
      </section>

      {/* Case study */}
      <section className={card}>
        <p className={legend}>Case study</p>
        <RichTextEditor name="body" defaultValue={project?.body} />
      </section>

      {/* Media */}
      <section className={card}>
        <p className={legend}>Media</p>

        {/* Cover image */}
        <div className="flex flex-col gap-2.5">
          <span className={labelText}>Cover image</span>
          {project?.cover_image && (
            <div className="relative w-44 h-28 bg-neutral-200 rounded-md overflow-hidden border border-foreground/10">
              <Image
                src={project.cover_image}
                alt="current cover"
                fill
                className="object-cover"
                sizes="176px"
              />
            </div>
          )}
          <FileInput name="cover_file" buttonLabel="Upload cover" />
          <span className="text-xs opacity-45">
            {project?.cover_image
              ? 'Leave empty to keep the current image.'
              : 'Shown on the project card and as the page header.'}
          </span>
        </div>

        <div className="h-px bg-foreground/10" />

        {/* Gallery */}
        <div className="flex flex-col gap-2.5">
          <span className={labelText}>Gallery images</span>
          {gallery.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {gallery.map((url) => (
                <div key={url} className="flex flex-col items-center">
                  <div className="relative w-28 h-20 bg-neutral-200 rounded-md overflow-hidden border border-foreground/10">
                    <Image
                      src={url}
                      alt="gallery"
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                  <input type="hidden" name="gallery_keep" value={url} />
                  <button
                    type="button"
                    onClick={() => setGallery((g) => g.filter((u) => u !== url))}
                    className="bg-transparent! text-warning! text-xs px-0 pt-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <FileInput
            name="gallery_files"
            multiple
            buttonLabel="Add images"
          />
          <span className="text-xs opacity-45">
            Selected files are added to the gallery on save.
          </span>
        </div>
      </section>

      {/* Settings */}
      <section className={card}>
        <p className={legend}>Settings</p>
        <div className="grid grid-cols-2 gap-4 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelText}>Display order (lower = first)</span>
            <input
              name="display_order"
              type="number"
              defaultValue={project?.display_order ?? 0}
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              name="published"
              defaultChecked={project ? project.published : true}
              className="w-4 h-4"
            />
            <span className="uppercase">Published</span>
          </label>
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-warning bg-warning/5 border border-warning/30 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background/90 backdrop-blur py-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground! text-white! disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save project'}
        </button>
        <Link
          href="/admin"
          className="rounded-full border border-foreground/20 px-5 py-2.5 text-sm no-underline self-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

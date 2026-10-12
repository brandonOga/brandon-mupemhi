'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { saveProject, type SaveState } from './actions';
import RichTextEditor from './RichTextEditor';
import FileInput from './FileInput';
import type { Project } from '@/lib/projects';
import { problemProcessHtml, solutionHtml } from '@/lib/caseStudyHtml';
import { deviceFrameKey, devicePresets, deviceSlots } from '@/lib/devices';
import { createClient } from '@/lib/supabase/client';

const input =
  'rounded-md border border-foreground/20 bg-white px-3 py-2 outline-none focus:border-foreground w-full text-[15px] text-[#1d2327]';
const labelText = 'text-[13.5px] font-semibold text-[#1d2327]/90';
const card = 'rounded-[10px] border border-foreground/12 bg-white px-4 py-5 sm:px-7 sm:py-6 flex flex-col gap-5';
const sidebarCard = 'rounded-[10px] border border-foreground/12 bg-white px-5 py-5 flex flex-col gap-4';
const legend = 'text-[19px] font-[650] leading-snug text-[#1d2327]';
const help = 'text-[12.5px] text-[#1d2327]/55';
// The site's `font-sans` token is Roboto Mono, so the editor names its own sans stack.
const editorFont = "[font-family:system-ui,-apple-system,'Segoe_UI',Roboto,'Helvetica_Neue',Arial,sans-serif]";

const sectionLinks = [
  ['project-intro', 'Intro'], ['snapshot', 'Overview'], ['problem', 'Problem'],
  ['solution', 'Solution'], ['outcome', 'Outcome'],
  ['media', 'Media'], ['settings', 'Publish'],
];

const BUCKET = 'project-images';
const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
const MAX_UPLOAD_LABEL = 'Max 1MB per image';

// Uploads directly to Supabase Storage from the browser so large images never
// pass through the server action — Vercel caps serverless function request
// bodies at 4.5MB regardless of Next.js's bodySizeLimit config.
async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`"${file.name}" is too large — ${MAX_UPLOAD_LABEL}.`);
  }
  const supabase = createClient();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProject,
    {}
  );
  const [gallery, setGallery] = useState<string[]>(project?.gallery ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [, startTransition] = useTransition();

  const busy = pending || uploading;
  const caseStudy = project?.case_study;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError('');
    const form = e.currentTarget;
    const raw = new FormData(form);

    setUploading(true);
    try {
      const coverFile = raw.get('cover_file') as File | null;
      if (coverFile && coverFile.size > 0) {
        raw.set('cover_image_current', await uploadImage(coverFile));
      }
      raw.delete('cover_file');

      const galleryFiles = (raw.getAll('gallery_files') as File[]).filter(
        (f) => f && f.size > 0
      );
      raw.delete('gallery_files');
      for (const f of galleryFiles) {
        raw.append('gallery_keep', await uploadImage(f));
      }

      // A new device screenshot replaces the one its slot already holds.
      for (const { key } of deviceSlots) {
        const deviceFile = raw.get(`device_file_${key}`) as File | null;
        if (deviceFile && deviceFile.size > 0) {
          raw.set(`case_media_${key}`, await uploadImage(deviceFile));
        }
        raw.delete(`device_file_${key}`);
      }
    } catch (err) {
      setUploading(false);
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
      return;
    }
    setUploading(false);

    startTransition(() => formAction(raw));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${editorFont} text-[#1d2327] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-x-7 gap-y-6 items-start max-w-[1320px] mx-auto px-4 pt-[calc(60px+2.5rem)] pb-10`}
    >
      {/* Fixed action bar */}
      <div className="fixed top-0 inset-x-0 z-50 bg-white border-b border-foreground/12 shadow-sm px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-[#1d2327] truncate">
          {project ? `Editing: ${project.name}` : 'New project'}
        </p>
        <div className="flex items-center gap-3 min-w-0">
          {(state.error || uploadError) && (
            <p
              className="text-[13px] text-warning truncate"
              title={uploadError || state.error}
            >
              {uploadError || state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 bg-foreground! text-white! rounded-md text-sm px-3 sm:px-[18px] py-2 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : pending ? 'Saving…' : 'Save project'}
          </button>
          <Link
            href="/admin"
            className="shrink-0 rounded-md border border-foreground/20 text-sm px-3 sm:px-[18px] py-2 no-underline text-[#1d2327]"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[23px] font-semibold leading-tight text-[#1d2327]">
            {project ? 'Edit project' : 'New project'}
          </p>
          {project && (
            <p className="text-[13px] opacity-50 mt-1">/{project.slug}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
        {project?.published && <Link href={`/projects/${project.slug}`} target="_blank" className="rounded-full border border-foreground/20 px-4 py-2 text-sm no-underline">Preview ↗</Link>}
        <Link href="/admin" className="text-sm no-underline opacity-60">
          ← Back
        </Link></div>
      </div>

      {project && <input type="hidden" name="id" value={project.id} />}
      <input
        type="hidden"
        name="cover_image_current"
        value={project?.cover_image ?? ''}
      />

      {/* Main column */}
      <div className="flex flex-col gap-6 min-w-0">
      {/* Details */}
      <section id="project-intro" className={card}>
        <SectionHeading title="Project card and hero" required note="Controls the homepage hover panel and the opening of the project page. Roles and tags appear as pills in both places." />

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Name *</span>
          <input name="name" required defaultValue={project?.name} className={`${input} text-[22px] sm:text-[28px] font-[650] px-4 py-3.5`} />
        </label>

        {/* Not editable: a new project's slug is generated from its name, and
            an existing project keeps the one it has. */}
        <input type="hidden" name="slug" value={project?.slug ?? ''} />

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Project type / one-sentence summary</span>
          <input
            name="description"
            defaultValue={project?.description}
            className={input}
          />
        </label>

        <Field name="year" label="Year" value={project?.year} />

        <Repeater
          name="role"
          label="Role"
          itemLabel="role"
          values={(project?.role ?? '').split(',').map((item) => item.trim()).filter(Boolean)}
          placeholder="e.g. UI Designer"
        />

        <Repeater
          name="tags"
          label="Tags"
          itemLabel="tag"
          values={project?.tags ?? []}
          placeholder="e.g. branding"
        />

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

      <section id="snapshot" className={card}>
        <SectionHeading title="01 — Project overview" required note="The at-a-glance facts (role, timeline, industry, responsibilities, tools) and the opening paragraph of the project page." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="case_industry" label="Industry" value={caseStudy?.industry} />
          <Field name="case_timeline" label="Timeline" value={caseStudy?.timeline} placeholder="e.g. 8 weeks" />
        </div>
        <Area name="case_overview" label="Project overview" value={caseStudy?.overview} />
        <Repeater name="case_responsibilities" label="Responsibilities" itemLabel="responsibility" values={caseStudy?.responsibilities ?? []} />
        <Repeater name="case_tools" label="Tools / technology" itemLabel="tool" values={caseStudy?.tools ?? []} placeholder="e.g. Figma" />
      </section>

      <section id="problem" className={card}>
        <SectionHeading title="02 — Problem and process" required note="Explain the problem before the polished work: the challenge, what you learned about the users, the process, and the exploration. This section is text only." />
        <RichTextEditor name="case_problem_process" defaultValue={problemProcessHtml(caseStudy)} />
      </section>

      <section id="solution" className={card}>
        <SectionHeading title="03 — Solution" required note="Introduce the solution, then explain what each key feature does, why it exists, and which problem it solves. Shown to the left of the device mockups." />
        <RichTextEditor name="case_solution_detail" defaultValue={solutionHtml(caseStudy)} />

        <div className="flex flex-col gap-2.5 border-t border-foreground/10 pt-5">
          <span className={labelText}>Device mockups</span>
          <span className={help}>
            Shown to the right of the solution copy in three columns: the two mobiles, the tablet, then the desktop.
            Pick a device and upload a screenshot taken at its screen size. Until a device has its own screenshot
            it shows a gallery image or the cover.{' '}
            <span className="opacity-70">({MAX_UPLOAD_LABEL})</span>
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {deviceSlots.map((slot) => (
              <DeviceSlot
                key={slot.key}
                slot={slot}
                image={caseStudy?.media[slot.key]}
                frame={caseStudy?.media[deviceFrameKey(slot.key)]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* System and build is no longer edited or shown on the project page.
          What a project already stored is passed through so saving keeps it. */}
      <input type="hidden" name="case_design_system" value={caseStudy?.design_system ?? ''} />
      <input type="hidden" name="case_development" value={caseStudy?.development ?? ''} />
      <input type="hidden" name="case_responsive" value={caseStudy?.responsive ?? ''} />
      {/* The problem and process section has no images any more, and the
          solution shows device mockups instead of assigned images; the old
          image assignments are passed through the same way. */}
      {['responsive_mobile', 'responsive_tablet', 'responsive_desktop', 'challenge_1', 'challenge_2', 'exploration_1', 'exploration_2', 'exploration_3', 'solution', 'feature_1', 'feature_2', 'feature_3', 'feature_4', 'feature_5'].map((key) => (
        <input key={key} type="hidden" name={`case_media_${key}`} value={caseStudy?.media[key] ?? ''} />
      ))}

      <section id="outcome" className={card}>
        <SectionHeading title="04 — Outcome and reflection" required note="Describe what was delivered, learned, and worth improving. Only use verified metrics." />
        <Area name="case_outcome" label="Outcome" value={caseStudy?.outcome} />
        <Repeater name="case_what_worked" label="What worked" itemLabel="point" values={caseStudy?.what_worked ?? []} />
        <Repeater name="case_improvements" label="What I’d improve" itemLabel="point" values={caseStudy?.improvements ?? []} />
      </section>

      {/* Media */}
      <section id="media" className={card}>
        <SectionHeading title="Media and image placement" required note="The cover image and the gallery. Device screenshots for the solution are uploaded in section 03." />

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
          <span className={help}>
            {project?.cover_image
              ? 'Leave empty to keep the current image.'
              : 'Shown on the project card and as the page header.'}{' '}
            <span className="opacity-70">({MAX_UPLOAD_LABEL})</span>
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
          <span className={help}>
            Selected files are added to the gallery on save.{' '}
            <span className="opacity-70">({MAX_UPLOAD_LABEL})</span>
          </span>
        </div>
      </section>
      </div>

      {/* Sidebar — self-stretch so the Sections card can stay sticky */}
      <aside className="flex flex-col gap-6 self-stretch">
        <section id="settings" className={sidebarCard}>
          <SectionHeading title="Publish" required />
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelText}>Display order (lower = first)</span>
            <input
              name="display_order"
              type="number"
              defaultValue={project?.display_order ?? 0}
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={project ? project.published : true}
              className="w-4 h-4"
            />
            <span className={labelText}>Published</span>
          </label>
        </section>

        <nav className={`${sidebarCard} gap-1 sticky top-[76px]`}>
          <p className={`${legend} border-b border-foreground/10 pb-3 mb-2`}>Sections</p>
          {sectionLinks.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-md px-2.5 py-2 text-[14px] no-underline text-[#1d2327] hover:bg-black/5 hover:text-[#1d2327]"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
    </form>
  );
}

function Field({ name, label, value, placeholder }: { name: string; label: string; value?: string; placeholder?: string }) {
  return <label className="flex flex-col gap-1 text-sm"><span className={labelText}>{label}</span><input name={name} defaultValue={value} placeholder={placeholder} className={input} /></label>;
}

// One input per value, all submitted under the same field name.
function Repeater({ name, label, itemLabel, values, placeholder }: { name: string; label: string; itemLabel: string; values: string[]; placeholder?: string }) {
  const [rows, setRows] = useState(() => (values.length ? values : ['']).map((value, id) => ({ id, value })));
  const [nextId, setNextId] = useState(rows.length);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className={labelText}>{label}</span>
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <input name={name} defaultValue={row.value} placeholder={placeholder} aria-label={`${label} ${index + 1}`} className={input} />
          {rows.length > 1 && (
            <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="shrink-0 bg-transparent! text-warning! border border-warning/20 text-xs">Remove</button>
          )}
        </div>
      ))}
      <div>
        <button
          type="button"
          onClick={() => { setRows((current) => [...current, { id: nextId, value: '' }]); setNextId((id) => id + 1); }}
          className="bg-transparent! text-foreground! border border-foreground/20 text-xs"
        >
          + Add {itemLabel}
        </button>
      </div>
    </div>
  );
}

function Area({ name, label, value, placeholder, rows = 4 }: { name: string; label: string; value?: string; placeholder?: string; rows?: number }) {
  return <label className="flex flex-col gap-1 text-sm"><span className={labelText}>{label}</span><textarea name={name} defaultValue={value} placeholder={placeholder} rows={rows} className={`${input} resize-y leading-relaxed`} /></label>;
}

function SectionHeading({ title, note, required = false }: { title: string; note?: string; required?: boolean }) {
  return <div className="border-b border-foreground/10 pb-4"><div className="flex items-center justify-between gap-4"><p className={legend}>{title}</p><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] ${required ? 'bg-foreground text-white' : 'bg-foreground/5 text-foreground/60'}`}>{required ? 'Core' : 'Optional'}</span></div>{note && <p className="mt-2 text-[13.5px] opacity-65">{note}</p>}</div>;
}

// One device mockup: which device to draw and the screenshot on its screen.
function DeviceSlot({ slot, image, frame }: { slot: (typeof deviceSlots)[number]; image?: string; frame?: string }) {
  const [current, setCurrent] = useState(image ?? '');
  const presets = devicePresets[slot.kind];

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-foreground/12 p-3.5 text-sm">
      <label className="flex flex-col gap-1">
        <span className={labelText}>{slot.label}</span>
        <select name={`case_media_${deviceFrameKey(slot.key)}`} defaultValue={frame || presets[0].id} className={input}>
          {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </label>
      <input type="hidden" name={`case_media_${slot.key}`} value={current} />
      {current && (
        <div className="flex items-end gap-3">
          <div className="relative w-28 h-20 bg-neutral-200 rounded-md overflow-hidden border border-foreground/10">
            <Image src={current} alt={`${slot.label} screenshot`} fill className="object-cover object-top" sizes="112px" />
          </div>
          <button type="button" onClick={() => setCurrent('')} className="bg-transparent! text-warning! text-xs px-0">
            Remove
          </button>
        </div>
      )}
      <FileInput name={`device_file_${slot.key}`} buttonLabel={current ? 'Replace screenshot' : 'Upload screenshot'} />
    </div>
  );
}

'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { saveProject, type SaveState } from './actions';
import RichTextEditor from './RichTextEditor';
import FileInput from './FileInput';
import type { Project } from '@/lib/projects';
import { createClient } from '@/lib/supabase/client';

const input =
  'rounded-md border border-foreground/20 bg-white px-3 py-2 outline-none focus:border-foreground w-full text-[15px]';
const labelText = 'uppercase opacity-55 text-xs tracking-wide';
const card = 'rounded-xl border border-foreground/12 bg-white/70 p-6 flex flex-col gap-5';
const legend = 'text-xs uppercase tracking-widest opacity-40 font-medium';
const help = 'text-xs opacity-45';

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
  const [featureCount, setFeatureCount] = useState(Math.max(3, project?.case_study.features.length ?? 0));
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
      className="flex flex-col gap-6 max-w-5xl mx-auto px-4 py-10"
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
        <div className="flex items-center gap-3">
        {project?.published && <Link href={`/projects/${project.slug}`} target="_blank" className="rounded-full border border-foreground/20 px-4 py-2 text-sm no-underline">Preview ↗</Link>}
        <Link href="/admin" className="text-sm no-underline opacity-60">
          ← Back
        </Link></div>
      </div>

      <nav className="sticky top-3 z-20 flex gap-2 overflow-x-auto rounded-full border border-foreground/10 bg-background/95 p-2 shadow-sm backdrop-blur">
        {[
          ['project-intro', 'Intro'], ['snapshot', 'Overview'], ['problem', 'Problem'],
          ['solution', 'Solution'], ['system-build', 'Build'], ['outcome', 'Outcome'],
          ['media', 'Media'], ['settings', 'Settings'],
        ].map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3 py-1 text-xs uppercase no-underline text-foreground">{label}</a>)}
      </nav>

      {project && <input type="hidden" name="id" value={project.id} />}
      <input
        type="hidden"
        name="cover_image_current"
        value={project?.cover_image ?? ''}
      />

      {/* Details */}
      <section id="project-intro" className={card}>
        <SectionHeading title="Project card and hero" required note="Controls the homepage hover panel and the opening of the project page." />

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
          <span className={labelText}>Project type / one-sentence summary</span>
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
        <SectionHeading title="Optional rich-text introduction" note="Legacy long-form introduction. Leave empty to use the structured overview below." />
        <RichTextEditor name="body" defaultValue={project?.body} />
        <p className={help}>Optional rich-text introduction. The structured fields below control the editorial page sections.</p>
      </section>

      <section id="snapshot" className={card}>
        <SectionHeading title="01 — Project overview" required note="Gives visitors a quick understanding before the full case study." />
        <div className="grid grid-cols-2 gap-4">
          <Field name="case_industry" label="Industry" value={caseStudy?.industry} />
          <Field name="case_timeline" label="Timeline" value={caseStudy?.timeline} placeholder="e.g. 8 weeks" />
        </div>
        <Area name="case_overview" label="Project overview" value={caseStudy?.overview} />
        <div className="grid grid-cols-2 gap-4">
          <Area name="case_responsibilities" label="Responsibilities — one per line" value={caseStudy?.responsibilities.join('\n')} rows={5} />
          <Area name="case_tools" label="Tools / technology — one per line" value={caseStudy?.tools.join('\n')} rows={5} />
        </div>
      </section>

      <section id="problem" className={card}>
        <SectionHeading title="02–05 — Problem and process" required note="Explain the problem before the polished work. Empty optional subsections stay hidden." />
        <Field name="case_challenge_question" label="Challenge question" value={caseStudy?.challenge_question} placeholder="How might we…?" />
        <Area name="case_challenge" label="Challenge explanation" value={caseStudy?.challenge} />
        <Area name="case_understanding" label="Understanding the problem / users" value={caseStudy?.understanding} />
        <Area name="case_insights" label="Key insights — one per line" value={caseStudy?.insights.join('\n')} />
        <Area name="case_process_steps" label="Information architecture / process steps — one per line" value={caseStudy?.process_steps.join('\n')} placeholder={'Registration\nOnboarding\nDashboard\nCompletion'} />
        <Area name="case_exploration" label="Exploration / wireframes explanation" value={caseStudy?.exploration} />
      </section>

      <section id="solution" className={card}>
        <SectionHeading title="06–07 — Solution and key experiences" required note="Explain what each feature does, why it exists, and which problem it solves." />
        <Area name="case_solution" label="Solution introduction" value={caseStudy?.solution} />
        <input type="hidden" name="case_feature_count" value={featureCount} />
        {Array.from({ length: featureCount }, (_, index) => <div key={index} className="grid gap-3 border-t border-foreground/10 pt-4">
          <Field name={`case_feature_${index + 1}_title`} label={`Feature ${index + 1} title`} value={caseStudy?.features[index]?.title} />
          <Area name={`case_feature_${index + 1}_description`} label={`Feature ${index + 1} explanation`} value={caseStudy?.features[index]?.description} rows={3} />
        </div>)}
        <div className="flex gap-2">
          {featureCount < 5 && <button type="button" onClick={() => setFeatureCount((count) => count + 1)} className="bg-transparent! text-foreground! border border-foreground/20 text-xs">+ Add feature</button>}
          {featureCount > 1 && <button type="button" onClick={() => setFeatureCount((count) => count - 1)} className="bg-transparent! text-warning! border border-warning/20 text-xs">Remove last</button>}
        </div>
      </section>

      <section id="system-build" className={card}>
        <SectionHeading title="08–10 — System and build" note="Optional — each section remains hidden on the public page when empty." />
        <Area name="case_design_system" label="Design system" value={caseStudy?.design_system} />
        <Area name="case_development" label="Development involvement" value={caseStudy?.development} />
        <Area name="case_responsive" label="Responsive design" value={caseStudy?.responsive} />
      </section>

      <section id="outcome" className={card}>
        <SectionHeading title="11 — Outcome and reflection" required note="Describe what was delivered, learned, and worth improving. Only use verified metrics." />
        <Area name="case_outcome" label="Outcome" value={caseStudy?.outcome} />
        <div className="grid grid-cols-2 gap-4">
          <Area name="case_what_worked" label="What worked — one per line" value={caseStudy?.what_worked.join('\n')} />
          <Area name="case_improvements" label="What I’d improve — one per line" value={caseStudy?.improvements.join('\n')} />
        </div>
      </section>

      {/* Media */}
      <section id="media" className={card}>
        <SectionHeading title="Media and image placement" required note="Upload images, save the project, then assign each saved image to a page position." />

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
          <span className="text-xs opacity-45">
            Selected files are added to the gallery on save.{' '}
            <span className="opacity-70">({MAX_UPLOAD_LABEL})</span>
          </span>
        </div>

        {(gallery.length > 0 || project?.cover_image) && (
          <div className="grid grid-cols-1 gap-4 border-t border-foreground/10 pt-5 sm:grid-cols-2">
            {[
              ['challenge_1', 'Challenge image 1'], ['challenge_2', 'Challenge image 2'],
              ['exploration_1', 'Exploration image 1'], ['exploration_2', 'Exploration image 2'], ['exploration_3', 'Exploration image 3'],
              ['solution', 'Main solution image'],
              ...Array.from({ length: featureCount }, (_, index) => [`feature_${index + 1}`, `Feature ${index + 1} image`]),
              ['responsive_mobile', 'Responsive mobile'], ['responsive_tablet', 'Responsive tablet'], ['responsive_desktop', 'Responsive desktop'],
            ].map(([key, text]) => (
              <MediaSelect key={key} name={`case_media_${key}`} label={text} value={caseStudy?.media[key]} cover={project?.cover_image} gallery={gallery} />
            ))}
          </div>
        )}
      </section>

      {/* Settings */}
      <section id="settings" className={card}>
        <SectionHeading title="Publishing settings" required />
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

      {(state.error || uploadError) && (
        <p className="text-sm text-warning bg-warning/5 border border-warning/30 rounded-md px-3 py-2">
          {uploadError || state.error}
        </p>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background/90 backdrop-blur py-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-foreground! text-white! disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : pending ? 'Saving…' : 'Save project'}
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

function Field({ name, label, value, placeholder }: { name: string; label: string; value?: string; placeholder?: string }) {
  return <label className="flex flex-col gap-1 text-sm"><span className={labelText}>{label}</span><input name={name} defaultValue={value} placeholder={placeholder} className={input} /></label>;
}

function Area({ name, label, value, placeholder, rows = 4 }: { name: string; label: string; value?: string; placeholder?: string; rows?: number }) {
  return <label className="flex flex-col gap-1 text-sm"><span className={labelText}>{label}</span><textarea name={name} defaultValue={value} placeholder={placeholder} rows={rows} className={`${input} resize-y`} /></label>;
}

function SectionHeading({ title, note, required = false }: { title: string; note?: string; required?: boolean }) {
  return <div className="border-b border-foreground/10 pb-4"><div className="flex items-center justify-between gap-4"><p className={legend}>{title}</p><span className={`rounded-full px-2 py-1 text-[10px] uppercase ${required ? 'bg-foreground text-white' : 'bg-foreground/5 text-foreground/60'}`}>{required ? 'Core' : 'Optional'}</span></div>{note && <p className="mt-2 text-xs opacity-55">{note}</p>}</div>;
}

function MediaSelect({ name, label, value, cover, gallery }: { name: string; label: string; value?: string; cover?: string; gallery: string[] }) {
  const options = Array.from(new Set([cover, ...gallery].filter(Boolean))) as string[];
  return <label className="flex flex-col gap-1 text-sm"><span className={labelText}>{label}</span><select name={name} defaultValue={value ?? ''} className={input}><option value="">Automatic gallery order</option>{options.map((url, index) => <option key={url} value={url}>{index === 0 && cover ? 'Cover image' : `Gallery image ${cover ? index : index + 1}`}</option>)}</select></label>;
}

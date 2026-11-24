'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { saveProject, type SaveState } from './actions';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './media/MediaPicker';
import type { Project } from '@/lib/projects';
import { problemProcessHtml, solutionHtml } from '@/lib/caseStudyHtml';
import { MODEL_MEDIA_KEY, deviceFrameKey, devicePresets, deviceSlots } from '@/lib/devices';
import { MAX_UPLOAD_LABEL } from '@/lib/mediaUpload';

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
  ['solution', 'Solution'],
  ['settings', 'Publish'], ['cover', 'Cover image'],
];


export default function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProject,
    {}
  );
  const [, startTransition] = useTransition();

  const busy = pending;
  const caseStudy = project?.case_study;

  // Images are chosen (or uploaded) through the media picker before saving,
  // so the form only sends their URLs.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
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
          {state.error && (
            <p className="text-[13px] text-warning truncate" title={state.error}>
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 bg-foreground! text-white! rounded-md text-sm px-3 sm:px-[18px] py-2 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save project'}
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
        {project?.published && <Link href={`/work/${project.slug}`} target="_blank" className="rounded-full border border-foreground/20 px-4 py-2 text-sm no-underline">Preview ↗</Link>}
        <Link href="/admin" className="text-sm no-underline opacity-60">
          ← Back
        </Link></div>
      </div>

      {project && <input type="hidden" name="id" value={project.id} />}

      {/* Main column */}
      <div className="flex flex-col gap-6 min-w-0">
      {/* Details */}
      <section id="project-intro" className={card}>
        <SectionHeading title="Project card and hero" required note="Controls the homepage hover panel and the opening of the project page. Roles and tags appear as pills in both places." />

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Name *</span>
          <input name="name" required defaultValue={project?.name} className={`${input} text-[22px] sm:text-[28px] font-[650] px-4 py-3.5`} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Short title</span>
          <input name="case_short_title" defaultValue={caseStudy?.short_title} placeholder={project?.name || 'Optional'} className={input} />
          <span className="text-[13px] opacity-50">Used for the homepage project buttons and carousel, and the &ldquo;Next project&rdquo; heading. The project page&rsquo;s big title uses the full name. Leave empty to use the name everywhere. The URL is still made from the name.</span>
        </label>

        {/* Not editable: the slug is generated from the name on every save, so
            renaming a project changes its URL. The old slug is sent so its
            cached page can be cleared. */}
        <input type="hidden" name="previous_slug" value={project?.slug ?? ''} />

        <label className="flex flex-col gap-1 text-sm">
          <span className={labelText}>Project type / one-sentence summary</span>
          <textarea
            name="description"
            defaultValue={project?.description}
            rows={3}
            className={`${input} resize-y leading-relaxed`}
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
            Pick a device and upload an image taken at its screen size. Until a device has its own image it
            shows the cover.{' '}
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

        <div className="flex flex-col gap-2.5 border-t border-foreground/10 pt-5">
          <span className={labelText}>Model</span>
          <span className={help}>
            Shown on the screen of the 3D model on the homepage when this project is hovered or selected.
            Use a 4:3 image, e.g. 1600 &times; 1200px (1024 &times; 768 at least); other shapes are cropped to fit.
            The screen is a curved CRT with dark edges, so keep text and logos about 5% in from each edge.
            Leave empty to use the cover image.{' '}
            <span className="opacity-70">({MAX_UPLOAD_LABEL})</span>
          </span>
          <ImageSlot mediaKey={MODEL_MEDIA_KEY} label="Model" image={caseStudy?.media[MODEL_MEDIA_KEY]} />
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

      {/* The outcome and reflection section is no longer shown; its stored
          values are passed through the same way. */}
      <input type="hidden" name="case_outcome" value={caseStudy?.outcome ?? ''} />
      <input type="hidden" name="case_what_worked" value={(caseStudy?.what_worked ?? []).join('\n')} />
      <input type="hidden" name="case_improvements" value={(caseStudy?.improvements ?? []).join('\n')} />

      {/* The gallery is no longer edited; a project's stored gallery images
          are passed through so saving keeps them (older projects' device
          mockups still fall back to them). */}
      {(project?.gallery ?? []).map((url) => (
        <input key={url} type="hidden" name="gallery_keep" value={url} />
      ))}
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

        <section id="cover" className={sidebarCard}>
          <SectionHeading title="Cover image" required />
          <ImageField name="cover_image_current" label="Cover" image={project?.cover_image} large />
          <span className={help}>
            Shown as the project page header and on the project card. Pick one from the media library or upload a new one.{' '}
            <span className="opacity-70">({MAX_UPLOAD_LABEL})</span>
          </span>
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
  const presets = devicePresets[slot.kind];

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-foreground/12 p-3.5 text-sm">
      <label className="flex flex-col gap-1">
        <span className={labelText}>{slot.label}</span>
        <select name={`case_media_${deviceFrameKey(slot.key)}`} defaultValue={frame || presets[0].id} className={input}>
          {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </label>
      <ImageSlot mediaKey={slot.key} label={slot.label} image={image} />
    </div>
  );
}

// One stored image in `case_study.media[mediaKey]`.
function ImageSlot({ mediaKey, label, image }: { mediaKey: string; label: string; image?: string }) {
  return <ImageField name={`case_media_${mediaKey}`} label={label} image={image} />;
}

// An image chosen from the media library (which can also upload a new one).
// The chosen URL is submitted under `name`.
function ImageField({ name, label, image, large = false }: { name: string; label: string; image?: string; large?: boolean }) {
  const [current, setCurrent] = useState(image ?? '');
  const [picking, setPicking] = useState(false);

  return (
    <>
      <input type="hidden" name={name} value={current} />
      {current && (
        <div className={`relative bg-neutral-200 rounded-md overflow-hidden border border-foreground/10 ${large ? 'aspect-[16/10] w-full' : 'w-28 h-20'}`}>
          <Image src={current} alt={`${label} image`} fill className={`object-cover ${large ? '' : 'object-top'}`} sizes={large ? '260px' : '112px'} />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="bg-foreground! text-white! text-sm px-4 py-2 rounded-md"
        >
          {current ? 'Change image' : 'Choose image'}
        </button>
        {current && (
          <button type="button" onClick={() => setCurrent('')} className="bg-transparent! text-warning! text-xs px-0">
            Remove
          </button>
        )}
      </div>
      {picking && (
        <MediaPicker
          title={`Choose ${label.toLowerCase()} image`}
          current={current}
          onSelect={(url) => { setCurrent(url); setPicking(false); }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

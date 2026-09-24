import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllProjectsForAdmin } from '@/lib/projects';
import { signOut } from './actions';
import DeleteButton from './DeleteButton';
import ImportProjects from './ImportProjects';
import CvUpload from './CvUpload';
import { CV_BUCKET, CV_PATH } from '@/lib/cv';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; import_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const projects = await getAllProjectsForAdmin();
  const notice = await searchParams;

  const { data: cvFiles } = await supabase.storage
    .from(CV_BUCKET)
    .list('', { search: CV_PATH });
  const cvFile = cvFiles?.find((file) => file.name === CV_PATH);
  const cvUpdatedAt = cvFile?.updated_at
    ? new Date(cvFile.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-2xl font-bold uppercase">Projects</p>
          <p className="text-sm opacity-60">{user.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <a
            href="/admin/projects/export"
            className="rounded-full border border-foreground/20 px-4 py-2.5 text-sm no-underline"
          >
            Export CSV
          </a>
          <ImportProjects />
          <Link
            href="/admin/projects/new"
            className="rounded-full bg-foreground! text-white! px-5 py-2.5 text-sm no-underline"
          >
            + New project
          </Link>
          <form action={signOut}>
            <button className="bg-transparent! text-foreground! border border-foreground/20 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {notice.imported && (
        <p className="mb-6 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Imported {notice.imported} project{notice.imported === '1' ? '' : 's'} successfully.
        </p>
      )}
      {notice.import_error && (
        <p className="mb-6 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          {notice.import_error}
        </p>
      )}

      <section className="mb-10 rounded-xl border border-foreground/12 bg-white/70 p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-40 font-medium">CV</p>
            <p className="text-sm opacity-60 mt-1">
              {cvUpdatedAt
                ? `Last updated ${cvUpdatedAt}. Linked from the Say Hello section.`
                : 'No CV uploaded yet. The CV link on the site won’t work until you upload one.'}
            </p>
          </div>
          {cvFile && (
            <a
              href="/cv.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-foreground/20 px-4 py-2 text-sm no-underline"
            >
              View CV ↗
            </a>
          )}
        </div>
        <CvUpload hasCv={Boolean(cvFile)} />
      </section>

      {projects.length === 0 ? (
        <p className="opacity-60 text-sm">
          No projects yet. Click “New project” to add your first one.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 border-y border-foreground/10">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center gap-4 py-3">
              <div className="relative w-16 h-12 shrink-0 bg-neutral-200 rounded overflow-hidden">
                {p.cover_image && (
                  <Image
                    src={p.cover_image}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs opacity-50 truncate">/{p.slug}</p>
              </div>
              <span
                className={`text-xs uppercase px-2 py-1 rounded ${
                  p.published
                    ? 'bg-green-100 text-green-800'
                    : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {p.published ? 'Published' : 'Draft'}
              </span>
              <Link
                href={`/admin/projects/${p.id}/edit`}
                className="text-sm no-underline px-3"
              >
                Edit
              </Link>
              <DeleteButton id={p.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

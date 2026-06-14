import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllProjectsForAdmin } from '@/lib/projects';
import { signOut } from './actions';
import DeleteButton from './DeleteButton';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const projects = await getAllProjectsForAdmin();

  return (
    <div className="min-h-screen bg-background px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-2xl font-bold uppercase">Projects</p>
          <p className="text-sm opacity-60">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
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

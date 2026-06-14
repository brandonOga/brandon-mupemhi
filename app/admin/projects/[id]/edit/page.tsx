import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProjectById } from '@/lib/projects';
import ProjectForm from '../../../ProjectForm';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <div className="min-h-screen bg-background">
      <ProjectForm project={project} />
    </div>
  );
}

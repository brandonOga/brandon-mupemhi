'use client';

import { importProjects } from './actions';

export default function ImportProjects() {
  return (
    <form action={importProjects} className="flex items-center gap-2" onSubmit={(event) => {
      if (!confirm('Import projects? Matching slugs will be updated.')) event.preventDefault();
    }}>
      <label className="rounded-full border border-foreground/20 px-4 py-2.5 text-sm cursor-pointer">
        Choose CSV
        <input name="projects_file" type="file" accept="text/csv,.csv" required className="sr-only" />
      </label>
      <button type="submit" className="bg-transparent! text-foreground! border border-foreground/20 text-sm">Import</button>
    </form>
  );
}

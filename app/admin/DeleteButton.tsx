'use client';

import { deleteProject } from './actions';

export default function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteProject}
      onSubmit={(e) => {
        if (!confirm('Delete this project? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="bg-transparent! text-warning! text-sm px-0">
        Delete
      </button>
    </form>
  );
}

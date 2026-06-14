// Bundled fallback project list. Used only when Supabase isn't configured yet
// (or returns nothing), so the site keeps working during the migration. Once
// Supabase has rows, these are ignored. Cover images are served from /public.

export type FallbackProject = {
  slug: string;
  name: string;
  description: string;
  cover_image: string;
};

export const fallbackProjects: FallbackProject[] = [
  { slug: 'ferrari',      name: 'Ferrari',      description: 'Premium automotive design', cover_image: '/images/ferrari.jpg' },
  { slug: 'alfa-romeo',   name: 'Alfa Romeo',   description: 'Timeless Italian elegance', cover_image: '/images/alfa-romeo.jpg' },
  { slug: 'red-bull',     name: 'Red Bull',     description: 'Dynamic brand presence',    cover_image: '/images/red-bull.jpg' },
  { slug: 'aston-martin', name: 'Aston Martin', description: 'Luxury craftsmanship',      cover_image: '/images/aston-martin.jpg' },
  { slug: 'mercedes',     name: 'Mercedes',     description: 'Engineering excellence',    cover_image: '/images/mercedes.jpg' },
];

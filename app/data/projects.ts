// Bundled fallback project list. Used only when Supabase isn't configured yet
// (or returns nothing), so the site keeps working during the migration. Once
// Supabase has rows, these are ignored. Cover images are served from /public.

export type FallbackProject = {
  slug: string;
  name: string;
  description: string;
  cover_image: string;
  role: string;
  tags: string[];
  year: string;
};

export const fallbackProjects: FallbackProject[] = [
  { slug: 'ferrari', name: 'Ferrari', description: 'Premium automotive design', cover_image: '/images/ferrari.jpg', role: 'Designer', tags: ['UI/UX'], year: '2026' },
  { slug: 'alfa-romeo', name: 'Alfa Romeo', description: 'Timeless Italian elegance', cover_image: '/images/alfa-romeo.jpg', role: 'Designer', tags: ['UI/UX'], year: '2026' },
  { slug: 'red-bull', name: 'Red Bull', description: 'Dynamic brand presence', cover_image: '/images/red-bull.jpg', role: 'Designer', tags: ['UI/UX'], year: '2026' },
  { slug: 'aston-martin', name: 'Aston Martin', description: 'Luxury craftsmanship', cover_image: '/images/aston-martin.jpg', role: 'Designer', tags: ['UI/UX'], year: '2026' },
  { slug: 'mercedes', name: 'Mercedes', description: 'Engineering excellence', cover_image: '/images/mercedes.jpg', role: 'Designer', tags: ['UI/UX'], year: '2026' },
];

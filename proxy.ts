import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next 16's renamed "middleware" convention. Refreshes the Supabase auth
// session cookie on every request and guards the /admin area.
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|woff2?|gltf|bin)$).*)',
  ],
};

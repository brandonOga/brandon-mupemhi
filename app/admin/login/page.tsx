'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <p className="text-2xl font-bold uppercase">Admin</p>
          <p className="text-sm opacity-60">Design By Brandon — dashboard</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
            Supabase isn&apos;t configured yet. Add{' '}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
            <code>.env.local</code>, then restart the dev server. See{' '}
            <code>SUPABASE_SETUP.md</code>.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="uppercase opacity-60">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-foreground/20 bg-white px-3 py-2 outline-none focus:border-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="uppercase opacity-60">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-foreground/20 bg-white px-3 py-2 outline-none focus:border-foreground"
              />
            </label>

            {error && <p className="text-sm text-warning">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-foreground! text-white! disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

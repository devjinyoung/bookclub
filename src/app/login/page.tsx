'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmail } from '@/lib/authClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail({ email, password });
      console.log('Sign in successful');
      router.push('/');
    } catch (err: any) {
      setError(err.message ?? 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to your book club account.</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-200" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 ring-sky-500 focus:border-sky-500 focus:ring-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-200" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 ring-sky-500 focus:border-sky-500 focus:ring-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="mt-2 text-xs text-slate-500">
          Forgot password? <span className="font-medium text-slate-300">Coming soon.</span>
        </p>
        <p className="text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-sky-400 hover:text-sky-300">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

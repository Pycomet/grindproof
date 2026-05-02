'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl border border-green-900 bg-green-950/20 p-8">
            <div className="text-4xl">✓</div>
            <h2 className="mt-4 text-xl font-bold text-zinc-50">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-zinc-300">
              We sent you a password reset link. Click it to set a new password.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand/80 transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" href="/" />
          <p className="mt-4 text-sm text-zinc-300">
            Reset and get back to it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-zinc-900 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="brand"
            size="lg"
            className="w-full rounded-full"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-400">
          Remember your password?{' '}
          <Link href="/auth/login" className="font-medium text-brand hover:text-brand/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}


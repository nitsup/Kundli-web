'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getSafeRelativeRedirect } from '@/lib/security/redirects';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const copy: Record<AuthMode, { title: string; description: string; submit: string }> = {
  login: { title: 'Welcome back', description: 'Sign in to continue to your private Kundli workspace.', submit: 'Continue' },
  signup: { title: 'Begin your journey', description: 'Create an account for your private Kundli workspace.', submit: 'Create account' },
  forgot: { title: 'Reset your password', description: 'Enter your email and we’ll send instructions if an account matches it.', submit: 'Send instructions' },
  reset: { title: 'Choose a new password', description: 'Set a new password for your Kundli account.', submit: 'Update password' },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string }>();
  const [pending, setPending] = useState(false);
  const supabase = createClient();
  const content = copy[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    setPending(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const next = new URLSearchParams(window.location.search).get('next');
        const safeNext = getSafeRelativeRedirect(next);
        router.replace(safeNext);
        router.refresh();
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: data.session
            ? 'Your account is ready. Redirecting to your dashboard.'
            : 'Check your email to confirm your account before signing in.',
        });
        if (data.session) {
          router.replace('/dashboard');
          router.refresh();
        }
        return;
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'If an account matches that email, reset instructions are on their way.' });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Your password has been updated. You can now sign in.' });
      router.replace('/login');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <Card title={content.title} description={content.description}>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          {mode !== 'reset' ? (
            <Input label="Email" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          ) : null}
          {mode !== 'forgot' ? (
            <Input label="Password" type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          ) : null}
          {message ? (
            <p role="status" className={`rounded-lg px-3 py-2 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {message.text}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={pending}>{content.submit}</Button>
        </form>
        {mode === 'login' ? (
          <div className="mt-4 flex justify-between text-sm">
            <Link href="/forgot-password" className="font-semibold text-[#c2410c]">Forgot password?</Link>
            <Link href="/signup" className="font-semibold text-[#c2410c]">Create account</Link>
          </div>
        ) : null}
        {mode === 'signup' ? <p className="mt-5 text-center text-sm text-[#795548]">Already have an account? <Link href="/login" className="font-semibold text-[#c2410c]">Log in</Link></p> : null}
        {mode === 'forgot' || mode === 'reset' ? <p className="mt-5 text-center text-sm"><Link href="/login" className="font-semibold text-[#c2410c]">← Back to login</Link></p> : null}
      </Card>
    </div>
  );
}

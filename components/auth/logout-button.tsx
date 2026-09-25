'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setPending(false);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={pending} className="text-sm font-semibold text-[#7f1d1d] hover:text-[#c2410c] disabled:opacity-60">
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

import { redirect } from 'next/navigation';

import { getAuthenticatedUser, createServerSupabaseClient } from './server';
import type { UserRole } from '@/lib/domain/types';

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return user;
}

export async function requireRole(roles: UserRole[], destination: string) {
  const user = await requireAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data || !roles.includes(data.role as UserRole)) {
    redirect(destination);
  }

  return { user, role: data.role as UserRole };
}

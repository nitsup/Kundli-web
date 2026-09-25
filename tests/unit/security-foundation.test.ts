import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/001_foundation_schema.sql'),
  'utf8'
);
const hardeningMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/002_auth_security_hardening.sql'),
  'utf8'
);

describe('security foundation contracts', () => {
  it('enables RLS on every foundation table and has no public allow-all policy', () => {
    for (const table of ['profiles', 'birth_profiles', 'pandits', 'clients', 'reports', 'ai_usage', 'audit_logs']) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
    expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });

  it('provisions profiles from Supabase Auth and restricts Data API grants', () => {
    expect(hardeningMigration).toContain('create trigger on_auth_user_created');
    expect(hardeningMigration).toContain('revoke all on table');
    expect(hardeningMigration).toContain('from anon');
    expect(hardeningMigration).toContain('grant select, update on table public.profiles to authenticated;');
  });

  it('only creates the client birth-profile index when the deployed column exists', () => {
    expect(hardeningMigration).toContain("column_name = 'client_id'");
    expect(hardeningMigration).toContain(
      "create index if not exists birth_profiles_client_id_idx on public.birth_profiles(client_id)"
    );
  });

  it('disables row-policy recursion in the admin helper', () => {
    expect(migration).toContain('set row_security = off');
  });

  it('keeps role assignment outside ordinary client permissions', () => {
    expect(migration).toContain('prevent_profile_role_change');
    expect(hardeningMigration).toContain('create or replace function public.prevent_profile_role_change()');
    expect(hardeningMigration).toContain('drop trigger if exists profiles_prevent_role_change');
    expect(hardeningMigration).not.toContain('grant insert on table public.profiles');
    expect(hardeningMigration).not.toContain('grant update on table public.pandits');
  });
});

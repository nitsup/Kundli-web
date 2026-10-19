# Deployment and database migration workflow

## Current repository facts

- The GitHub repository is `nitsup/Kundli-web`; the default branch is `master`.
- The Next.js application and its package/lock files are at the repository root.
- Database migrations are stored in `supabase/migrations/`.
- The repository currently has migrations `001_foundation_schema.sql`, `002_auth_security_hardening.sql`, and `003_fix_profile_rls_recursion.sql`.
- There is no tracked `supabase/config.toml`, Supabase CLI dependency/script, GitHub Actions workflow, `vercel.json`, or repository command that applies database migrations.
- The GitHub branch is not protected and there are no GitHub Actions workflows in the repository.
- Vercel and Supabase project settings are external to this repository. Their connected repository, production branch, environment variables, automatic deployment switches, and migration behavior must be verified in their dashboards.

The repository therefore identifies where schema changes are recorded, but does not prove which external system currently applies them.

## Responsibility boundaries

```text
                         ┌─> Vercel: Next.js build and application deployment
GitHub: source of truth ─┤
                         └─> Supabase: PostgreSQL, Auth, RLS, and schema migration target
```

- **GitHub** stores application source and ordered migration files. `master` is the repository default branch.
- **Vercel** should build and deploy the application only. No repository configuration delegates database migration execution to Vercel.
- **Supabase** hosts the database and Auth. Migration ownership/deployment automation is not established by the repository files and needs dashboard verification.

## Migration inventory and safety

| Repository migration | Purpose | Replay risk if run as raw SQL again | Remote history/schema |
|---|---|---|---|
| `001_foundation_schema.sql` | Foundation enum, tables, constraints, RLS, functions, triggers, and policies | Not a rerunnable script. `create type public.app_role` has no existence guard; triggers and policies are also created without guards. Several tables use `if not exists`, which does not make the whole migration safe to replay. | Not verified |
| `002_auth_security_hardening.sql` | Auth profile trigger, role-change trigger, indexes, grants, and function privileges | Contains some guarded/replacement DDL, but is a migration, not a general replay script. Its operations must not be manually rerun to repair history. | Not verified |
| `003_fix_profile_rls_recursion.sql` | Replaces the admin-check function and revokes its grants | Uses replace/revoke operations, but must still be tracked/applied through the migration system, not manually replayed. | Not verified |

The earlier `type "app_role" already exists` error is evidence that the enum existed when that SQL was run. It does **not** establish the current remote migration ledger, whether the original script partially applied, or whether the current schema matches all three files. Treat drift as **suspected, not confirmed** until remote history and schema are inspected.

## Required preflight before applying any production migration

1. In the Supabase Dashboard, record whether GitHub Integration is enabled, the connected repository/branch/working directory, whether “Deploy to production” is enabled, whether automatic branching is enabled, and whether integration applies migrations.
2. Record Vercel’s connected repository, production branch, Root Directory, build/install commands, and production environment variable names (never copy secret values into logs or documentation).
3. Confirm whether Supabase GitHub Integration already applies production migrations. Do not enable a second migration applier.
4. From an authorized operator machine with the Supabase CLI and correctly linked project, run the read-only inspection:

   ```powershell
   supabase migration list --linked
   ```

5. Compare each migration version in the local list with the remote list. Inspect the remote schema using a reviewed schema diff or dump. Do not run `db push`, migration repair, `db pull`, or SQL Editor scripts until the result and intended workflow are understood.

If migration history is inconsistent, stop. Record the exact version, local/remote status, and schema evidence. A migration repair is a state change and requires explicit approval; do not mark a migration applied just to bypass an error. A schema pull/diff may create local files and must be reviewed before committing. Neither operation should be treated as proof that the remote ledger is repaired.

## Future database change workflow

The migration files in `supabase/migrations/` are the canonical history for future schema changes. Never edit or copy an already deployed migration to represent a new change.

After the external integration settings and current migration history are verified, use this controlled workflow:

1. Create a new timestamp-ordered migration from the initialized Supabase project:

   ```powershell
   supabase migration new descriptive_change_name
   ```

2. Write only the new schema change in that file. Review ownership, RLS, grants, foreign keys, and deletion behavior.
3. Validate against a disposable local Supabase database/project. Local `db reset` is destructive to that local database; never point it at production. Run project security/database tests where available.
4. Open a pull request and review the SQL and its impact. Do not place production credentials in GitHub source or workflow logs.
5. Merge approved source and migration files to `master`.
6. The recommended single production migration applier is a designated release operator using the Supabase CLI after merge. The operator reviews `supabase migration list --linked`, runs `supabase db push --linked --dry-run`, reviews the proposed pending migrations, and only then runs `supabase db push --linked`. Vercel must not apply migrations.
7. Before adopting that CLI workflow, verify that Supabase GitHub Integration is not already applying production migrations. If it is, stop and resolve the duplicate-applier risk with the project owner; do not disable or bypass the existing integration blindly.
8. Let Vercel independently deploy the application from its configured production branch.
9. Verify the applied migration version and application health. Keep the migration history and release record.

This is the recommended target workflow, not a claim about the current external configuration. The production applier cannot be activated until the existing Supabase GitHub settings and migration history have been checked. Until then, do not deploy a schema migration to production.

## Never do this manually

- Do not rerun an old migration in the Supabase SQL Editor.
- Do not modify or rename an already deployed migration.
- Do not use `if not exists` to conceal unknown migration history.
- Do not reset, drop, recreate, or clean up the production database.
- Do not manually change production schema for routine changes.
- Do not run migration repair or mark a version applied without inspected evidence and approval.
- Do not let Vercel and Supabase GitHub Integration both apply the same production migrations.

## Migration-history mismatch diagnosis

Compare three things independently:

1. **Repository:** ordered SQL files and versions in `supabase/migrations/`.
2. **Remote migration history:** `supabase migration list --linked`.
3. **Remote schema:** a read-only inspected schema dump/diff against the intended state.

Matching migration version numbers do not alone prove the remote schema matches the SQL; manually applied SQL may have changed schema without updating the ledger. If any of the three differ, stop production migration deployment and prepare an evidence-based repair proposal. Do not automatically repair the ledger or generate a “baseline” migration.

## Who may deploy production migrations

Only the explicitly designated Supabase migration applier may change production schema. The repository currently has no CI workflow defining that principal. The recommended principal is a designated operator using the Supabase CLI; Supabase GitHub Integration must not simultaneously apply the same production migrations. Until dashboard verification and an owner decision, treat production migration deployment as paused. Vercel deployment permissions do not imply database migration permission.

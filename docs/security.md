# Security and RLS design

## Identity model

- Supabase Auth owns authentication.
- Application profiles map to `auth.users` using the user id.
- Privileged roles such as `pandit` and `admin` are assigned by trusted server-side processes, never by ordinary client requests.
- The migration uses a security-definer `is_admin()` helper for admin checks so policies do not recursively query the protected `profiles` table.
- The helper explicitly disables row-security evaluation for its owner-scoped lookup; migration `003_fix_profile_rls_recursion.sql` repairs the initially applied recursive version.
- Supabase Auth signup provisions a default `user` profile through a database trigger. Role changes and Pandit provisioning remain trusted administrative operations.

## RLS principles

### Users
- Can read and update their own profile.
- Can read/update their own birth profiles.
- Can read their own reports and AI usage records.

### Pandits
- Can read their own pandit profile.
- Can read their own clients.
- Can read authorized birth profiles and reports belonging to their clients.
- Must not access another pandit's client records or reports.

### Admins
- Require explicit administrative access checks in the database and in app logic.
- Never rely on hidden UI elements for security.

## Safeguards

- No secrets in client bundles.
- No raw stack traces in user responses.
- Validate all boundaries: forms, server actions, API routes, and DB writes.
- Keep logs free from passwords, tokens, and protected consultation notes.
- Treat birth and report records as sensitive by default.
- Pandit client access is derived from the `clients.pandit_id` relationship; it is not granted by an identifier supplied by the browser.
- The Data API grants are explicitly revoked from `anon`; `authenticated` receives only the table operations required by the current foundation.

## Foundation 1 hardening

### Redirects

Authentication callback and client-side login redirects use the shared
`lib/security/redirects.ts` validator. It accepts only same-origin relative
application paths and rejects protocol-relative paths, slash/backslash variants,
encoded backslashes, encoded schemes, malformed escapes, whitespace, and control
characters. The server callback remains authoritative.

### Browser headers

`next.config.ts` adds CSP, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, and production HSTS. The CSP allows only
same-origin application resources, inline styles and Next.js bootstrap scripts
required by the current rendering pipeline, and Supabase HTTPS/WebSocket
connections required by Auth/realtime. A nonce-based script policy can replace
`unsafe-inline` when dynamic CSP middleware is introduced.
Production response headers must still be checked at the deployed host.

### Abuse and rate-limit strategy

Public static pages remain cacheable and do not perform rate-limit database
lookups. Supabase Auth retains responsibility for authentication abuse limits.
Future calculation, AI, report, and matching endpoints must apply stricter
per-user quotas and duplicate-work protection at the server boundary before
expensive work begins. No Redis, queue, or third-party rate-limit service is
needed for the current routes.

### Caching and deployment

Public informational routes may be statically rendered. Authenticated layouts and
all future private data routes must remain dynamic and must not use public caching.
The platform-neutral recommendation is a managed Next.js deployment with HTTPS
and environment variables connected to Supabase; Cloudflare is optional for a
later custom-domain/WAF requirement and is not required by the current app.

### Security status

| Area | Status | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Authentication and route authorization | Implemented | Supabase SSR, `getUser()`, protected layouts | Live OAuth/password-flow verification |
| Redirect safety | Implemented | Shared validator and negative tests | None identified locally |
| RLS and grants | Migration-defined | Migrations 001-003 | MANUAL VERIFICATION REQUIRED in Supabase |
| Secrets | Repository-checked | `.env*` ignored; no tracked service key | Rotate any externally exposed credential |
| Browser headers | Repository-defined | `next.config.ts` | MANUAL VERIFICATION REQUIRED on deployed responses |
| Dependency security | Verified locally | `npm audit` | Re-run in CI |
| Rate limiting | Strategy defined | This document | Required before expensive endpoints exist |

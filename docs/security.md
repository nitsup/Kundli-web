# Security and RLS design

## Identity model

- Supabase Auth owns authentication.
- Application profiles map to `auth.users` using the user id.
- Privileged roles such as `pandit` and `admin` are assigned by trusted server-side processes, never by ordinary client requests.

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

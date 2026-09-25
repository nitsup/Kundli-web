# Kundli-Web

Kundli-Web is an architecture-first foundation for a future astrology, Panchang, Pandit workflow, and admin platform. The repository intentionally implements the core platform contracts without calculating astrology results or building finished business features.

## Current status

Implemented:

- Next.js App Router with route groups for public, auth, dashboard, pandit, and admin flows
- TypeScript, Tailwind, and UI primitives
- Supabase SSR client/server foundation
- Validation, timezone, logging, and error abstractions
- Domain model and database migration skeleton with RLS-oriented design
- Documentation and tests for the initial foundation contracts

Deferred:

- actual astrology calculations
- Panchang calculation engine
- matching engine
- AI provider integration
- payment system
- PDF/report rendering

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

```bash
npm run lint
npm run test
npm run build
```

## Environment

The public Supabase variables are defined in `.env.example`. Secret or provider-specific values are intentionally reserved for server-only configuration and must be added manually by the developer in a local environment.

## Documentation

See the `docs/` folder for architecture, domain modeling, security, and astrology-engine abstraction notes.

## Supabase and security

The project uses Supabase Auth plus server-side SSR session handling. Database access is intentionally designed around ownership and role-based constraints, with RLS policies conceptually documented in `docs/security.md` and the migration in `supabase/migrations/001_foundation_schema.sql`.

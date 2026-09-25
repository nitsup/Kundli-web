# Architecture overview

Kundli-Web is intentionally structured as a domain-first foundation for a serious astrology product. The repository separates user-facing routes, domain contracts, database security concepts, and future provider integrations.

## Layers

1. App and route groups
   - public pages
   - auth pages
   - dashboard pages
   - pandit pages
   - admin pages
2. Domain abstractions
   - astrology engine contracts
   - Panchang contracts
   - matching contracts
   - AI explanation boundary
   - entitlement usage patterns
3. Platform foundation
   - Supabase authentication and session handling
   - environment config
   - validation
   - logging
   - error handling
4. Future providers
   - astrology calculation provider
   - AI model provider
   - payment provider

## Phase 3 product foundation

The `/kundli` workspace now exposes navigation and honest route shells for chart,
planet, house, nakshatra, dasha, yoga, dosha, interpretation, timeline, reports,
sharing, and assistant boundaries. `lib/domain/types.ts` defines the contracts and
`lib/validation/schemas.ts` validates inputs at the boundary. The UI deliberately
uses unavailable and empty states until a verified calculation provider is connected;
it never invents astrology results. `/pandit/clients`, `/pandit/consultations`,
`/pandit/reports`, and `/pandit/settings` provide the corresponding role-gated
navigation targets. Educational content starts at `/learn` and `/methodology`.

## Design goals

- no fake calculations and no placeholder data disguised as production output
- secure domain ownership boundaries from the beginning
- provider abstraction over actual computation engines
- route structure that supports future feature groups without reorganization

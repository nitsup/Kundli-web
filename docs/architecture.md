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
4. Calculation pipeline
   - provider-neutral astrology calculation engine
   - astronomical provider adapter
   - Swiss Ephemeris as the selected astronomical foundation
   - application-owned Vedic calculation and rule layers
5. Other future providers
   - AI model provider
   - payment provider

## Calculation provider decision

Swiss Ephemeris is the selected technical astronomical provider. It supplies
astronomical primitives; it is not the complete Vedic astrology engine. The
application owns higher-level Vedic transformations and rules, including Rashi,
Nakshatra, Pada, house interpretation, divisional charts, Dashas, Yogas, Doshas,
Panchang, Muhurat, matching, and interpretation as those phases are approved.

The provider remains behind the existing `AstrologyCalculationEngine` contract
and the server-side astronomical-provider adapter:

```text
Birth Profile
    ↓
Calculation Input snapshot
    ↓
Calculation Configuration
    ↓
Astrology Calculation Engine
    ↓
Astronomical Provider Adapter
    ↓
Swiss Ephemeris
    ↓
Provider-neutral Astronomical Result
    ↓
Vedic Primitive Classification
    ↓
Structured Vedic Calculation Result
```

Pages, UI, interpretation, and future AI code must not call Swiss-specific APIs
directly. Swiss-specific calls are isolated in
`lib/astrology/swiss-ephemeris-provider.ts`, using
`@swisseph/node@1.3.1`. The adapter returns provider-neutral astronomical
positions and angles. The application-owned `lib/astrology/vedic-primitives.ts`
then classifies the D1 chart using methodology version
`kundli-vedic-core-v1`: sidereal Lahiri, True Node, Whole Sign, canonical Rashi
and Nakshatra/Pada datasets, and the approved seven-planet dignity facts.
Rahu/Ketu and outer planets have no inferred classical dignity; outer planets
do not alter classical sign rulership. The provider never assigns Vedic
classifications or houses. Later Vedic systems and product calculations remain
out of scope.

## Reproducibility and runtime boundary

A calculation must use a normalized, immutable snapshot rather than reading a
mutable birth-profile row during calculation. The existing contracts carry the
input, configuration, and version fields. Future results must identify the
birth date/time, normalized UTC instant, coordinates, timezone and its source,
configuration (including sidereal/ayanamsha, node type, and house system),
provider/version, ephemeris source/version, and methodology/rules version.
Foundation 3 contracts remain the source of truth and were extended additively
for UTC and timezone-offset snapshot metadata.

Swiss integration uses a native Node binding and bundled ephemeris assets.
Calculation code must remain server-side; Edge Runtime compatibility must not
be assumed. Local Node integration has been verified, but Vercel native binary
compatibility and ephemeris asset tracing remain unverified. Validate the real
deployment runtime and data packaging before production use. This does not
justify a separate calculation service, container platform, queue, or cache.

## Licensing status

Kundli-Web is licensed under AGPL-3.0-only; see the repository
[LICENSE](../LICENSE). The astronomical dependency is the AGPL-licensed Swiss Ephemeris Free Edition.
Public distribution or service activation remains subject to final licensing
review; no purchase, signature, or legal approval is claimed.

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

# Astrology engine abstraction

## Goal

The repository defines an engine boundary so astronomical calculations can be
provided without coupling the application to a provider API.

## Selected astronomical provider

**Swiss Ephemeris Free Edition** is the selected astronomical foundation,
integrated through the `@swisseph/node` adapter. It supplies astronomical
primitives, not a complete Vedic astrology system. Kundli-Web owns the
higher-level transformations and rules. This phase implements sidereal D1
planetary positions, True Node/Rahu-Ketu, Lahiri ayanamsha, and Whole Sign
houses, along with Rashi, Nakshatra, and Pada placement. It does not implement
divisional charts, Yogas, Doshas, Panchang, Muhurat, matching, or
interpretation.

The project and provider are AGPL-3.0 licensed/intended respectively. Public
distribution and service activation remain subject to final licensing review;
no purchase, signature, or legal approval is claimed.

## Provider boundary

`lib/astrology/engine.ts` defines the existing
`AstrologyCalculationEngine` contract. Its implementation routes through one
server-side astronomical provider adapter:

```text
AstrologyCalculationEngine
        ↓
AstronomicalProvider
        ↓
SwissEphemerisProvider
```

`lib/astrology/swiss-ephemeris-provider.ts` contains all Swiss-specific calls
and returns the provider-neutral `AstronomicalResult` contract. Its positions
contain raw tropical/sidereal longitudes, latitude, distance, speed, and
provider flags; its angles contain raw tropical/sidereal Ascendant and MC
longitudes plus ayanamsha. It does not assign Rashi, Nakshatra, Pada, dignity,
or D1 houses.

`lib/astrology/vedic-primitives.ts` owns canonical Vedic datasets and pure
classification functions. The calculation engine combines astronomical data
with those functions to produce the structured D1 chart. Routes, pages, UI,
interpretation, and AI must not import Swiss APIs directly.

The adapter records provider/version, bundled ephemeris file hashes,
calculation flags, sidereal mode, ayanamsha, and node type. It rejects missing
ephemeris data and returned planetary flags that indicate fallback from Swiss
files to Moshier.

The selected wrapper is `@swisseph/node@1.3.1`. Local Node verification passed;
compatibility with Vercel/production native packaging and ephemeris asset
tracing remains unresolved and must be tested before production activation.

## Input contract

The engine accepts the Foundation 3 `CalculationInput` snapshot and a
`CalculationConfiguration`; it must not read database rows or depend on a
mutable birth-profile record. A historical calculation must remain tied to the
input snapshot used when it was calculated.

Birth date and local time are strict Gregorian civil values. Time accepts
`HH:mm` (seconds are then exactly `00`) or `HH:mm:ss`; fractional seconds are
not accepted. Years must be 0001–9999. Timezone is a required IANA identifier;
abbreviations such as `IST` are not resolved by guesswork. DST gaps are
rejected, and repeated local times require an explicit earlier/later choice.
Coordinates remain unrounded numeric values with explicit location/timezone
sources.

The input snapshot records the Node timezone-database version used to resolve
the local time, as well as the selected UTC instant and offset. When validating
a snapshot created under a different tzdb version, validation checks the
recorded local-time/offset/UTC arithmetic instead of silently re-resolving it
using today's timezone rules. This preserves the original instant but does not
claim that historical IANA rules are universally authoritative; the available
historical data is supplied by the runtime's ICU/tzdb.

There is no configured geocoder or place-resolution service. The domain
contract distinguishes a resolved place, ambiguous candidates, and no result,
and can carry a canonical place ID, resolver version, and confidence when a
real resolver is later selected. Until then, coordinates and timezone must be
provided explicitly with their source; the application must not infer them
from a city label. Existing database defaults are not evidence that a stored
timezone was explicitly confirmed by a user.

## Output contract

The result is the Foundation 3 `CalculationResult`, with the input snapshot,
configuration, provider/engine versions, and structured D1 chart.
`createCalculationInput` resolves local birth time to a UTC instant and offset;
ambiguous daylight-saving folds require an explicit earlier/later choice and
nonexistent local times are rejected. The chart preserves raw provider
longitudes alongside normalized sidereal longitudes and carries structured
Rashi, Nakshatra/Pada, dignity, Ascendant, and Whole Sign house data.
`kundli-vedic-core-v1` identifies the classification methodology. No
calculation persistence or database schema was added.

## D1 chart and Whole Sign houses

`D1Chart` is the D1-specific refinement of the structured chart contract.
The chart records the Ascendant Rashi and its full sidereal classification,
the twelve sequential Whole Sign houses, and each supported astronomical
body's Rashi, house, retrograde state, raw provider longitude, and normalized
sidereal longitude. Each house records its Rashi identifier, classical lord,
sign-boundary longitude range, and occupants. The engine and schemas validate
that each house sequence, lord, planetary house, and occupant list agree.

Whole Sign house 1 is the Ascendant's Rashi; house 2 is the next Rashi in
zodiacal order, continuing through house 12. The existing canonical Rashi
dataset is the sole source of sign names, boundaries, and classical lords.
These house ranges are complete Rashi boundaries, not quadrant/Bhava cusps.

The chart type contract recognizes D1, D2, D3, D4, D7, D9, D10, D12, D16,
D20, D24, D27, D30, D40, D45, and D60 for later extension. Only D1 is
calculated and accepted in a calculation result in this phase; no divisional
rules or placeholder charts are generated.

## Provider abstraction

The interface is defined in `lib/astrology/engine.ts` and is implemented by the
Swiss adapter plus the Vedic classification layer. Swiss calculations are
synchronous internally to avoid interleaving the provider's process-global
sidereal mode. The engine's public calculation API remains unchanged.

## Vedic methodology: `kundli-vedic-core-v1`

These are explicit Kundli-Web conventions for reproducibility, not claims that
one tradition is universally correct:

- **Zodiac and ayanamsha:** sidereal zodiac with Lahiri/Chitrapaksha.
- **Nodes:** True Lunar Node for Rahu; Ketu is derived as the opposite point.
- **D1 houses:** Whole Sign. The Ascendant's Rashi is house 1 and each following
  Rashi is the next house. Stored house start/end values are sign boundaries,
  not quadrant cusps.
- **DST:** ambiguous local times require an explicit earlier/later fold choice;
  nonexistent local times are rejected.
- **Rashi:** twelve equal 30-degree signs with half-open `[start, end)`
  intervals. The longitude is normalized before classification; exact sign
  boundaries belong to the following sign.
- **Nakshatra and Pada:** 27 equal Nakshatras of 13°20′, each divided into four
  equal 3°20′ Padas. The ordered dataset and boundary values are canonical in
  `vedic-primitives.ts`; classification uses unrounded numerical longitude.
  The canonical zodiac order is Ashwini, Bharani, Krittika, Rohini, Mrigashira,
  Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni,
  Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha,
  Uttara Ashadha, Shravana, Dhanishtha, Shatabhisha, Purva Bhadrapada,
  Uttara Bhadrapada, Revati. Their lords repeat the nine-Nakshatra Vimshottari
  sequence Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury three
  times. Start boundaries are inclusive and end boundaries exclusive: an exact
  Nakshatra or Pada boundary belongs to the following interval. Longitude is
  normalized to `[0, 360)` before classification. If floating-point addition
  of a tiny negative remainder rounds to exactly 360, it is canonicalized to
  0; no epsilon is used to shift other boundaries.
- **Rashi lords:** classical seven-planet assignments only. Uranus, Neptune,
  and Pluto are not Rashi lords.
- **Classical dignity:** the seven-planet exaltation, debilitation, own-sign,
  and Moolatrikona assignments in `CLASSICAL_DIGNITY_DATASET` are the approved
  v1 dataset. Moolatrikona ranges are start-inclusive/end-exclusive.
- **Dignity precedence:** debilitated sign, then an in-range Moolatrikona,
  then exaltation sign, then own sign, then neutral. Moolatrikona takes
  precedence over sign-level exaltation when those definitions overlap and over
  ordinary own-sign status. No degree of exaltation is inferred.
- **Rahu/Ketu and outer planets:** they receive longitude classifications and
  house placement as applicable, but classical dignity is `not_applicable`.
  Outer planets remain astronomical bodies and do not alter classical rulership.

Changing these conventions requires an explicit methodology/version decision;
results identify the version used. Dasha follows its separate versioned
methodology below. Yoga/Dosha now use the narrow, independently versioned rule
set documented below. Strength, transits, divisional charts, predictions, and
interpretation remain unimplemented.

## Phase 5: Nakshatra and Pada contract

The existing Nakshatra classifier consumes the same normalized sidereal
longitude used for Rashi; it does not inspect tropical longitude. The one
canonical `NAKSHATRA_DATASET` provides the 27 zodiac-ordered names, 1-based
indices, lords, Nakshatra intervals, and four Pada boundaries for each
interval. Both a planet's `PlanetPosition.nakshatra` and the Ascendant's
`ascendantNakshatra` use this classifier. The chart-level `nakshatra` is the
Moon's placement and repeats its exact normalized longitude, Nakshatra-relative
position, Pada, and Nakshatra lord for downstream consumers.

All classified astronomical bodies in the current model (Sun, Moon, Mars,
Mercury, Jupiter, Venus, Saturn, Rahu, Ketu, Uranus, Neptune, and Pluto) receive
Nakshatra/Pada classification. This does not give outer planets classical
lordship or dignity. The Moon fields are sufficient inputs for a later Dasha
phase; the Vimshottari implementation is described below.

The 108 Pada intervals are half-open `[start, end)`. Exact boundaries select
the interval beginning there, including the 0° wrap to Ashwini Pada 1. Values
are classified before any display formatting; no epsilon or longitude
rounding is applied. For negative values so small that adding 360 rounds to
exactly 360 in IEEE-754, normalization maps the result to 0 to preserve the
canonical `[0, 360)` range; this representational wrap rule is tested.

## Phase 6: Vimshottari Dasha

The calculation result includes a structured Vimshottari result, derived from
the D1 chart's existing Moon `PlanetPosition` and chart-level Moon Nakshatra.
The Dasha layer verifies those values agree and does not recalculate the Moon
or classify another Nakshatra. The Moon's Nakshatra lord selects the starting
Mahadasha; its exact normalized sidereal longitude determines progress through
that Nakshatra and the elapsed/remaining starting Mahadasha.

The canonical cyclic sequence is Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7,
Rahu 18, Jupiter 16, Saturn 19, Mercury 17 years, totaling 120 years.
Nakshatra progress is `(Moon longitude - Nakshatra start) / Nakshatra width`;
elapsed Mahadasha duration is full duration multiplied by this progress, and
the birth balance is the remainder. Exact Nakshatra starts yield zero progress
and full balance. The half-open Phase 5 classifier assigns an exact Nakshatra
end to the following Nakshatra, so the starting lord transitions there. The
internal progress helper also defines the old interval's exact-end value as
progress 1 / zero remaining for boundary verification.

The explicit Dasha year convention is a Julian year of 365.25 days
(31,557,600 seconds). It is a project reproducibility choice, not a universal
Vedic convention. Durations and instants are accumulated as integer
microseconds; fractional progress is rounded to the nearest microsecond once
when converted into elapsed duration. Antardasha boundaries use cumulative
integer-ratio partitioning, so their durations sum exactly to their parent
Mahadasha segment. ISO UTC timestamps are calendar representations rounded
down to milliseconds; the epoch-microsecond fields preserve exact calculated
boundaries.

Each Mahadasha contains Antardashas in the same cyclic order, beginning with
its own lord. A full Antardasha duration is Mahadasha duration multiplied by
the Antardasha lord's years divided by 120. At birth, the first Mahadasha and
its Antardasha sequence are clipped at the birth instant: the current
Antardasha appears first with only its remaining portion in the birth-relative
timeline, followed by later Antardashas in that Mahadasha. Its structured
contract separately preserves the full rule-defined duration and the elapsed
and remaining portions at birth. Subsequent Mahadashas contain all nine full
Antardashas. The returned timeline contains one ordered pass through the nine
Mahadasha lords, beginning with the birth balance; its elapsed calendar span
is therefore 120 years less the elapsed part of the starting Mahadasha.

The result validator independently checks the Moon longitude/Nakshatra
classification, starting and cyclic lord sequences, canonical Mahadasha
durations, exact Antardasha partitions and parent anchoring, and the
birth-clipped balances. This protects the structured contract from internally
plausible but shifted or inconsistently classified timelines; it does not
change the selected Dasha methodology.

The Dasha method is versioned as `vimshottari-v1` separately from the Phase 3
Vedic classification methodology. This is mathematical/unit-test validation,
not reference-chart validation. No Pratyantardasha, UI, persistence, alternate
Dasha system, or external reference-chart claims are included.

## Phase 6.5 carry-forward integrity gate

The Phase 7 carry-forward audit rechecked full versus birth-clipped Mahadasha
and Antardasha durations, canonical cycles, elapsed-time selection, schema
invariants, and integer-microsecond boundaries. The gate passed without a
calculation defect or methodology change. Regression coverage now explicitly
checks exact, immediately-before, and immediately-after Antardasha boundaries
for all nine possible starting Mahadasha lords, as well as early, middle, and
late positions in each.

## Phase 7: Yoga/Dosha rule layer

The deterministic D1 rule set is versioned as `vedic-rules-v1`. It evaluates
only:

- **Budha-Aditya Yoga:** Sun and Mercury have the same canonical sidereal
  Rashi. This is sign-based co-occupancy, not an angular-orb conjunction.
  Combustion, degree distance, aspects, dignity, and cancellation are not
  conditions in this rule version.
- **Chandra-Mangala Yoga:** Moon and Mars have the same canonical sidereal
  Rashi. This is sign-based co-occupancy; aspects and degree distance are not
  evaluated, and no cancellation condition is defined in this rule version.
- **Mangala Dosha (Ascendant-based):** Mars occupies Whole Sign house 1, 2, 4,
  7, 8, or 12 from the D1 Ascendant. Only the Ascendant reference is used; Moon
  and Venus reference charts and variants omitting/adding houses are outside
  this version. The selected cancellation is Mars having the canonical
  `own_sign`, `moolatrikona`, or `exalted` dignity state. Base placement,
  cancellation evidence, whether cancellation applied, and final detection
  remain separate fields.

These are explicit Kundli-Web calculation conventions, not claims of universal
traditional authority. Same-Rashi rules are preferred over degree-based orb
thresholds or aspect-derived variants here because they use the approved
half-open Rashi classifier and are reproducible without choosing an
unsupported orb or aspect scheme. For Mangala Dosha, Ascendant-based Whole Sign
houses reuse the authoritative D1 mapping; Moon/Venus references and broader
regional cancellation lists would introduce additional methodology choices.
The limited dignity cancellation deliberately reuses the approved Mars
dignity assessment; it is not a claim that other cancellation traditions are
invalid.

Each machine-readable rule definition records its stable ID, display name,
category, methodology version, required planets/houses, base condition, and
cancellation rules. Results include `baseConditionMet`, `detected`,
`cancellationApplied`, and structured condition/cancellation evidence with
planet placements, Rashi IDs, longitudes, houses, Ascendant Rashi, or dignity
as applicable. The calculation result validator recomputes and checks those
values against the versioned D1 chart. No aspects are used by this rule set.

This layer detects only the defined positional conditions. It does not assess
strength, promise, outcomes, life events, compatibility, remedies, or
interpretations. Other Yogas/Doshas, alternative definitions, additional
cancellations, and external-source/reference validation are deferred; changing
the selected rules requires an explicit methodology/version decision.

## Validation requirements

- date must be valid
- time must be valid
- latitude and longitude must be in range
- timezone must be explicit and valid
- input must be server-validated before any calculation is attempted

## Uncertainty handling

Birth time or location inaccuracies should be carried as structured metadata so interpretation layer and UI can explain uncertainty without inventing facts.

## Versioning

A provider version and calculation version are included in each result for
auditability. Database persistence is not part of this phase.

## Runtime and licensing gate

The selected wrapper uses a native binding and bundled ephemeris data. Keep
calculations in a Node server runtime; do not assume Edge Runtime compatibility
or move calculations into browser code. Vercel native binary compatibility and
ephemeris file packaging have not been verified. Do not add a separate service
or infrastructure solely because the provider is native.

The repository's project license is AGPL-3.0-only (see `LICENSE`). Swiss
Ephemeris Free Edition is the selected provider and is included as an AGPL-3.0
dependency. Public service/distribution remains subject to final licensing
review.

## Manual / Independent Verification Register

Automated tests establish that code follows the encoded rules and that
regressions in specified cases are detected. They do not independently prove
the provider's legal interpretation, that methodology constants match a chosen
Jyotisha lineage, or that astronomical output agrees with an independent
authority. No item below is marked independently or production verified
without recorded evidence.

Status meanings: `UNVERIFIED` means the listed independent action is outstanding;
`LOCALLY VERIFIED` means a local runtime check was performed but does not replace
the external/manual action; `INDEPENDENTLY VERIFIED` requires recorded
independent reference comparison; `PRODUCTION VERIFIED` requires evidence
from the deployed production runtime. Status is conservative and identifies
the highest level actually evidenced for each item.

This table is a phase-level summary, not a completed manual audit. The
case-level Phase 8.5 matrix and its 15-fixture ledger are in
[`phase-8.5-manual-verification.md`](./phase-8.5-manual-verification.md);
instructions and evidence template for a reviewer who did not implement the
engine are in [`phase-8.5-human-checklist.md`](./phase-8.5-human-checklist.md).
The detailed matrix is authoritative where its case-specific status is more
conservative than this summary. No independent astronomical comparison,
domain-methodology sign-off, legal review, or target deployment check is
claimed by adding those documents.

| ID | Phase | Subject and current assumption | Automated/local evidence | What it cannot establish | Required manual / independent action | External reference | Status / dependency |
|---|---|---|---|---|---|---|---|
| MV-01 | 1 | Swiss Ephemeris Free Edition is used under AGPL-3.0; wrapper is `@swisseph/node@1.3.1`. | Manifest, provider metadata, and local tests identify the chosen package and behavior. | Whether use, hosting, notices, source-offer obligations, or distribution meet AGPL obligations. | Legal/project-owner review of the exact dependency, upstream license/notices, and intended public-service/distribution model before release. | Upstream Swiss Ephemeris and wrapper license texts; qualified legal review. | `UNVERIFIED`; release gate. |
| MV-02 | 1 | Required Swiss ephemeris files are present and Swiss-file results are required; Moshier fallback is rejected. | Startup checks required files and hashes them; result flags reject Moshier; local integration tests execute the provider. | Completeness/authenticity of packaged data in every target environment or correctness of all returned values. | Inspect packaged assets and flags in each deployment artifact; compare selected results independently. | Swiss Ephemeris distribution/data documentation and independent ephemeris output. | `LOCALLY VERIFIED`; production packaging outstanding. |
| MV-03 | 1 | Native provider integration is server-side; Vercel compatibility is not assumed. | Local Windows build/test exercises the installed binding. | Linux ABI, serverless packaging/tracing, cold starts, runtime restrictions, and data-file availability in Vercel. | Deploy a controlled test build on the actual target; inspect runtime logs, native module loading, file paths, and representative calculations. | Target-provider deployment documentation and production-like environment. | `UNVERIFIED`; deployment gate. |
| MV-04 | 1 | Swiss adapter configuration is Lahiri sidereal, Swiss-file flags, and explicit True Node; Ketu is derived opposite Rahu. | Unit/integration tests check flags, configuration, and Rahu/Ketu relationship. | Upstream API semantics across package versions and agreement with intended provider behavior. | Review wrapper calls/flags and compare provider-returned values against upstream-supported output. | Swiss Ephemeris manual and an independent implementation. | `LOCALLY VERIFIED`; independent semantics review outstanding. |
| MV-05 | 2 | Provider calculates planetary longitudes, Ascendant, Midheaven, and ayanamsha using UTC, coordinates, and configured ephemeris. | Deterministic local integration tests check structured results and provider boundary. | Astronomical accuracy, historical model agreement, or correctness of wrapper angle semantics. | Compare a documented sample set (planets, angles, ayanamsha) with independently generated Swiss Ephemeris/reference charts at selected epochs and locations. | Upstream Swiss Ephemeris library or trusted independent ephemeris with matching settings. | `LOCALLY VERIFIED`; independent fixtures absent. |
| MV-06 | 2 | Local birth civil time resolves through IANA timezone data to UTC; folds require a choice and gaps reject. | Tests cover ordinary times, selected DST folds/gaps, explicit offsets, and tzdb metadata. | Historical timezone database accuracy for every place/date or factual correctness of supplied civil birth time. | Review edge cases for important jurisdictions and birth-record assumptions; capture Node tzdb version for comparisons. | IANA tz database releases and jurisdictional historical records. | `LOCALLY VERIFIED`; historical coverage outstanding. |
| MV-07 | 2 | Coordinates are interpreted as latitude/longitude degrees by the provider. | Range/schema checks and sample local calculation. | Coordinate provenance, datum nuances, location accuracy, or whether the selected place is correct. | Confirm source, order, sign convention, and sample coordinates at provider boundary. | Swiss API docs, geodetic/place source, independent map/reference. | `LOCALLY VERIFIED`; provenance review outstanding. |
| MV-08 | 2 | Raw provider longitude and derived normalized longitude are retained without display rounding before classification. | Boundary, normalization, 0°/360°, and contract tests. | Precision/rounding inside the native wrapper and agreement of raw values with the provider. | Inspect provider precision and compare raw outputs in independent fixtures. | Wrapper/upstream API docs and independent provider output. | `LOCALLY VERIFIED`; independent comparison outstanding. |
| MV-09 | 3 | `kundli-vedic-core-v1` encodes equal Rashis, classical lords, Nakshatras/Padas, dignity tables/precedence, and node/outer-planet conventions. | Tests check code against canonical datasets and boundary rules. | Whether constants and conventions match every tradition or the intended Kundli-Web lineage. | Qualified Jyotisha reviewer verifies each dataset and precedence decision against an explicitly selected reference tradition. | Primary/classical texts or reviewed lineage-specific reference; record editions/sections. | `LOCALLY VERIFIED`; methodology review needed. |
| MV-10 | 4 | D1 uses Ascendant-Rashi Whole Sign houses; canonical Rashi lordship supplies house lords and occupants. | All 12 signs, house sequence, lords, placements, and schema consistency are tested. | Whether Whole Sign is the desired product methodology or charts match a Pandit's convention. | Compare representative D1 charts with an independent implementation configured for sidereal Lahiri, True Node, and Whole Sign. | Independently generated reference charts; document configuration. | `LOCALLY VERIFIED`; external chart comparison outstanding. |
| MV-11 | 4 | D2/D3/etc. are recognized identifiers only; only D1 is calculated. | Configuration rejects unsupported divisional calculation. | No divisional methodology/output is validated because none is implemented. | Do not present identifiers as implemented charts; future work needs rule review and reference fixtures. | Future lineage-specific divisional references. | `LOCALLY VERIFIED`; future implementation blocked until reviewed. |
| MV-12 | 5 | 27 equal Nakshatras (13°20′), four equal Padas, repeated nine-lord order; Moon uses canonical classifier. | All intervals, boundaries, lord order, subdivisions, Moon consistency, and wrap behavior have deterministic tests. | Whether definitions and selected ayanamsha meet an independent tradition/reference chart. | Compare Moon longitudes, all transitions, and sample charts with an independently configured reference; reviewer verifies names/lord order. | Independent Panchang/Jyotisha chart source with settings disclosed. | `LOCALLY VERIFIED`; independent reference outstanding. |
| MV-13 | 6/6.5 | Vimshottari sequence is canonical nine-lord 120-year cycle; year is fixed at 365.25 days. | Integer-microsecond arithmetic, cycle sum, Moon progress, lord rotations, and Antardasha boundaries are tested. | That 365.25 days is the intended lineage/product convention or that dates agree with chosen reference software. | Product/methodology reviewer explicitly approves convention; compare timelines against separately configured reference and explain differences. | Independent Vimshottari calculation with year and boundary conventions recorded. | `LOCALLY VERIFIED`; convention approval/reference check outstanding; never silently change. |
| MV-14 | 6/6.5 | Starting Mahadasha follows Moon Nakshatra lord/progress; Antardashas partition the full Mahadasha then clip at birth; intervals are half-open. | Tests cover all starting lords, exact/adjacent transitions, early/middle/late progress, consistency, and timezone independence. | Traditional/reference-chart correctness and date-display convention. | Review rule interpretation and compare independently calculated birth timelines, balances, and boundaries. | Independent reference charts/software configured for matching conventions. | `LOCALLY VERIFIED`; reference validation outstanding. |
| MV-15 | 7 | `vedic-rules-v1`: same-Rashi Budha-Aditya and Chandra-Mangala; Ascendant Mangala house set 1/2/4/7/8/12; Mars dignity cancellation. | Positive, negative, boundary, cancellation, combination, determinism, evidence, and schema tests verify code against definitions. | Whether definitions/house set/cancellation are intended for the selected lineage; traditions differ. | Qualified reviewer validates intended tradition; compare independent examples and record accepted variants. | Lineage-specific sources or reviewed independent interpretations. | `LOCALLY VERIFIED`; implementation is not traditional validation. |
| MV-16 | 8 | Strength scope is a single transparent Naisargika Bala component for seven classical planets; no Shadbala aggregate is implied. | Lookup/formula, units, ordering, and outputs can be tested exhaustively. | Whether values and unit naming match the intended textual/reference convention. | Reviewer checks source values and intended usage; compare all seven against an independent calculation. | Identified primary/reference source for Naisargika Bala. | `LOCALLY VERIFIED`; methodology/reference review outstanding. |
| MV-17 | 8 | Transit result is provider output at explicit UTC instant using natal configuration; no aspects/forecast rules. | Determinism, explicit-instant use, normalization, offsets, boundaries, and contract invariants can be tested. | Astronomical accuracy at the requested instant or target runtime packaging. | Compare representative transit outputs against independent provider and exercise target deployment. | Independent ephemeris and production-like deployment. | `LOCALLY VERIFIED`; reference and deployment outstanding. |
| MV-18 | 8 | Strength/transit outputs are calculation-layer facts, not interpretations. | Contract tests can reject missing/contradictory fields. | User understanding and whether later consumer code misrepresents results. | Review downstream display/use before release; keep interpretation outside this layer. | Product-owner/manual UX review. | `UNVERIFIED`; no UI is in this phase. |

**No item is currently `INDEPENDENTLY VERIFIED` or `PRODUCTION VERIFIED`.**
Local automated success must not upgrade that status. Update this register
only with the actual source, settings, fixture provenance, reviewer, and target
environment used to perform verification.

## Phase 8: Strength and transit methodology

Phase 8 uses `vedic-strength-transit-v1`; outputs are deterministic and
explicitly requested, and are not interpretations.

### Strength: Naisargika Bala component only

The scope is the seven-planet natural-strength ordering, represented in
Shashtiamsha (virupa) units: Saturn 60/7, Mars 120/7, Mercury 180/7, Jupiter
240/7, Venus 300/7, Moon 360/7, and Sun 60. These are the integer sequence 1
through 7 rupas (60 virupas per rupa), Saturn lowest and Sun highest. Exact
integer numerators over seven are authoritative; decimal virupas are derived
for consumers and do not feed another component. No summation across
undefined components occurs. This is Naisargika Bala only, not Shadbala or a
complete planetary-strength score. Only the seven classical planets are
returned; nodes and outer planets are not assigned this component.

`PlanetaryStrengthResult` is attached to `CalculationResult` and carries the
chart ID, system name, methodology version, and one component record per
classical planet. Each record preserves the natural-strength rank, exact
virupa numerator/denominator, derived virupa value, and unit. The schema
recomputes the canonical table and rejects reordered, missing, duplicate, or
contradictory values.

### Transits: explicit-instant astronomy

Transit input includes an explicit ISO-8601 instant with `Z` or an explicit
offset and a coordinate pair. The offset resolves to a canonical UTC instant;
no system clock, machine timezone, or local-time/DST guess is used. The
existing Swiss provider calculates the same ten planets and True Node as natal;
Ketu is the opposite point. Sidereal Lahiri, Swiss-file requirement, and raw
precision are reused. Results include requested/resolved instants, provider
and ephemeris metadata, UTC Julian day, and raw/normalized longitudes with
Rashi, Nakshatra/Pada, and retrograde data using existing classifiers.

`calculateTransits` returns a standalone `TransitResult` and does not sample
the current clock or mutate a natal chart. Input validation requires a
timestamp with `Z` or explicit offset and in-range coordinates. Equivalent
offset representations resolve to the same UTC instant and provider
calculation. The transit schema checks instant agreement, the complete set of
12 bodies, normalized sidereal classifications, retrograde flags, and the
opposite Rahu/Ketu relationship.

No transit-to-natal aspects, orbs, house overlays, forecasts, or time windows
are implemented. Transit methodology version is
`vedic-strength-transit-v1`.

# Architecture decisions

## ADR-001: Swiss Ephemeris as the astronomical provider

- **Status:** Provider selected and integrated locally; production deployment compatibility unresolved.
- **Decision:** Use Swiss Ephemeris as Kundli-Web's astronomical calculation foundation, behind the existing provider-neutral `AstrologyCalculationEngine` and a single astronomical-provider adapter.
- **Scope:** Swiss Ephemeris supplies astronomical primitives. Kundli-Web owns the Vedic transformations and deterministic domain/rule layers above it. The initial D1 core uses Lahiri/Chitrapaksha, True Node, and Whole Sign houses; it does not implement later calculation systems.
- **Rationale:** The completed isolated technical spike showed that Swiss exposes primitives closer to the product's needs, including planetary positions, nodes, sidereal modes, ayanamsha, houses, Ascendant, MC, and speed. The spike was preliminary local evidence and did not prove deployment compatibility or final methodology correctness.
- **Preserved architecture:** Foundation 3 `CalculationInput`, `CalculationConfiguration`, `CalculationVersion`, `CalculationResult`, `BirthChart`, validation, route boundaries, and provider-neutral engine remain the source of truth.
- **Provider-agnostic areas:** Input and result contracts, application routes, UI, persistence decisions, Vedic rules, interpretation, and downstream product systems must not depend directly on Swiss APIs.
- **Wrapper decision:** `@swisseph/node@1.3.1` is selected for the local integration. Its native packaging and ephemeris asset tracing have not been verified on Vercel.
- **Runtime constraint:** A selected wrapper may require a native Node addon and ephemeris assets. Keep calculations server-side, do not assume Edge Runtime support, and verify on the actual deployment target. This does not justify a separate calculation service or additional infrastructure by itself.

### Licensing status

- **Project license:** GNU Affero General Public License, version 3 (AGPL-3.0-only); see the repository `LICENSE`.
- **Intended provider edition:** Swiss Ephemeris Free Edition under AGPL-3.0.
- **Public release status:** Subject to final licensing review before public distribution or service activation.
- **Integration status:** The AGPL-licensed `@swisseph/node@1.3.1` wrapper and its bundled ephemeris files are integrated locally. Swiss Ephemeris upstream source files were not modified.
- **Not claimed:** No Professional License purchase, legal review, external authorization, or production activation is represented by this decision.
- **Separate decisions:** The technical provider decision and local implementation are recorded; final public-release review and production deployment verification remain outstanding.

### Reproducibility requirements for integration

Calculation results must be traceable to an immutable input snapshot and identify, directly or through versioned metadata:

- birth date and local birth time;
- normalized UTC instant;
- latitude and longitude;
- timezone and timezone/location source;
- calculation configuration;
- sidereal mode and ayanamsha;
- node type and house system where applicable;
- calculation flags;
- provider and provider version;
- ephemeris source/version;
- methodology/rules version.
- timezone database version used to resolve the local civil time.

Missing required ephemeris data must not silently switch the calculation model. The adapter checks for the required bundled files and checks Swiss return flags so Moshier fallback is rejected. No database persistence design is approved by this ADR.

## ADR-002: Vedic D1 methodology and classification boundary

- **Status:** Approved for `kundli-vedic-core-v1`.
- **Configuration:** Sidereal zodiac, Lahiri/Chitrapaksha ayanamsha, True Lunar Node, and Whole Sign D1. These are Kundli-Web reproducibility decisions, not universal claims about all Vedic traditions. No alternate runtime defaults or silent fallback are allowed.
- **Astronomy/Vedic boundary:** The Swiss adapter returns raw provider-neutral astronomical positions and angles. The application-owned Vedic layer derives normalized longitudes, Rashi, Nakshatra/Pada, dignity, Ascendant classification, and Whole Sign house assignments.
- **Rashi:** Twelve equal 30-degree signs with half-open intervals; exact boundaries start the next sign. Rashi lords are the classical seven planets per the canonical dataset. Modern outer planets do not replace classical lords.
- **Nakshatra/Pada:** 27 equal Nakshatras, each 13°20′, with four equal 3°20′ Padas. Classification uses unrounded longitude and explicit half-open boundaries. The Nakshatra-to-lord sequence is represented in the canonical ordered dataset.
- **Classical dignity dataset:** Use the seven-planet exaltation, debilitation, own-sign, and Moolatrikona assignments and ranges listed in `docs/astrology-engine.md` and encoded in `CLASSICAL_DIGNITY_DATASET`. Moolatrikona ranges are start-inclusive and end-exclusive.
- **Dignity precedence:** Debilitated sign → in-range Moolatrikona → exaltation sign → own sign → neutral. Moolatrikona takes precedence over the broad sign-level exaltation designation when they overlap and over ordinary own-sign status. This v1 model does not infer exact exaltation degrees.
- **Rahu/Ketu and outer planets:** These bodies remain in the astronomical result and receive longitude-based Rashi/Nakshatra/Pada classification. Classical dignity is `not_applicable`; no contested node dignity or modern outer-planet rulership is inferred.
- **DST:** Repeated local times require an explicit earlier/later choice; nonexistent local times are rejected. Resolved UTC instant and offset remain part of the calculation input snapshot.
- **Downstream scope:** This methodology versions the inputs to future D1 chart, house-lord, Dasha, divisional-chart, Yoga/Dosha, strength, Panchang, matching, and interpretation work. Those systems are not implemented by this decision.
- **Change control:** Any change to these conventions must be deliberate and versioned; it must not silently alter existing result interpretation.

## ADR-003: D1 chart and Whole Sign house contract

- **Status:** Approved for the current D1 calculation result.
- **D1 structure:** A structured `D1Chart` identifies the Ascendant Rashi, its sidereal placements, twelve houses, and each astronomical body's Rashi, house, and source longitudes. House records contain their Rashi identifier, classical Rashi lord, full-sign longitude range, and occupants.
- **House assignment:** House 1 is the Ascendant Rashi. Every subsequent house advances one Rashi in zodiacal order. A planet's house is derived from its normalized sidereal Rashi relative to the Ascendant Rashi. House lordship reuses the canonical `RASHI_DATASET`; there is no second lord mapping.
- **Boundary and validation:** Sign boundaries use the Phase 3 half-open intervals. Runtime schema validation cross-checks house order/lord/ranges, planet house assignments, house occupants, and body uniqueness against the structured chart.
- **Future chart identifiers:** The shared chart contract recognizes D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, and D60. This is an identifier contract only; this phase calculates D1 and does not populate or infer any divisional chart.
- **Excluded:** No quadrant cusps, Bhava Chalit, alternative house systems, UI formatting, Dasha/Yoga/Dosha, reports, or persistence are added by this decision.

## ADR-004: Calculation input precision and place-resolution boundary

- **Status:** Accepted for the current internal calculation input contract.
- **Timezone input:** Birth calculations require an explicit IANA timezone. Ambiguous abbreviations are not mapped to a guessed region. `HH:mm` means second `00`; `HH:mm:ss` preserves the supplied seconds. Gregorian year `0000`, invalid dates, and impossible local times are rejected. DST gaps are rejected and folds require `earlier` or `later`.
- **Timezone reproducibility:** The input snapshot records the Node timezone-database version, local civil time, selected UTC instant, and resolved offset. Validation of a snapshot from another tzdb version checks its recorded offset arithmetic rather than recomputing it under changed rules. Historical accuracy remains dependent on the runtime timezone data and is not guaranteed by this decision.
- **Place boundary:** `PlaceResolver` returns a resolved candidate, an explicit ambiguous-candidate result, or `not_found`. A resolved candidate may carry canonical identity, resolver/version, and confidence. No geocoder is selected or implemented; the current calculation boundary requires explicit coordinates, timezone, and source metadata and never infers them from a place name.
- **Calculation identity:** A person's display name remains in the immutable input snapshot but is excluded from the deterministic calculation identity because it does not affect astronomical or Vedic values.
- **Known legacy behavior:** The existing foundation database migration gives birth-profile timezone a default of `Asia/Kolkata`. This ADR does not modify that schema or claim that already-stored values were user-confirmed. Removing the database default and classifying legacy rows require a separately reviewed migration decision.
- **Scope:** No provider, methodology, calculation layer, database schema, deployment runtime, or public calculation API is changed by this decision.

## ADR-005: Phase 5 Nakshatra and Pada contract

- **Status:** Accepted for `kundli-vedic-core-v1`.
- **Input:** Classify the precise normalized sidereal Lahiri/Chitrapaksha longitude already present in the D1 astronomy result. Tropical longitudes are not used, and the Swiss configuration is unchanged.
- **Intervals:** Divide 360° into 27 equal 13°20′ Nakshatras and each into four equal 3°20′ Padas. Use 1-based Nakshatra indices and Pada numbers with start-inclusive/end-exclusive intervals; exact boundaries belong to the following interval. Normalize to `[0, 360)` without applying an epsilon or rounding before classification.
- **Canonical data:** `NAKSHATRA_DATASET` is the sole production source for ordered names, intervals, Pada boundaries, and lords. Zodiac order is Ashwini through Revati; the lord assignment follows Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury repeated three times.
- **D1 contract:** Every current astronomical body receives structured Nakshatra/Pada/lord data derived from its sidereal longitude. `D1Chart.nakshatra` is the Moon's placement; the Moon's exact sidereal longitude and Nakshatra-relative position remain available in the existing structured fields.
- **Downstream boundary:** These Moon fields are the inputs consumed by ADR-006. This decision itself does not calculate Vimshottari periods or any balance/date.

## ADR-006: Phase 6 Vimshottari Dasha

- **Status:** Implemented as `vimshottari-v1`; reference-chart validation remains deferred to Phase 10.
- **Driver:** Use the D1 chart's existing Moon normalized sidereal longitude and canonical Moon Nakshatra placement/lord. The Nakshatra lord selects the starting Mahadasha; longitude progress within that same Nakshatra determines elapsed and remaining duration. No other body or independent classification is used.
- **Cycle:** Ketu 7 → Venus 20 → Sun 6 → Moon 10 → Mars 7 → Rahu 18 → Jupiter 16 → Saturn 19 → Mercury 17 years; one canonical cycle totals 120 years.
- **Year convention:** One Dasha year is 365.25 days (31,557,600 seconds), the Julian-year convention. This is an explicit Kundli-Web choice for reproducibility, not a universal rule. A different convention requires a methodology/version change.
- **Precision:** Periods are accumulated using integer microseconds. Nakshatra progress is calculated from unrounded normalized longitude and its exact dataset boundaries; the resulting elapsed duration is rounded to the nearest microsecond. Antardasha boundaries are cumulative integer-ratio partitions and exactly cover their parent period. ISO timestamps are millisecond calendar representations; exact epoch-microsecond boundary fields are retained.
- **Mahadasha horizon:** Return one ordered traversal of all nine lords from birth: the remaining portion of the starting lord, followed by each of the other eight full Mahadashas. Its elapsed time is 120 years minus the elapsed portion of the starting Mahadasha; the repeated starting lord begins the next cycle and is outside this one-pass result.
- **Antardasha:** Within each Mahadasha, use the same cyclic sequence from that Mahadasha's lord. Each duration is proportional to the lord's canonical years over 120. For the starting Mahadasha, return the Antardasha containing birth clipped at birth, then the remaining Antardashas through the Mahadasha end. The contract also retains the full rule-defined duration and elapsed/remaining-at-birth balances separately from the clipped timeline duration. Following Mahadashas include all nine. No Pratyantardasha is included.
- **Integrity repair:** The result validator independently enforces the Moon-longitude/Nakshatra classification, canonical starting lord and cyclic sequences, canonical Mahadasha durations, exact proportional Antardasha partitions, contiguous Mahadasha-anchored boundaries, and birth-clipped balances. The Dasha entry point verifies the D1 Moon's full Nakshatra placement against the shared Phase 5 classifier. These are integrity safeguards; they do not change the `vimshottari-v1` methodology or establish reference-chart equivalence.
- **Scope:** This result is attached to `CalculationResult` and validated against the D1 Moon and birth instant. No UI, database, or alternate Dasha system is implemented. The later Phase 7 rules are recorded in ADR-007.

## ADR-007: Phase 7 initial Yoga/Dosha methodology

- **Status:** Implemented as `vedic-rules-v1`; the choices below are fixed for this version and can change only through a new methodology version.
- **Carry-forward gate:** The Phase 6.5 Dasha implementation, contracts, canonical sequence, full-duration Antardasha partitioning, birth-time selection, and precision rules were re-audited before Phase 7 implementation. The gate passed without a Dasha defect or calculation-method change. Regression tests cover exact and adjacent Antardasha transitions for all nine starting Mahadasha lords.
- **Rule-set scope:** Evaluate Budha-Aditya Yoga, Chandra-Mangala Yoga, and an Ascendant-based Mangala Dosha marker only. Results report defined positional conditions; they are not life predictions, diagnoses, or interpretation.

### Methodology review

- **Conjunction choices:** Same-Rashi co-occupancy is selected for Budha-Aditya (Sun/Mercury) and Chandra-Mangala (Moon/Mars). Alternatives include an exact-longitude/orb threshold or aspect-inclusive definitions. Sign occupancy matches the established sidereal Rashi/Whole Sign model and common chart-reading practice, is deterministic at the existing half-open boundaries, and avoids inventing an orb or enabling unapproved aspect rules. It is less granular than longitude-distance methods and some traditions permit additional configurations; those are intentionally not inferred.
- **Mangala reference choices:** Ascendant-based Whole Sign houses 1, 2, 4, 7, 8, and 12 are selected. Other systems reference the Moon, Venus, or multiple reference points, and differ on the included house set (including the 2nd). The Ascendant-only form uses authoritative D1 house assignments, is straightforward for Kundli users and Pandits to inspect, and does not add duplicate house logic. It is narrower than multi-reference practice and must not be presented as the only tradition.
- **Cancellation choices:** The Mangala base placement and cancellation are separate. This version cancels the base marker only when the canonical Mars dignity is `own_sign`, `moolatrikona`, or `exalted`. Alternatives include no cancellation, combinations/conjunctions with other planets, additional sign/house exceptions, or lineage-specific lists. Reusing the approved dignity result gives reproducible evidence with limited complexity, but does not capture all traditions. No cancellation conditions are specified for the two same-Rashi Yoga rules in this version; combustion, orb, and aspects do not silently act as exceptions.
- **Aspect choice:** No implemented rule uses aspects. No generic seventh aspect, special planetary aspects, node aspects, longitude orb, or graded aspect strength is assumed.
- **Product/reproducibility decision:** These definitions are explicit Kundli-Web conventions, not universally authoritative Jyotisha rules. They are fixed within `vedic-rules-v1`, not runtime-configurable; alternative lineages or expanded exceptions require a separately reviewed version. The static rule catalogue is the canonical machine-readable source.
- **Downstream impact:** This version consumes the existing sidereal D1 longitudes, Rashi IDs, Ascendant, Whole Sign houses, and canonical dignity only. It can provide structured evidence to later explanation/report work but does not implement those systems. It does not alter Panchang, Dasha, matching, divisional charts, or astronomical-provider behavior.

### Rule contracts and limits

- **Budha-Aditya Yoga:** base condition is `Sun.rashi.id === Mercury.rashi.id`; there are no cancellation rules in this version.
- **Chandra-Mangala Yoga:** base condition is `Moon.rashi.id === Mars.rashi.id`; there are no cancellation rules in this version.
- **Mangala Dosha:** base condition is Mars house in `[1, 2, 4, 7, 8, 12]` using the D1 Ascendant. Cancellation is Mars dignity in `[own_sign, moolatrikona, exalted]`. Detection is the base condition minus this explicit cancellation.
- **Output:** `CalculationResult.yogaDosha` identifies the chart and `vedic-rules-v1`, returns every rule including negative detections, and preserves base condition, final detection, cancellation state, and structured positional/dignity evidence. The result schema recomputes detections from the D1 chart rather than trusting submitted booleans.
- **Excluded:** No rule catalogue beyond the three listed rules; no aspect system, degree-based conjunction threshold, combustion/strength evaluation, broader cancellation list, phala, natural-language interpretation, remedies, UI, persistence, or external-reference equivalence is claimed.

## ADR-008: Phase 8 planetary strength and explicit-instant transits

- **Status:** Implemented as `vedic-strength-transit-v1`; values and rules are code-verified but not independently/reference verified.
- **Manual verification:** The summary register in `docs/astrology-engine.md` and the detailed [Phase 8.5 verification matrix](./phase-8.5-manual-verification.md) record what local tests establish and the outstanding legal, methodology, independent ephemeris, and production checks. The [human checklist](./phase-8.5-human-checklist.md) provides the fixture procedures and evidence template. No external reference was available in this phase; no item is marked independently or production verified.
- **Strength scope:** Implement only the Naisargika Bala component, not a Shadbala total. Use the seven classical planets and natural strength ranks Saturn 1, Mars 2, Mercury 3, Jupiter 4, Venus 5, Moon 6, Sun 7. One rupa is 60 virupas. Preserve exact `virupaNumerator = rank × 60` and `virupaDenominator = 7`; `valueVirupas` is the display/convenience quotient. No rounded decimal is used in calculation and no component total/overall strength is produced. Nodes/outer planets are not assigned a result.
- **Alternatives considered:** Implement full Shadbala, another single component, or defer strength. Full Shadbala requires separately locking Sthana, Dig, Kala, Cheshta, and Drik definitions, aspects, time inputs, units, and correction rules; the current methodology does not support a safely reviewed aggregate. Deferring everything would omit a tractable, inspectable strength primitive. Naisargika Bala is selected because its static seven-planet rank and units are deterministic and add no hidden astronomical assumptions, while remaining clearly labeled as one component only.
- **Transit definition:** A transit is the existing provider's astronomical positions evaluated at a caller-supplied ISO-8601 instant with an explicit UTC marker/offset and coordinates. Offset is resolved to canonical UTC; current date, machine timezone, locale, and local civil-time/DST inference are excluded. Use existing Swiss Ephemeris configuration, True Node, Lahiri sidereal conversion, ephemeris-file checks, and Vedic Rashi/Nakshatra/Pada classifiers. Preserve requested/resolved instant, Julian day, provider metadata, and raw and normalized position evidence.
- **Relationship boundary:** No natal/transit aspects, orbs, sign aspects, transiting-house overlays, forecasts, or windows are implemented. The project has not independently approved an aspect methodology.
- **Contract/integration:** `CalculationResult` includes Naisargika Bala evidence for the seven classical planets; a separate transit result is returned only by the explicit-instant transit calculation function. The engine version identifies `vedic-strength-transit-v1`; schemas recompute strength results against D1. Neither result adds persistence or UI.
- **Limitations and follow-up:** Source/tradition confirmation of Naisargika values and independent reference-chart comparison remain outstanding. Transit output needs external ephemeris comparison and deployment verification. No deployment compatibility or production accuracy is implied. Any broader strength system, alternative natural-strength table, or transit relationship rule requires a reviewed methodology/version change.

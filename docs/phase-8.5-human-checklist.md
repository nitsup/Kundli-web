# Phase 8.5 — Independent Human Checklist

Use this checklist if you did not implement the calculation engine. It is a verification aid, not a claim that the work is correct. Do not use real personal birth data in shared evidence; use the synthetic fixtures in [the verification matrix](./phase-8.5-manual-verification.md) or redact identifying details.

## Before starting

- [ ] Confirm the code/version being checked and the environment (local OS, Node version, package version). Save this in the evidence folder.
- [ ] Ask for a sanitized input/result export for fixture F01 or a fixture runner. Do not accept screenshots alone when raw values/configuration are available.
- [ ] Confirm the provider and methodology settings shown for the run: Swiss Ephemeris, Lahiri/Chitrapaksha, True Node, Whole Sign, and the recorded methodology version.
- [ ] Confirm the run's ephemeris files/provider version and timezone database version are available in the metadata. If missing, mark the item **UNVERIFIED**, not passed.
- [ ] Choose any independent reference source before seeing Kundli-Web's expected comparison values. Record its name, version/date, settings and license/source.
- [ ] Use the same exact UTC instant, signed coordinates, sidereal mode, ayanamsha, node type, house system and reference conventions in both tools. If the source cannot use those settings, record the difference and do not claim a direct pass.

## Fixture checks

For every row, select one status only: `NOT RUN`, `UNVERIFIED`, `LOCAL BEHAVIOR CONFIRMED`, `INDEPENDENTLY VERIFIED`, `FAILED`, or `BLOCKED`. The last two confirmed labels require the evidence noted in the matrix; local behavior confirmation is never independent verification.

| Done | Fixture | What to do | Expected observation | Stop / fail if | Save evidence to |
|---|---|---|---|---|---|
| [ ] | F01 — civil time / rollover | Run the three exact `Asia/Kolkata` timestamps. Compare local input, chosen offset, UTC instant, timezone-data version, and Julian day. | UTC is respectively `1990-01-02T07:00:00Z`, `1990-01-01T18:30:01Z`, and `2019-12-31T18:30:00Z`; the UTC date may differ from local date. | UTC arithmetic differs, local input is overwritten, or JD is missing/mismatched without explanation. | `phase-8.5/F01/` sanitized request, result, and reference calculation |
| [ ] | F02 — DST / defaults | Try the listed New York normal, gap, and fold times, both fold choices, and omitted fold. Check any profile/legacy timezone default is not silently used as confirmed birth input. | Normal offsets are -05/-04; gap and missing fold choice reject; fold choices resolve one hour apart. Kolkata default is not silently substituted. | Gap is guessed, ambiguous time silently picks one fold, or default is passed as user-confirmed. | `phase-8.5/F02/` inputs, errors, resolved times, and default-path review |
| [ ] | F03 — coordinates | Compare coordinates for each named fixture with an authoritative map/geodetic source; inspect serialized input and provider argument order. | Signs, degrees, latitude-first order and supplied precision remain intact; provenance is visible. | Swapped axes, changed signs/precision, unexplained defaults, or unsupported claim about source. | `phase-8.5/F03/` source citation and sanitized input/provider evidence |
| [ ] | F04 — invalid inputs / place flow | Try invalid date/timezone/coordinates, missing fields, unresolved/ambiguous place, and transit time without an offset. | Each invalid case rejects clearly; place ambiguity requires explicit resolution; no valid-looking partial calculation appears. | A default location/timezone is guessed, or invalid data yields a chart/result. | `phase-8.5/F04/` request, error, and side-effect check |
| [ ] | F05 — planetary positions | Compare each supported body's raw and sidereal position and ayanamsha to the preselected independent tool at exactly the same instant/settings. | Differences fit the tolerance chosen before comparison or are explained by a documented setting/data difference. | Expected values are copied from this code/provider; unexplained mismatch; tolerance changed afterward. | `phase-8.5/F05/` source/settings/input/expected/actual/tolerance |
| [ ] | F06 — angles / Julian day | Compare JD, Ascendant and MC from the reference for eastern and western longitudes and rollover input; check tropical angle, ayanamsha and derived sidereal angle separately. | Each step agrees within a predeclared tolerance and uses the same coordinate order and house mode. | Wrong sign/order, time scale, or unexplained angle/JD mismatch. | `phase-8.5/F06/` settings and step-by-step outputs |
| [ ] | F07 — Rashi boundary | Run just-below, exact, and just-above values at every listed 30° boundary, plus wrap cases. | Exact boundary is classified into the following sign; raw value is not rounded first. | A boundary changes due to display rounding, or classifier and chart disagree. | `phase-8.5/F07/` test output and boundary table |
| [ ] | F08 — Nakshatra/Pada boundary | Check every 13°20′ and 3°20′ boundary below/exact/above; compare names/order/lords to a reviewed reference. | Half-open transition is consistent; displayed classification matches unrounded input. | Name/order/Pada disagreement or methodology assumed without a source/reviewer. | `phase-8.5/F08/` source and boundary results |
| [ ] | F09 — D1 / houses | Check all 12 Ascendant signs and one independent reference chart. For each house compare sign, number, lord and occupants; inspect nodes and empty houses. | House 1 is Ascendant Rashi; signs progress sequentially; lord and occupants agree. | Quadrant cusps appear, missing/duplicate body, or lord/house mismatch. | `phase-8.5/F09/` independent chart settings and comparison |
| [ ] | F10 — Rahu/Ketu | Compare true-node setting/flags and node positions with an independent source; check wrap and sign-boundary cases. | True Node is requested; Ketu is exactly opposite normalized Rahu; classifications agree. | Mean Node is used, Moshier fallback appears, or Ketu is not opposite. | `phase-8.5/F10/` flags, source, raw/normalized positions |
| [ ] | F11 — Mahadasha | Compare Moon longitude, Nakshatra/lord, progress/balance and dates against an independent Dasha tool configured to the same year convention. | Sequence/durations and dates agree under matching stated settings; 365.25-day convention is visible. | Year convention is hidden, external tool differs with no explanation, or local tests are represented as external proof. | `phase-8.5/F11/` source/settings and timeline comparison |
| [ ] | F12 — Antardasha | Review each of the nine starting-lord sequences at exact and adjacent boundaries; compare full duration and birth-clipped duration separately. | Boundary belongs to the next period; clipping does not change the full rule-defined partition. | Birth clipping changes sequence/full durations or boundary selection is inconsistent. | `phase-8.5/F12/` all nine result tables and reference |
| [ ] | F13 — explicit transit | Run both equivalent offset forms and the other listed instants. Compare requested time, resolved UTC, JD, provider/settings and positions. | Equivalent instants give the same result; no current-time selection or natal mutation; output is position-only. | Result depends on machine timezone/clock, settings differ from natal, or unsupported aspects/forecast appear. | `phase-8.5/F13/` request, metadata, provider output and external comparison |
| [ ] | F14 — Naisargika Bala | Check all seven ranks, exact numerator/denominator, virupas, units and label against the preselected reference. | Rank table and arithmetic match; result is explicitly one component, not total Shadbala. | Wrong value/unit, unexplained source difference, or an overall-strength claim. | `phase-8.5/F14/` source, table and serialized result |
| [ ] | F15 — result/schema/reproducibility | Compare sanitized natal/transit result fields with their input; repeat with a different name, locale and machine timezone; try D60 and invalid input. | Provider/method versions, provenance, raw/classified values and timestamps are coherent; non-name result/hash remains stable; timestamps may differ; D60 is not claimed as calculated; invalid input rejects. | Missing metadata, calculation changes with name/locale, unsupported D-chart appears calculated, or malformed input succeeds. | `phase-8.5/F15/` sanitized runs, schema errors and field-by-field checklist |

## Decision and release checklist

- [ ] A qualified reviewer has recorded whether the selected Rashi/Nakshatra/dignity/node/Dasha/Yoga/Dosha/strength conventions fit Kundli-Web's stated audience and chosen methodology. Record specific alternatives and any dissent; do not label a convention universally correct.
- [ ] The 365.25-day Dasha-year convention is explicitly accepted, changed under a new version, or left as an acknowledged blocker.
- [ ] Legal/project-owner review has separately addressed AGPL-3.0, Swiss Ephemeris Free Edition, wrapper, ephemeris data, notices, and the intended public service model. A dependency install is not legal approval.
- [ ] Production target verification has separately confirmed native addon loading, ephemeris asset inclusion/hashes, Swiss flags/no fallback, timezone data, and representative calculation parity. Local Windows success is not production compatibility.
- [ ] Every fixture status and evidence link is updated in the [verification matrix](./phase-8.5-manual-verification.md), including failed and blocked results. Do not delete failures or replace them with screenshots of a later run.
- [ ] Phase 9 remains blocked until required methodology decisions are accepted and independent/production checks are completed or explicitly waived with recorded risk acceptance.

## Human evidence record

Copy this block for each fixture and attach it under the listed evidence directory:

```text
Fixture ID:
Status:
Checked by / role:
Date and time (UTC):
Repository revision:
Environment (OS, Node, provider/package, tzdb):
Exact sanitized input:
Calculation configuration / methodology version:
Independent source, version, date, and settings:
Expected result and units:
Actual result and units:
Tolerance and reason, if comparing numeric output:
Differences in conventions or data:
Evidence filenames/links:
Conclusion and unresolved questions:
```

Never mark an item `INDEPENDENTLY VERIFIED` when the only expected result came from Kundli-Web, the same provider package, or a test fixture copied from its output.

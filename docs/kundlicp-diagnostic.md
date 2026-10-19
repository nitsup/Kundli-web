# `kundlicp` terminal diagnostic

Run the interactive local diagnostic from the repository root:

```powershell
npm run kundlicp
```

The command ends in `cp` as requested. It asks whether to inspect a birth chart
or an explicit-instant transit. Birth-chart input collects local date/time,
IANA timezone and DST-fold choice, time accuracy, location coordinates and
their declared sources. Transit input collects an offset-bearing ISO-8601
instant and coordinates. No place geocoder is assumed and no coordinate or
timezone is guessed.

The method/configuration is intentionally fixed to the project's current
validated choices: Swiss Ephemeris Free Edition, Swiss ephemeris files, Lahiri /
Chitrapaksha, True Node, Whole Sign, and the required speed flag. The command
prints:

- validated input and the calculation configuration;
- complete raw adapter astronomy for the ten supported planets and True Node,
  including tropical and sidereal longitude, latitude, distance, all three
  speed values and return flags; it also prints raw Whole Sign house cusps,
  returned angles, Julian day, provider and ephemeris-file hash;
- the raw Swiss house result, including all house cusps and returned angles;
- for a birth chart, the complete current `CalculationResult` (D1, Vimshottari,
  Yoga/Dosha, and Naisargika Bala); for a transit, the structured
  explicit-instant transit result.

Ketu is derived as opposite Rahu by the adapter; the raw data therefore shows
the Swiss True Node rather than a separate Swiss Ketu calculation. Sidereal
conversion and some other displayed values are adapter/application
transformations, not separate raw Swiss outputs. This diagnostic reports
everything the current adapter
requests and returns; it does **not** call every function offered by Swiss
Ephemeris. Eclipse, rise/set, event searches, additional house systems, and
other currently unused Swiss APIs are deliberately outside this command's
scope.

The birth-chart command invokes the provider once for detailed raw diagnostic
data and again through the normal calculation engine. These calls intentionally
exercise both the adapter and the integrated engine against the same input.
Each run is local and stateless: it does not write a file or persist results.
It is not an independent accuracy check, a methodology approval, or proof of
production/Vercel compatibility.

Birth information appears in terminal output. Use a private terminal, avoid
recording shared-console sessions, and redact output before sharing it. A
declared location/timezone source is user-supplied metadata, not independently
verified provenance.

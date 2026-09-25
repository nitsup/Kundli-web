# Astrology engine abstraction

## Goal

The repository defines an engine boundary so a real astronomy or astrology library can be plugged in later without rewriting the application.

## Input contract

The engine accepts a birth profile with a user identifier, date, time, latitude, longitude, and timezone. This contract is intentionally minimal and explicit.

## Output contract

The result is a structured object with a calculation identifier, source profile, and metadata such as provider name, version, timezone, and generation timestamp.

## Provider abstraction

The interface is defined in `lib/astrology/engine.ts` and should be implemented by a provider-specific adapter later. The app should not invoke provider-specific code directly from UI or route layers.

## Validation requirements

- date must be valid
- time must be valid
- latitude and longitude must be in range
- timezone must be explicit and valid
- input must be server-validated before any calculation is attempted

## Uncertainty handling

Birth time or location inaccuracies should be carried as structured metadata so interpretation layer and UI can explain uncertainty without inventing facts.

## Versioning

A provider version and calculation version should always be persisted with generated results to support audits and future changes.

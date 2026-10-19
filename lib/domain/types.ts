export type UserRole = 'user' | 'pandit' | 'admin';

export type BirthTimeAccuracy = 'exact' | 'approximate' | 'unknown';

export type FeatureName =
  | 'kundli_generation'
  | 'panchang_access'
  | 'matching_analysis'
  | 'ai_chat'
  | 'report_generation';

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  language: string;
  timezone: string;
  avatar_url?: string;
}

export interface BirthProfile {
  id: string;
  owner_id?: string;
  client_id?: string;
  name: string;
  date_of_birth: string;
  time_of_birth: string;
  birth_time_accuracy: BirthTimeAccuracy;
  latitude: number;
  longitude: number;
  timezone: string;
  notes?: string;
}

export interface LocationRecord {
  country: string;
  state?: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneSource?: 'user' | 'geocoding' | 'calculation_provider' | 'unknown';
  locationSource?: 'user' | 'geocoding' | 'unknown';
}

export type TimezoneSource = 'user' | 'geocoding' | 'calculation_provider' | 'unknown';

export interface BirthLocation {
  city: string;
  country: string;
  state?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneSource?: TimezoneSource;
  locationSource?: 'user' | 'geocoding' | 'unknown';
  canonicalPlaceId?: string;
  resolverName?: string;
  resolverVersion?: string;
  confidence?: number;
}

export interface PlaceSearchInput {
  query: string;
  countryHint?: string;
}

export type PlaceResolutionCandidate = Omit<
  BirthLocation,
  'timezoneSource' | 'locationSource'
> & {
  timezoneSource: Exclude<TimezoneSource, 'unknown'>;
  locationSource: 'geocoding';
};

export type PlaceResolution =
  | { status: 'resolved'; place: PlaceResolutionCandidate }
  | {
      status: 'ambiguous';
      candidates: [PlaceResolutionCandidate, ...PlaceResolutionCandidate[]];
    }
  | { status: 'not_found' };

export interface PlaceResolver {
  resolve(input: PlaceSearchInput): Promise<PlaceResolution>;
}

export interface CalculationInput {
  birthProfileId: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  birthDateTimeUtc: string;
  timezoneOffset: string;
  timezoneDatabaseVersion: string;
  dstFoldResolution?: 'earlier' | 'later';
  timeAccuracy: BirthTimeAccuracy;
  location: BirthLocation & {
    timezoneSource: TimezoneSource;
    locationSource: 'user' | 'geocoding' | 'unknown';
  };
}

export const VEDIC_METHODOLOGY_VERSION = 'kundli-vedic-core-v1';
export const YOGA_DOSHA_METHODOLOGY_VERSION = 'vedic-rules-v1';

export interface CalculationConfiguration {
  chartSystem: 'vedic';
  zodiacSystem: 'sidereal';
  ayanamsa: 'lahiri';
  nodeType: 'true';
  houseSystem: 'whole_sign';
  calculationFlags: ('swiss_ephemeris' | 'speed')[];
  methodologyVersion: typeof VEDIC_METHODOLOGY_VERSION;
  divisionalCharts?: ChartType[];
}

export interface CalculationVersion {
  engine: string;
  engineVersion: string;
  provider?: string;
  providerVersion?: string;
  ephemerisSource?: string;
  ephemerisVersion?: string;
  methodologyVersion?: string;
  dashaMethodologyVersion?: string;
  yogaDoshaMethodologyVersion?: string;
  strengthTransitMethodologyVersion?: typeof STRENGTH_TRANSIT_METHODOLOGY_VERSION;
}

export const STRENGTH_TRANSIT_METHODOLOGY_VERSION = 'vedic-strength-transit-v1' as const;

export interface AstronomicalPosition {
  planet: PlanetName;
  siderealLongitude: number;
  tropicalLongitude: number;
  latitude: number;
  distanceAu: number;
  longitudeSpeedDegreesPerDay: number;
  latitudeSpeedDegreesPerDay: number;
  distanceSpeedAuPerDay: number;
  providerFlags: number;
}

export interface AstronomicalAngles {
  tropicalAscendantLongitude: number;
  siderealAscendantLongitude: number;
  tropicalMidheavenLongitude: number;
  siderealMidheavenLongitude: number;
  ayanamshaDegrees: number;
}

export interface AstronomicalProviderMetadata {
  provider: string;
  providerVersion: string;
  ephemerisSource: string;
  ephemerisVersion: string;
}

export interface AstronomicalResult {
  julianDayUt: number;
  positions: AstronomicalPosition[];
  angles: AstronomicalAngles;
  provider: AstronomicalProviderMetadata;
}

export type ChartSystem = 'vedic' | 'western' | 'unknown';
export const CHART_TYPES = [
  'd1', 'd2', 'd3', 'd4', 'd7', 'd9', 'd10', 'd12', 'd16', 'd20',
  'd24', 'd27', 'd30', 'd40', 'd45', 'd60', 'custom',
] as const;
export type ChartType = (typeof CHART_TYPES)[number];
export type PresentationMode = 'simple' | 'advanced';
export type PlanetName =
  | 'sun'
  | 'moon'
  | 'mars'
  | 'mercury'
  | 'jupiter'
  | 'venus'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'rahu'
  | 'ketu';
export type ClassicalPlanetName =
  | 'sun'
  | 'moon'
  | 'mars'
  | 'mercury'
  | 'jupiter'
  | 'venus'
  | 'saturn';
export type NakshatraLord = ClassicalPlanetName | 'rahu' | 'ketu';
export type RashiId =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';
export type NakshatraId =
  | 'ashwini'
  | 'bharani'
  | 'krittika'
  | 'rohini'
  | 'mrigashira'
  | 'ardra'
  | 'punarvasu'
  | 'pushya'
  | 'ashlesha'
  | 'magha'
  | 'purva-phalguni'
  | 'uttara-phalguni'
  | 'hasta'
  | 'chitra'
  | 'swati'
  | 'vishakha'
  | 'anuradha'
  | 'jyeshtha'
  | 'mula'
  | 'purva-ashadha'
  | 'uttara-ashadha'
  | 'shravana'
  | 'dhanishtha'
  | 'shatabhisha'
  | 'purva-bhadrapada'
  | 'uttara-bhadrapada'
  | 'revati';
export type DignityState =
  | 'exalted'
  | 'debilitated'
  | 'moolatrikona'
  | 'own_sign'
  | 'neutral'
  | 'not_applicable';
export interface MoolatrikonaRange {
  sign: RashiId;
  startDegree: number;
  endDegree: number;
}
export interface DignityAssessment {
  state: DignityState;
  sign: RashiId;
  degreeWithinSign: number;
  moolatrikonaRange?: MoolatrikonaRange;
}
export type DashaSystem = 'vimshottari' | 'yogini' | 'ashtottari' | 'unknown';
export type InsightStatus = 'available' | 'unavailable' | 'pending' | 'error';

export interface BirthData { name: string; dateOfBirth: string; timeOfBirth: string; location: LocationRecord; timeAccuracy: BirthTimeAccuracy; }
export interface ChartMetadata { chartSystem: ChartSystem; zodiacSystem?: 'sidereal' | 'tropical'; ayanamsa?: string; nodeType?: 'true' | 'mean'; houseSystem?: string; calculationFlags?: number[]; generatedAt?: string; provider?: string; calculationVersion?: string; methodologyVersion?: string; version?: CalculationVersion; }
export interface DegreePosition { degrees: number; minutes: number; seconds?: number; }
export interface RashiDefinition { id: RashiId; index: number; name: string; sanskritName: string; lord: ClassicalPlanetName; startLongitude: number; endLongitude: number; }
export interface RashiPlacement extends RashiDefinition { longitude: number; degreeWithinRashi: number; }
export interface NakshatraDefinition {
  id: NakshatraId;
  index: number;
  name: string;
  lord: NakshatraLord;
  startLongitude: number;
  endLongitude: number;
  padaBoundaries: readonly [number, number, number, number, number];
}
export interface NakshatraPlacement extends NakshatraDefinition {
  pada: 1 | 2 | 3 | 4;
  degreeWithinNakshatra: number;
  longitude: number;
  degreePosition: DegreePosition;
}
export interface PlanetPosition {
  planet: PlanetName;
  rawSiderealLongitude: number;
  longitude: number;
  rawTropicalLongitude?: number;
  tropicalLongitude?: number;
  latitude?: number;
  distanceAu?: number;
  longitudeSpeedDegreesPerDay?: number;
  latitudeSpeedDegreesPerDay?: number;
  distanceSpeedAuPerDay?: number;
  providerFlags?: number;
  retrograde?: boolean;
  position: DegreePosition;
  sign: string;
  rashi: RashiPlacement;
  house: number;
  nakshatra: NakshatraPlacement;
  dignity: DignityAssessment;
  combust?: boolean;
  aspects?: PlanetName[];
  conjunctions?: PlanetName[];
}
export interface HousePosition {
  house: number;
  signId: RashiId;
  sign: string;
  lord: ClassicalPlanetName;
  occupants: PlanetName[];
  aspects?: PlanetName[];
  startLongitude: number;
  endLongitude: number;
}
export interface BirthChart {
  id: string;
  birthProfileId: string;
  chartType: ChartType;
  metadata: ChartMetadata;
  planets: PlanetPosition[];
  houses: HousePosition[];
  ascendant: string;
  ascendantLongitude: number;
  ascendantDegree: DegreePosition;
  ascendantRashi: RashiPlacement;
  ascendantNakshatra: NakshatraPlacement;
  midheavenLongitude: number;
  midheavenSign: string;
  nakshatra: NakshatraPlacement;
  status: InsightStatus;
}
export interface D1Chart extends BirthChart {
  chartType: 'd1';
}
export interface CalculationResult {
  id: string;
  birthProfileId: string;
  input: CalculationInput;
  configuration: CalculationConfiguration;
  version: CalculationVersion;
  charts: BirthChart[];
  dasha?: VimshottariDashaResult;
  yogaDosha?: YogaDoshaResult;
  planetaryStrength?: PlanetaryStrengthResult;
  status: InsightStatus;
  createdAt: string;
}
export interface DashaPeriod { id: string; system: DashaSystem; lord: PlanetName; startsAt: string; endsAt: string; level: 1 | 2 | 3; active?: boolean; parentId?: string; children?: DashaPeriod[]; status: InsightStatus; }
export type VimshottariLord = NakshatraLord;
export interface VimshottariAntardasha {
  id: string;
  lord: VimshottariLord;
  startsAt: string;
  endsAt: string;
  startEpochMicroseconds: string;
  endEpochMicroseconds: string;
  durationMicroseconds: string;
  durationYears: number;
  fullDurationMicroseconds: string;
  fullDurationYears: number;
  elapsedAtBirthMicroseconds: string;
  remainingAtBirthMicroseconds: string;
  activeAtBirth: boolean;
}
export interface VimshottariMahadasha {
  id: string;
  lord: VimshottariLord;
  startsAt: string;
  endsAt: string;
  startEpochMicroseconds: string;
  endEpochMicroseconds: string;
  durationMicroseconds: string;
  durationYears: number;
  fullDurationMicroseconds: string;
  fullDurationYears: number;
  elapsedAtBirthMicroseconds: string;
  remainingAtBirthMicroseconds: string;
  elapsedAtBirthYears: number;
  remainingAtBirthYears: number;
  activeAtBirth: boolean;
  antardashas: VimshottariAntardasha[];
}
export interface VimshottariDashaResult {
  system: 'vimshottari';
  methodologyVersion: 'vimshottari-v1';
  yearConvention: 'julian_365_25_day';
  secondsPerYear: 31557600;
  cycleDurationYears: 120;
  birthInstant: string;
  moon: {
    siderealLongitude: number;
    nakshatraId: NakshatraId;
    nakshatraName: string;
    nakshatraIndex: number;
    nakshatraLord: VimshottariLord;
    pada: 1 | 2 | 3 | 4;
    nakshatraProgress: number;
    nakshatraElapsedDegrees: number;
  };
  startingMahadashaLord: VimshottariLord;
  fullMahadashaMicroseconds: string;
  elapsedMahadashaMicrosecondsAtBirth: string;
  remainingMahadashaMicrosecondsAtBirth: string;
  elapsedMahadashaYearsAtBirth: number;
  remainingMahadashaYearsAtBirth: number;
  timelineDurationMicroseconds: string;
  timelineDurationYears: number;
  mahadashas: VimshottariMahadasha[];
}
export type YogaDoshaRuleId =
  | 'budha-aditya-yoga'
  | 'chandra-mangala-yoga'
  | 'mangala-dosha';
export type YogaDoshaEvidence =
  | {
      conditionId: string;
      kind: 'same-rashi';
      satisfied: boolean;
      placements: readonly [
        { planet: PlanetName; rashiId: RashiId; longitude: number },
        { planet: PlanetName; rashiId: RashiId; longitude: number },
      ];
    }
  | {
      conditionId: string;
      kind: 'house-from-ascendant';
      satisfied: boolean;
      planet: PlanetName;
      planetRashiId: RashiId;
      house: number;
      ascendantRashiId: RashiId;
      requiredHouses: readonly number[];
    }
  | {
      conditionId: string;
      kind: 'dignity-state';
      satisfied: boolean;
      planet: PlanetName;
      rashiId: RashiId;
      state: DignityState;
      qualifyingStates: readonly DignityState[];
    };
export interface AstrologyRuleEvaluation {
  ruleId: YogaDoshaRuleId;
  name: string;
  methodologyVersion: typeof YOGA_DOSHA_METHODOLOGY_VERSION;
  category: 'yoga' | 'dosha';
  baseConditionMet: boolean;
  detected: boolean;
  cancellationApplied: boolean;
  conditionEvidence: YogaDoshaEvidence;
  cancellationEvidence: YogaDoshaEvidence[];
}
export interface YogaDoshaResult {
  methodologyVersion: typeof YOGA_DOSHA_METHODOLOGY_VERSION;
  chartId: string;
  yogas: AstrologyRuleEvaluation[];
  doshas: AstrologyRuleEvaluation[];
}
export interface NaisargikaBalaComponent {
  id: 'naisargika-bala';
  planet: ClassicalPlanetName;
  rankRupas: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  virupaNumerator: number;
  virupaDenominator: 7;
  valueVirupas: number;
  unit: 'virupa';
}
export interface PlanetaryStrengthResult {
  methodologyVersion: typeof STRENGTH_TRANSIT_METHODOLOGY_VERSION;
  chartId: string;
  system: 'naisargika-bala-component';
  components: NaisargikaBalaComponent[];
}
export interface TransitPlanetPosition {
  planet: PlanetName;
  rawSiderealLongitude: number;
  longitude: number;
  tropicalLongitude: number;
  longitudeSpeedDegreesPerDay: number;
  retrograde: boolean;
  rashi: RashiPlacement;
  nakshatra: NakshatraPlacement;
}
export interface TransitResult {
  methodologyVersion: typeof STRENGTH_TRANSIT_METHODOLOGY_VERSION;
  requestedInstant: string;
  resolvedInstantUtc: string;
  julianDayUt: number;
  location: {
    latitude: number;
    longitude: number;
  };
  provider: AstronomicalProviderMetadata;
  positions: TransitPlanetPosition[];
}
export interface Interpretation { id: string; subject: string; category: string; title: string; summary?: string; simpleExplanation?: string; advancedExplanation?: string; why?: string; supportingFactors?: string[]; ruleIds?: string[]; relatedPlanets?: PlanetName[]; relatedHouses?: number[]; relatedPeriods?: string[]; methodology?: string; status: InsightStatus; }
export interface TimelineItem { id: string; phase: 'past' | 'present' | 'upcoming'; startsAt: string; endsAt?: string; title: string; status: InsightStatus; parentId?: string; relatedDashaId?: string; metadata?: Record<string, string>; }
export interface AiContext { birthData?: BirthData; chartId?: string; interpretationIds?: string[]; question?: string; methodology?: string; allowed: boolean; reason: string; }
export interface AssistantBoundary { enabled: boolean; context: AiContext; disclaimer: string; }
export interface ReportRequest { birthProfileId: string; chartId?: string; type: 'kundli' | 'summary' | 'dasha' | 'yoga' | 'dosha' | 'matching' | 'panchang' | 'horoscope'; sections: string[]; presentationMode: PresentationMode; }
export interface ReportShare { reportId: string; visibility: 'private' | 'shared' | 'public_link' | 'expired'; token?: string; expiresAt?: string; revokedAt?: string; }

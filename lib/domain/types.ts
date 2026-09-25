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

export type ChartSystem = 'vedic' | 'western' | 'unknown';
export type ChartType = 'd1' | 'd7' | 'd9' | 'd10' | 'd12' | 'custom';
export type PresentationMode = 'simple' | 'advanced';
export type PlanetName = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu';
export type DashaSystem = 'vimshottari' | 'yogini' | 'ashtottari' | 'unknown';
export type InsightStatus = 'available' | 'unavailable' | 'pending' | 'error';

export interface BirthData { name: string; dateOfBirth: string; timeOfBirth: string; location: LocationRecord; timeAccuracy: BirthTimeAccuracy; }
export interface ChartMetadata { chartSystem: ChartSystem; ayanamsa?: string; houseSystem?: string; generatedAt?: string; provider?: string; calculationVersion?: string; methodologyVersion?: string; }
export interface DegreePosition { degrees: number; minutes: number; seconds?: number; }
export interface PlanetPosition { planet: PlanetName; longitude: number; position: DegreePosition; sign: string; house?: number; nakshatra?: NakshatraPlacement; retrograde?: boolean; combust?: boolean; dignity?: 'exalted' | 'debilitated' | 'own_sign' | 'neutral' | 'unknown'; aspects?: PlanetName[]; conjunctions?: PlanetName[]; }
export interface HousePosition { house: number; sign: string; lord?: PlanetName; occupants?: PlanetName[]; aspects?: PlanetName[]; startLongitude?: number; endLongitude?: number; }
export interface NakshatraPlacement { name: string; lord?: PlanetName; pada?: number; degreeRange?: { start: number; end: number }; longitude?: number; }
export interface BirthChart { id: string; birthProfileId: string; chartType: ChartType; metadata: ChartMetadata; planets: PlanetPosition[]; houses: HousePosition[]; ascendant?: string; ascendantDegree?: DegreePosition; nakshatra?: NakshatraPlacement; status: InsightStatus; }
export interface DashaPeriod { id: string; system: DashaSystem; lord: PlanetName; startsAt: string; endsAt: string; level: 1 | 2 | 3; active?: boolean; parentId?: string; children?: DashaPeriod[]; status: InsightStatus; }
export interface Yoga { id: string; name: string; detected: boolean; involvedPlanets?: PlanetName[]; involvedHouses?: number[]; ruleId?: string; status: InsightStatus; explanation?: Interpretation; }
export interface Dosha { id: string; name: string; detected: boolean; involvedFactors?: string[]; ruleId?: string; status: InsightStatus; explanation?: Interpretation; }
export interface Interpretation { id: string; subject: string; category: string; title: string; summary?: string; simpleExplanation?: string; advancedExplanation?: string; why?: string; supportingFactors?: string[]; ruleIds?: string[]; relatedPlanets?: PlanetName[]; relatedHouses?: number[]; relatedPeriods?: string[]; methodology?: string; status: InsightStatus; }
export interface TimelineItem { id: string; phase: 'past' | 'present' | 'upcoming'; startsAt: string; endsAt?: string; title: string; status: InsightStatus; relatedDashaId?: string; }
export interface AiContext { birthData?: BirthData; chartId?: string; interpretationIds?: string[]; question?: string; methodology?: string; allowed: boolean; reason: string; }
export interface AssistantBoundary { enabled: boolean; context: AiContext; disclaimer: string; }
export interface ReportRequest { birthProfileId: string; chartId?: string; type: 'kundli' | 'summary' | 'dasha' | 'yoga' | 'dosha' | 'matching' | 'panchang' | 'horoscope'; sections: string[]; presentationMode: PresentationMode; }
export interface ReportShare { reportId: string; visibility: 'private' | 'shared' | 'public_link' | 'expired'; token?: string; expiresAt?: string; revokedAt?: string; }

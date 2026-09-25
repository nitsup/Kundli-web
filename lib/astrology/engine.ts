export interface AstrologyCalculationInput {
  profileId: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface AstrologyCalculationResult {
  id: string;
  profileId: string;
  metadata: {
    provider: string;
    calculationVersion: string;
    timezone: string;
    generatedAt: string;
  };
}

export interface AstrologyCalculationEngine {
  calculateBirthChart(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
  calculateDivisionalChart(input: AstrologyCalculationInput, chartType: string): Promise<AstrologyCalculationResult>;
  calculatePlanetaryPositions(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
  calculateHouses(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
  calculateNakshatras(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
  calculateDashas(input: AstrologyCalculationInput, system: string): Promise<AstrologyCalculationResult>;
  calculateYogas(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
  calculateDoshas(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
  calculateTransits(input: AstrologyCalculationInput, date: string): Promise<AstrologyCalculationResult>;
}

const unavailable = async (input: AstrologyCalculationInput) => {
  throw new Error(`Astrology provider is not implemented yet for ${input.profileId}.`);
};

export const astrologyEngineContract: AstrologyCalculationEngine = {
  calculateBirthChart: unavailable,
  calculateDivisionalChart: unavailable,
  calculatePlanetaryPositions: unavailable,
  calculateHouses: unavailable,
  calculateNakshatras: unavailable,
  calculateDashas: unavailable,
  calculateYogas: unavailable,
  calculateDoshas: unavailable,
  calculateTransits: unavailable,
};

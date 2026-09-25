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

export interface AstrologyEngine {
  generateBirthChart(input: AstrologyCalculationInput): Promise<AstrologyCalculationResult>;
}

export const astrologyEngineContract: AstrologyEngine = {
  async generateBirthChart(input) {
    throw new Error(`Astrology provider is not implemented yet for ${input.profileId}.`);
  },
};

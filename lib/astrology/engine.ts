import type {
  BirthChart,
  CalculationConfiguration,
  CalculationInput,
  CalculationResult,
} from '@/lib/domain/types';

export type AstrologyCalculationInput = CalculationInput;
export type AstrologyCalculationResult = CalculationResult;

export interface AstrologyCalculationEngine {
  calculate(input: AstrologyCalculationInput, configuration: CalculationConfiguration): Promise<AstrologyCalculationResult>;
  calculateBirthChart(input: AstrologyCalculationInput, configuration: CalculationConfiguration): Promise<BirthChart>;
}

const unavailable = async (input: AstrologyCalculationInput): Promise<never> => {
  throw new Error(`Astrology calculation engine is not implemented yet for ${input.birthProfileId}.`);
};

export const astrologyEngineContract: AstrologyCalculationEngine = {
  calculate: unavailable,
  calculateBirthChart: unavailable,
};

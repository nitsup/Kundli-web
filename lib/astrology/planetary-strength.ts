import { AppError } from '@/lib/errors';
import {
  STRENGTH_TRANSIT_METHODOLOGY_VERSION,
  type ClassicalPlanetName,
  type NaisargikaBalaComponent,
  type PlanetaryStrengthResult,
} from '@/lib/domain/types';

export const NAISARGIKA_PLANET_ORDER = [
  { planet: 'saturn', rankRupas: 1 },
  { planet: 'mars', rankRupas: 2 },
  { planet: 'mercury', rankRupas: 3 },
  { planet: 'jupiter', rankRupas: 4 },
  { planet: 'venus', rankRupas: 5 },
  { planet: 'moon', rankRupas: 6 },
  { planet: 'sun', rankRupas: 7 },
] as const satisfies readonly {
  planet: ClassicalPlanetName;
  rankRupas: NaisargikaBalaComponent['rankRupas'];
}[];
const CLASSICAL_PLANET_SET = new Set<string>(
  NAISARGIKA_PLANET_ORDER.map(({ planet }) => planet),
);

export interface NaisargikaBalaChartInput {
  id: string;
  planets: ReadonlyArray<{ planet: string }>;
}

function createComponent(
  entry: (typeof NAISARGIKA_PLANET_ORDER)[number],
): NaisargikaBalaComponent {
  const { planet, rankRupas } = entry;
  const virupaNumerator = rankRupas * 60;
  return {
    id: 'naisargika-bala',
    planet,
    rankRupas,
    virupaNumerator,
    virupaDenominator: 7,
    valueVirupas: virupaNumerator / 7,
    unit: 'virupa',
  };
}

export function calculateNaisargikaBala(
  chart: NaisargikaBalaChartInput,
): PlanetaryStrengthResult {
  const positions = chart.planets.filter(({ planet }) =>
    CLASSICAL_PLANET_SET.has(planet));
  if (
    positions.length !== NAISARGIKA_PLANET_ORDER.length ||
    NAISARGIKA_PLANET_ORDER.some(({ planet }) =>
      positions.filter((position) => position.planet === planet).length !== 1)
  ) {
    throw new AppError(
      'calculation',
      'D1 chart must contain each classical planet exactly once for Naisargika Bala.',
    );
  }

  return {
    methodologyVersion: STRENGTH_TRANSIT_METHODOLOGY_VERSION,
    chartId: chart.id,
    system: 'naisargika-bala-component',
    components: NAISARGIKA_PLANET_ORDER.map(createComponent),
  };
}

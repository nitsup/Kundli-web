import { AppError } from '@/lib/errors';
import { YOGA_DOSHA_METHODOLOGY_VERSION } from '@/lib/domain/types';
import type {
  AstrologyRuleEvaluation,
  DignityState,
  PlanetName,
  PlanetPosition,
  RashiPlacement,
  YogaDoshaEvidence,
  YogaDoshaResult,
  YogaDoshaRuleId,
} from '@/lib/domain/types';

export { YOGA_DOSHA_METHODOLOGY_VERSION };

type SameRashiCondition = {
  kind: 'same-rashi';
  planets: readonly [PlanetName, PlanetName];
};

type AscendantHouseCondition = {
  kind: 'house-from-ascendant';
  planet: PlanetName;
  houses: readonly number[];
};

type RuleConditionDefinition = SameRashiCondition | AscendantHouseCondition;

interface DignityCancellationDefinition {
  id: string;
  kind: 'dignity-state';
  planet: PlanetName;
  states: readonly DignityState[];
}

export interface AstrologyRuleDefinition {
  id: YogaDoshaRuleId;
  name: string;
  methodologyVersion: typeof YOGA_DOSHA_METHODOLOGY_VERSION;
  category: 'yoga' | 'dosha';
  requiredPlanets: readonly PlanetName[];
  requiredHouses?: readonly number[];
  condition: RuleConditionDefinition;
  cancellationRules: readonly DignityCancellationDefinition[];
}

export interface YogaDoshaChartInput {
  id: string;
  ascendantRashi: Pick<RashiPlacement, 'id'>;
  planets: ReadonlyArray<{
    planet: PlanetPosition['planet'];
    rashi: Pick<RashiPlacement, 'id'>;
    longitude: PlanetPosition['longitude'];
    house: PlanetPosition['house'];
    dignity: Pick<PlanetPosition['dignity'], 'state'>;
  }>;
}

export const YOGA_DOSHA_RULES = [
  {
    id: 'budha-aditya-yoga',
    name: 'Budha-Aditya Yoga',
    methodologyVersion: YOGA_DOSHA_METHODOLOGY_VERSION,
    category: 'yoga',
    requiredPlanets: ['sun', 'mercury'],
    condition: { kind: 'same-rashi', planets: ['sun', 'mercury'] },
    cancellationRules: [],
  },
  {
    id: 'chandra-mangala-yoga',
    name: 'Chandra-Mangala Yoga',
    methodologyVersion: YOGA_DOSHA_METHODOLOGY_VERSION,
    category: 'yoga',
    requiredPlanets: ['moon', 'mars'],
    condition: { kind: 'same-rashi', planets: ['moon', 'mars'] },
    cancellationRules: [],
  },
  {
    id: 'mangala-dosha',
    name: 'Mangala Dosha (Ascendant-based)',
    methodologyVersion: YOGA_DOSHA_METHODOLOGY_VERSION,
    category: 'dosha',
    requiredPlanets: ['mars'],
    requiredHouses: [1, 2, 4, 7, 8, 12],
    condition: {
      kind: 'house-from-ascendant',
      planet: 'mars',
      houses: [1, 2, 4, 7, 8, 12],
    },
    cancellationRules: [{
      id: 'mars-own-sign-moolatrikona-or-exalted-sign',
      kind: 'dignity-state',
      planet: 'mars',
      states: ['own_sign', 'moolatrikona', 'exalted'],
    }],
  },
] as const satisfies readonly AstrologyRuleDefinition[];

export type {
  AstrologyRuleEvaluation,
  YogaDoshaEvidence,
  YogaDoshaResult,
  YogaDoshaRuleId,
} from '@/lib/domain/types';

function requirePlanet(chart: YogaDoshaChartInput, planet: PlanetName) {
  const matches = chart.planets.filter((position) => position.planet === planet);
  if (matches.length !== 1) {
    throw new AppError(
      'calculation',
      `D1 chart must contain exactly one ${planet} position for Yoga/Dosha evaluation.`,
    );
  }
  return matches[0];
}

function evaluateCondition(
  chart: YogaDoshaChartInput,
  condition: RuleConditionDefinition,
  conditionId: string,
): YogaDoshaEvidence {
  if (condition.kind === 'same-rashi') {
    const [firstPlanet, secondPlanet] = condition.planets;
    const first = requirePlanet(chart, firstPlanet);
    const second = requirePlanet(chart, secondPlanet);
    return {
      conditionId,
      kind: 'same-rashi',
      satisfied: first.rashi.id === second.rashi.id,
      placements: [
        { planet: firstPlanet, rashiId: first.rashi.id, longitude: first.longitude },
        { planet: secondPlanet, rashiId: second.rashi.id, longitude: second.longitude },
      ],
    };
  }

  const position = requirePlanet(chart, condition.planet);
  return {
    conditionId,
    kind: 'house-from-ascendant',
    satisfied: condition.houses.includes(position.house),
    planet: condition.planet,
    planetRashiId: position.rashi.id,
    house: position.house,
    ascendantRashiId: chart.ascendantRashi.id,
    requiredHouses: condition.houses,
  };
}

function evaluateCancellation(
  chart: YogaDoshaChartInput,
  cancellation: DignityCancellationDefinition,
): YogaDoshaEvidence {
  const position = requirePlanet(chart, cancellation.planet);
  return {
    conditionId: cancellation.id,
    kind: 'dignity-state',
    satisfied: cancellation.states.some((state) => state === position.dignity.state),
    planet: cancellation.planet,
    rashiId: position.rashi.id,
    state: position.dignity.state,
    qualifyingStates: cancellation.states,
  };
}

function evaluateRule(
  chart: YogaDoshaChartInput,
  rule: (typeof YOGA_DOSHA_RULES)[number],
): AstrologyRuleEvaluation {
  const conditionEvidence = evaluateCondition(chart, rule.condition, `${rule.id}:base`);
  const cancellationEvidence = rule.cancellationRules.map((cancellation) =>
    evaluateCancellation(chart, cancellation),
  );
  const baseConditionMet = conditionEvidence.satisfied;
  const cancellationApplied = baseConditionMet &&
    cancellationEvidence.some((evidence) => evidence.satisfied);

  return {
    ruleId: rule.id,
    name: rule.name,
    methodologyVersion: rule.methodologyVersion,
    category: rule.category,
    baseConditionMet,
    detected: baseConditionMet && !cancellationApplied,
    cancellationApplied,
    conditionEvidence,
    cancellationEvidence,
  };
}

export function calculateYogaDosha(chart: YogaDoshaChartInput): YogaDoshaResult {
  const evaluations = YOGA_DOSHA_RULES.map((rule) => evaluateRule(chart, rule));
  return {
    methodologyVersion: YOGA_DOSHA_METHODOLOGY_VERSION,
    chartId: chart.id,
    yogas: evaluations.filter(({ category }) => category === 'yoga'),
    doshas: evaluations.filter(({ category }) => category === 'dosha'),
  };
}

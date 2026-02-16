import type { Door, HomeStyle, PlacedPlan, RoomType, WallAnalysis, WindowPlacement } from '@/lib/constraint-engine/types';

export interface CostBreakdown {
  structure: number;
  walls: number;
  plumbing: number;
  windows: number;
  doors: number;
  extras: number;
}

export interface CostEstimate {
  totalEstimate: number;
  breakdown: CostBreakdown;
  perSqft: number;
  confidence: 'rough' | 'moderate';
}

const BASE_RATE_PER_SQFT = 200;

const STYLE_RATE_ADJUSTMENT: Record<HomeStyle, number> = {
  ranch: -20,
  farmhouse: 5,
  modern: 30,
  craftsman: 15,
  traditional: 10,
  contemporary: 20,
};

const EXTERIOR_WALL_RATE_PER_FT = 180;
const INTERIOR_WALL_RATE_PER_FT = 95;

const FIRST_WET_WALL_COST = 3500;
const ADDITIONAL_WET_WALL_COST = 1200;

const WINDOW_COSTS: Record<WindowPlacement['type'], number> = {
  standard: 450,
  picture: 900,
  bay: 1200,
  clerestory: 500,
};

const DOOR_COSTS: Record<Door['type'], number> = {
  standard: 350,
  double: 900,
  sliding: 1200,
  pocket: 300,
  exterior: 1400,
};

const GARAGE_FLAT_COST = 30000;
const PORCH_OUTDOOR_RATE_PER_SQFT = 85;

const PORCH_TYPES = new Set<RoomType>(['front_porch', 'back_porch', 'outdoor_living']);

function roundCurrency(value: number): number {
  return Math.round(value);
}

function styleRate(style: HomeStyle): number {
  return BASE_RATE_PER_SQFT + STYLE_RATE_ADJUSTMENT[style];
}

function structureSqft(plan: PlacedPlan): number {
  const conditionedSqft = plan.rooms
    .filter((room) => room.type !== 'garage' && !PORCH_TYPES.has(room.type))
    .reduce((sum, room) => sum + room.sqft, 0);

  if (conditionedSqft > 0) {
    return conditionedSqft;
  }
  return plan.rooms.reduce((sum, room) => sum + room.sqft, 0);
}

function plumbingCost(plan: PlacedPlan, walls: WallAnalysis): number {
  const hasPlumbingRooms = plan.rooms.some((room) => room.hasPlumbing);
  if (!hasPlumbingRooms) {
    return 0;
  }

  const wetWallCount = walls.wetWalls.length > 0 ? walls.wetWalls.length : 1;
  return FIRST_WET_WALL_COST + Math.max(0, wetWallCount - 1) * ADDITIONAL_WET_WALL_COST;
}

function windowsCost(plan: PlacedPlan): number {
  return plan.windows.reduce((sum, windowPlacement) => sum + WINDOW_COSTS[windowPlacement.type], 0);
}

function doorsCost(plan: PlacedPlan): number {
  return plan.doors.reduce((sum, door) => sum + DOOR_COSTS[door.type], 0);
}

function extrasCost(plan: PlacedPlan): number {
  const hasGarage = plan.rooms.some((room) => room.type === 'garage');
  const garageCost = hasGarage ? GARAGE_FLAT_COST : 0;
  const porchSqft = plan.rooms
    .filter((room) => PORCH_TYPES.has(room.type))
    .reduce((sum, room) => sum + room.sqft, 0);

  return garageCost + porchSqft * PORCH_OUTDOOR_RATE_PER_SQFT;
}

export function estimateCost(plan: PlacedPlan, walls: WallAnalysis): CostEstimate {
  const sqft = structureSqft(plan);
  const structure = sqft * styleRate(plan.brief.style);
  const wallCost =
    walls.totalExteriorLength * EXTERIOR_WALL_RATE_PER_FT + walls.totalInteriorLength * INTERIOR_WALL_RATE_PER_FT;
  const plumbing = plumbingCost(plan, walls);
  const windows = windowsCost(plan);
  const doors = doorsCost(plan);
  const extras = extrasCost(plan);

  const breakdown: CostBreakdown = {
    structure: roundCurrency(structure),
    walls: roundCurrency(wallCost),
    plumbing: roundCurrency(plumbing),
    windows: roundCurrency(windows),
    doors: roundCurrency(doors),
    extras: roundCurrency(extras),
  };

  const totalEstimate = breakdown.structure + breakdown.walls + breakdown.plumbing + breakdown.windows + breakdown.doors + breakdown.extras;
  const perSqft = sqft > 0 ? totalEstimate / sqft : 0;
  const confidence: CostEstimate['confidence'] = plan.windows.length > 0 && walls.walls.length > 0 ? 'moderate' : 'rough';

  return {
    totalEstimate: roundCurrency(totalEstimate),
    breakdown,
    perSqft: Number(perSqft.toFixed(2)),
    confidence,
  };
}

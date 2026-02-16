import { normalizeDesignBrief } from './normalize';
import { computeEnvelope } from './envelope';
import { assignZones } from './zoning';
import { placeRooms } from './placement';
import { ensureCirculation } from './circulation';
import { assignWindows } from './windows';
import { analyzeWalls } from './walls';
import { scorePlan } from './scoring';
import { generateVariations } from './variations';
import type { DesignBrief, PlanScore } from './types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function isScoreInRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function assertScoreRange(score: PlanScore): void {
  const values = [
    score.overall,
    score.adjacencySatisfaction,
    score.zoneCohesion,
    score.naturalLight,
    score.plumbingEfficiency,
    score.circulationQuality,
    score.spaceUtilization,
    score.privacyGradient,
    score.overallBuildability,
  ];
  for (const value of values) {
    assert(isScoreInRange(value), `Expected score in [0, 100], got ${value}`);
  }
}

export const PRD_EXAMPLE_BRIEF: DesignBrief = {
  targetSqft: 1800,
  stories: 1,
  style: 'ranch',
  lot: {
    maxWidth: 110,
    maxDepth: 140,
    setbackFront: 20,
    setbackSide: 8,
    setbackRear: 25,
    entryFacing: 'south',
    garagePosition: 'left',
  },
  rooms: [
    { type: 'primary_bed', label: 'Primary Bedroom', mustHave: true, targetSqft: 240 },
    { type: 'bedroom', label: 'Bedroom 2', mustHave: true, targetSqft: 140 },
    { type: 'bedroom', label: 'Bedroom 3', mustHave: true, targetSqft: 135 },
    { type: 'primary_bath', label: 'Primary Bath', mustHave: true, targetSqft: 95 },
    { type: 'bathroom', label: 'Shared Bath', mustHave: true, targetSqft: 55 },
    { type: 'kitchen', label: 'Kitchen', mustHave: true, targetSqft: 185, adjacentTo: ['dining'] },
    { type: 'dining', label: 'Dining Room', mustHave: true, targetSqft: 145, adjacentTo: ['kitchen'] },
    { type: 'living', label: 'Living Room', mustHave: true, targetSqft: 275 },
    { type: 'laundry', label: 'Laundry', mustHave: true, targetSqft: 50 },
    { type: 'garage', label: 'Garage', mustHave: true, targetSqft: 450 },
  ],
};

export function runConstraintEngineTests(): { passed: string[] } {
  const passed: string[] = [];

  const normalized = normalizeDesignBrief(PRD_EXAMPLE_BRIEF);
  assert(normalized.rooms.some((room) => room.type === 'foyer'), 'Normalization should add implicit foyer.');
  assert(normalized.rooms.some((room) => room.type === 'hallway'), 'Normalization should add implicit hallway.');
  assert(
    normalized.rooms.some((room) => room.type === 'walk_in_closet'),
    'Normalization should add implicit closet for the primary suite.',
  );
  passed.push('normalization adds implicit rooms');

  const envelope = computeEnvelope(normalized);
  const expectedBuildableWidth = normalized.lot.maxWidth - normalized.lot.setbackSide * 2;
  const expectedBuildableDepth = normalized.lot.maxDepth - normalized.lot.setbackFront - normalized.lot.setbackRear;
  assert(envelope.buildableRect.width === expectedBuildableWidth, 'Envelope width should respect side setbacks.');
  assert(envelope.buildableRect.depth === expectedBuildableDepth, 'Envelope depth should respect front/rear setbacks.');
  assert(
    envelope.footprint.x >= envelope.buildableRect.x &&
      envelope.footprint.y >= envelope.buildableRect.y &&
      envelope.footprint.x + envelope.footprint.width <= envelope.buildableRect.x + envelope.buildableRect.width &&
      envelope.footprint.y + envelope.footprint.depth <= envelope.buildableRect.y + envelope.buildableRect.depth,
    'Footprint must remain within buildable rectangle.',
  );
  passed.push('envelope respects setbacks');

  const zoned = assignZones(normalized, envelope);
  const placed = placeRooms(zoned, envelope);
  assert(placed.unplacedRoomIds.length === 0, `Placement should fit all rooms, unplaced: ${placed.unplacedRoomIds.join(', ')}`);
  passed.push('placement fits all rooms');

  const circulated = ensureCirculation(placed);
  assert(circulated.circulation.isFullyConnected, 'Circulation should connect every room from entry.');
  passed.push('circulation connects all rooms');

  const windowed = assignWindows(circulated);
  const wallAnalysis = analyzeWalls(windowed);
  const score = scorePlan(windowed, wallAnalysis);
  assertScoreRange(score);
  passed.push('scoring returns valid metric ranges');

  const variations = generateVariations(normalized, envelope);
  assert(variations.length >= 4, `Variations should produce at least 4 plans, got ${variations.length}.`);
  passed.push('variations produce at least 4 plans');

  return { passed };
}

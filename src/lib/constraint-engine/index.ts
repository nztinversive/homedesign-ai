/**
 * Constraint Engine - Main Export
 */

export type {
  DesignBrief,
  RoomRequirement,
  LotConstraints,
  GeneratedPlan,
  PlacedRoom,
  Envelope,
  PlanScore,
  CirculationResult,
  Wall,
  Door,
  WindowPlacement,
  RoomType,
  HomeStyle,
  Zone,
  Rect,
  NormalizedRoom,
  NormalizedBrief,
  BuildingEnvelope,
  ZonedRoom,
  ZonedPlan,
  PlacedPlan,
  WallAnalysis,
  SharedWall,
} from './types';

export { normalizeDesignBrief } from './normalize';
export { computeEnvelope } from './envelope';
export { assignZones } from './zoning';
export { placeRooms } from './placement';
export { ensureCirculation } from './circulation';
export { assignWindows } from './windows';
export { analyzeWalls } from './walls';
export { scorePlan } from './scoring';
export { generateVariations } from './variations';
export { runConstraintEngineTests, PRD_EXAMPLE_BRIEF } from './test';

/**
 * Constraint Engine — Main Export
 *
 * Usage:
 *   import { generateVariations } from '@/lib/constraint-engine';
 *   const plans = generateVariations(brief, 6);
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
} from './types';

// Algorithm modules — will be implemented tonight
// export { normalizeRooms } from './normalize';
// export { generateEnvelope } from './envelope';
// export { zoneEnvelope } from './zoning';
// export { placeRooms } from './placement';
// export { addCirculation } from './circulation';
// export { addWindows } from './windows';
// export { generateWalls } from './walls';
// export { scorePlan } from './scoring';
// export { generateVariations } from './variations';

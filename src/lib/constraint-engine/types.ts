/**
 * Constraint Engine — Type Definitions
 * All interfaces for the floor plan generation system.
 */

// ─── Enums & Literals ─────────────────────────────────────────────

export type HomeStyle = 'modern' | 'traditional' | 'craftsman' | 'farmhouse' | 'contemporary' | 'ranch';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type Zone = 'social' | 'private' | 'service' | 'garage' | 'exterior' | 'circulation';
export type EnvelopeShape = 'rectangle' | 'l-shape' | 'u-shape' | 't-shape';
export type EnvelopeStrategy = 'rectangle' | 'l-shape-left' | 'l-shape-right' | 'u-shape' | 't-shape';

export type RoomType =
  | 'primary_bed' | 'bedroom' | 'primary_bath' | 'bathroom' | 'half_bath'
  | 'kitchen' | 'dining' | 'living' | 'family' | 'great_room'
  | 'office' | 'laundry' | 'mudroom' | 'pantry' | 'walk_in_closet'
  | 'garage' | 'front_porch' | 'back_porch' | 'outdoor_living'
  | 'foyer' | 'hallway' | 'stairs' | 'bonus' | 'theater' | 'gym';

// ─── Input Types ──────────────────────────────────────────────────

export interface DesignBrief {
  targetSqft: number;
  stories: 1 | 2;
  style: HomeStyle;
  rooms: RoomRequirement[];
  lot?: LotConstraints;
}

export interface RoomRequirement {
  type: RoomType;
  label: string;
  minSqft?: number;
  targetSqft?: number;
  mustHave: boolean;
  adjacentTo?: RoomType[];
  awayFrom?: RoomType[];
  needsExteriorWall?: boolean;
  needsPlumbing?: boolean;
  floor?: 1 | 2;
}

export interface LotConstraints {
  maxWidth: number;
  maxDepth: number;
  setbackFront: number;
  setbackSide: number;
  setbackRear: number;
  entryFacing: Direction;
  garagePosition?: 'left' | 'right' | 'rear' | 'none';
}

// ─── Internal Processing Types ────────────────────────────────────

export interface NormalizedRoom {
  id: string;
  type: RoomType;
  label: string;
  targetSqft: number;
  minSqft: number;
  minWidth: number;
  minDepth: number;
  targetWidth: number;
  targetDepth: number;
  needsExteriorWall: boolean;
  needsPlumbing: boolean;
  zone: Zone;
  mustHave: boolean;
  adjacentTo: RoomType[];
  awayFrom: RoomType[];
  floor?: 1 | 2;
  priority: number;
}

export interface RoomDefaults {
  minSqft: number;
  targetSqft: number;
  minWidth: number;
  minDepth: number;
  needsExteriorWall: boolean;
  needsPlumbing: boolean;
  zone: Zone;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  depth: number;
}

export interface ZonedRegion {
  zone: Zone;
  rect: Rect;
  floor: 1 | 2;
}

export interface CandidatePlacement {
  x: number;
  y: number;
  width: number;
  depth: number;
  floor: 1 | 2;
  score: number;
}

// ─── Output Types ─────────────────────────────────────────────────

export interface Envelope {
  shape: EnvelopeShape;
  segments: Rect[];
  totalSqft: number;
  boundingWidth: number;
  boundingDepth: number;
  streetFacing: Direction;
}

export interface PlacedRoom {
  id: string;
  type: RoomType;
  label: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  floor: 1 | 2;
  sqft: number;
  zone: Zone;
  rotation: 0 | 90;
  adjacentRoomIds: string[];
  exteriorWalls: Direction[];
  hasPlumbing: boolean;
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isExterior: boolean;
  isLoadBearing: boolean;
  thickness: number;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;
  width: number;
  type: 'standard' | 'double' | 'sliding' | 'pocket' | 'exterior';
  connectsRooms: [string, string];
}

export interface WindowPlacement {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number;
  type: 'standard' | 'picture' | 'bay' | 'clerestory';
}

export interface PlanScore {
  overall: number;
  naturalLight: number;
  circulation: number;
  privacy: number;
  buildability: number;
  adjacencyScore: number;
  plumbingEfficiency: number;
  sqftAccuracy: number;
}

export interface CirculationResult {
  isFullyConnected: boolean;
  deadEnds: string[];
  mainPath: string[];
  hallwayPercent: number;
  doors: Door[];
}

export interface GeneratedPlan {
  envelope: Envelope;
  rooms: PlacedRoom[];
  walls: Wall[];
  doors: Door[];
  windows: WindowPlacement[];
  circulation: CirculationResult;
  score: PlanScore;
  metadata: {
    generationTimeMs: number;
    seed: number;
    variationStrategy: string;
  };
}

export interface VariationStrategy {
  name: string;
  envelope: EnvelopeStrategy;
  zoneFlip?: boolean;
  mergeRooms?: RoomType[];
}

export interface WindowConfig {
  count: number;
  width: number;
  height: number;
  sillHeight: number;
}

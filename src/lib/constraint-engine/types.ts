/**
 * Constraint Engine - Type Definitions
 * All interfaces for the floor plan generation system.
 */

// Enums and literals

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

// Input types

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

// Internal processing types

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

export interface NormalizedBrief {
  targetSqft: number;
  stories: 1 | 2;
  style: HomeStyle;
  rooms: NormalizedRoom[];
  lot: LotConstraints;
  metadata: {
    impliedRoomIds: string[];
    warnings: string[];
  };
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

export interface FloorRects {
  1: Rect;
  2?: Rect;
}

export interface ZoneAnchor {
  zone: Zone;
  floor: 1 | 2;
  x: number;
  y: number;
}

export interface ZonedRoom extends NormalizedRoom {
  floor: 1 | 2;
}

export interface ZonedPlan {
  brief: NormalizedBrief;
  envelope: BuildingEnvelope;
  rooms: ZonedRoom[];
  zoneRegions: ZonedRegion[];
  zoneAnchors: ZoneAnchor[];
}

// Output types

export interface Envelope {
  shape: EnvelopeShape;
  segments: Rect[];
  totalSqft: number;
  boundingWidth: number;
  boundingDepth: number;
  streetFacing: Direction;
}

export interface BuildingEnvelope extends Envelope {
  lot: LotConstraints;
  buildableRect: Rect;
  footprint: Rect;
  floorRects: FloorRects;
  targetSqftPerFloor: number;
  gridResolution: 1;
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
  targetSqft?: number;
  minSqft?: number;
  needsExteriorWall?: boolean;
  needsPlumbing?: boolean;
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
  roomId?: string;
  floor?: 1 | 2;
  wallDirection?: Direction;
}

export interface SharedWall {
  id: string;
  roomAId: string;
  roomBId: string;
  length: number;
  orientation: 'horizontal' | 'vertical';
}

export interface WallAnalysis {
  walls: Wall[];
  sharedWalls: SharedWall[];
  wetWalls: SharedWall[];
  totalExteriorLength: number;
  totalInteriorLength: number;
  plumbingGroups: string[][];
}

export interface PlanScore {
  overall: number;

  // Required 8 metrics
  adjacencySatisfaction: number;
  zoneCohesion: number;
  naturalLight: number;
  plumbingEfficiency: number;
  circulationQuality: number;
  spaceUtilization: number;
  privacyGradient: number;
  overallBuildability: number;

  // Compatibility aliases for legacy consumers.
  adjacencyScore: number;
  circulation: number;
  privacy: number;
  buildability: number;
  sqftAccuracy: number;
}

export interface CirculationResult {
  isFullyConnected: boolean;
  deadEnds: string[];
  mainPath: string[];
  hallwayPercent: number;
  doors: Door[];
}

export interface PlacedPlan {
  brief: NormalizedBrief;
  envelope: BuildingEnvelope;
  rooms: PlacedRoom[];
  doors: Door[];
  windows: WindowPlacement[];
  circulation: CirculationResult;
  unplacedRoomIds: string[];
  metadata: {
    strategy: string;
    warnings: string[];
  };
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

export interface VariationOptions {
  name: string;
  mirrorX?: boolean;
  mirrorY?: boolean;
  swapSocialPrivate?: boolean;
  rotateEntry?: boolean;
  widthBias?: number;
  placementOrder?: 'default' | 'priority' | 'zone' | 'reverse';
}

export interface PlacementOptions {
  placementOrder?: 'default' | 'priority' | 'zone' | 'reverse';
  widthBias?: number;
}

export interface ZoningOptions {
  swapSocialPrivate?: boolean;
  rotateEntry?: boolean;
}

/**
 * Constraint Engine — Constants
 * Room defaults, adjacency rules, window configs.
 */

import type { RoomDefaults, RoomType, WindowConfig, Zone } from './types';

// ─── Room Defaults ────────────────────────────────────────────────

export const ROOM_DEFAULTS: Record<RoomType, RoomDefaults> = {
  primary_bed:    { minSqft: 180, targetSqft: 250, minWidth: 12, minDepth: 14, needsExteriorWall: true,  needsPlumbing: false, zone: 'private' },
  bedroom:        { minSqft: 100, targetSqft: 140, minWidth: 10, minDepth: 10, needsExteriorWall: true,  needsPlumbing: false, zone: 'private' },
  primary_bath:   { minSqft: 60,  targetSqft: 100, minWidth: 8,  minDepth: 8,  needsExteriorWall: false, needsPlumbing: true,  zone: 'private' },
  bathroom:       { minSqft: 35,  targetSqft: 50,  minWidth: 5,  minDepth: 7,  needsExteriorWall: false, needsPlumbing: true,  zone: 'private' },
  half_bath:      { minSqft: 18,  targetSqft: 25,  minWidth: 3,  minDepth: 6,  needsExteriorWall: false, needsPlumbing: true,  zone: 'service' },
  kitchen:        { minSqft: 100, targetSqft: 180, minWidth: 10, minDepth: 10, needsExteriorWall: true,  needsPlumbing: true,  zone: 'social' },
  dining:         { minSqft: 100, targetSqft: 150, minWidth: 10, minDepth: 10, needsExteriorWall: true,  needsPlumbing: false, zone: 'social' },
  living:         { minSqft: 150, targetSqft: 250, minWidth: 12, minDepth: 14, needsExteriorWall: true,  needsPlumbing: false, zone: 'social' },
  family:         { minSqft: 150, targetSqft: 250, minWidth: 12, minDepth: 14, needsExteriorWall: true,  needsPlumbing: false, zone: 'social' },
  great_room:     { minSqft: 250, targetSqft: 400, minWidth: 16, minDepth: 18, needsExteriorWall: true,  needsPlumbing: false, zone: 'social' },
  office:         { minSqft: 80,  targetSqft: 120, minWidth: 8,  minDepth: 10, needsExteriorWall: true,  needsPlumbing: false, zone: 'private' },
  laundry:        { minSqft: 30,  targetSqft: 50,  minWidth: 5,  minDepth: 6,  needsExteriorWall: false, needsPlumbing: true,  zone: 'service' },
  mudroom:        { minSqft: 30,  targetSqft: 50,  minWidth: 5,  minDepth: 6,  needsExteriorWall: true,  needsPlumbing: false, zone: 'service' },
  pantry:         { minSqft: 16,  targetSqft: 30,  minWidth: 4,  minDepth: 4,  needsExteriorWall: false, needsPlumbing: false, zone: 'service' },
  walk_in_closet: { minSqft: 25,  targetSqft: 50,  minWidth: 5,  minDepth: 5,  needsExteriorWall: false, needsPlumbing: false, zone: 'private' },
  garage:         { minSqft: 400, targetSqft: 576, minWidth: 20, minDepth: 20, needsExteriorWall: true,  needsPlumbing: false, zone: 'garage' },
  front_porch:    { minSqft: 40,  targetSqft: 80,  minWidth: 8,  minDepth: 5,  needsExteriorWall: true,  needsPlumbing: false, zone: 'exterior' },
  back_porch:     { minSqft: 60,  targetSqft: 120, minWidth: 10, minDepth: 6,  needsExteriorWall: true,  needsPlumbing: false, zone: 'exterior' },
  outdoor_living: { minSqft: 100, targetSqft: 200, minWidth: 10, minDepth: 10, needsExteriorWall: true,  needsPlumbing: false, zone: 'exterior' },
  foyer:          { minSqft: 25,  targetSqft: 50,  minWidth: 5,  minDepth: 5,  needsExteriorWall: true,  needsPlumbing: false, zone: 'social' },
  hallway:        { minSqft: 20,  targetSqft: 40,  minWidth: 3,  minDepth: 6,  needsExteriorWall: false, needsPlumbing: false, zone: 'circulation' },
  stairs:         { minSqft: 30,  targetSqft: 40,  minWidth: 3,  minDepth: 10, needsExteriorWall: false, needsPlumbing: false, zone: 'circulation' },
  bonus:          { minSqft: 100, targetSqft: 200, minWidth: 10, minDepth: 10, needsExteriorWall: true,  needsPlumbing: false, zone: 'private' },
  theater:        { minSqft: 150, targetSqft: 250, minWidth: 12, minDepth: 14, needsExteriorWall: false, needsPlumbing: false, zone: 'private' },
  gym:            { minSqft: 100, targetSqft: 150, minWidth: 10, minDepth: 10, needsExteriorWall: false, needsPlumbing: false, zone: 'private' },
};

// ─── Adjacency Rules ──────────────────────────────────────────────

/** Hard rules: MUST be adjacent (share a wall or door) */
export const HARD_ADJACENCY: [RoomType, RoomType][] = [
  ['primary_bed', 'primary_bath'],
  ['primary_bed', 'walk_in_closet'],
  ['kitchen', 'dining'],
  ['foyer', 'living'],
  ['mudroom', 'garage'],
  ['pantry', 'kitchen'],
];

/** Soft rules: SHOULD be adjacent (bonus points if they are) */
export const SOFT_ADJACENCY: [RoomType, RoomType, number][] = [
  ['kitchen', 'living', 5],
  ['kitchen', 'family', 5],
  ['kitchen', 'outdoor_living', 4],
  ['dining', 'living', 4],
  ['living', 'front_porch', 3],
  ['family', 'back_porch', 3],
  ['laundry', 'primary_bed', 3],
  ['laundry', 'garage', 2],
  ['office', 'foyer', 2],
];

/** Anti-adjacency: SHOULD NOT share a wall (penalty if they do) */
export const ANTI_ADJACENCY: [RoomType, RoomType, number][] = [
  ['primary_bed', 'garage', -8],
  ['bedroom', 'garage', -6],
  ['primary_bed', 'kitchen', -5],
  ['bedroom', 'kitchen', -4],
  ['office', 'kitchen', -3],
  ['theater', 'kitchen', -4],
  ['primary_bed', 'laundry', -3],
];

/** Open concept pairs: no wall/door between these rooms */
export const OPEN_CONCEPT_PAIRS: [RoomType, RoomType][] = [
  ['kitchen', 'dining'],
  ['kitchen', 'living'],
  ['kitchen', 'family'],
  ['kitchen', 'great_room'],
  ['living', 'dining'],
  ['living', 'foyer'],
  ['family', 'kitchen'],
];

// ─── Zone Priority (for room placement order) ─────────────────────

export const ZONE_PRIORITY: Record<Zone, number> = {
  garage: 100,
  social: 80,
  private: 60,
  service: 40,
  circulation: 20,
  exterior: 10,
};

// ─── Style → Envelope Strategy Mapping ────────────────────────────

export const STYLE_STRATEGIES: Record<string, string[]> = {
  ranch:        ['rectangle', 'l-shape-left', 'l-shape-right'],
  modern:       ['rectangle', 'l-shape-left', 'l-shape-right', 'u-shape'],
  contemporary: ['l-shape-left', 'l-shape-right', 'u-shape', 't-shape'],
  craftsman:    ['rectangle', 'l-shape-left', 'l-shape-right'],
  farmhouse:    ['rectangle', 'l-shape-left', 't-shape'],
  traditional:  ['rectangle', 'l-shape-left', 'l-shape-right'],
};

// ─── Window Rules ─────────────────────────────────────────────────

export const WINDOW_RULES: Partial<Record<RoomType, WindowConfig>> = {
  primary_bed:  { count: 2, width: 4, height: 5, sillHeight: 3 },
  bedroom:      { count: 1, width: 3, height: 4, sillHeight: 3 },
  living:       { count: 2, width: 5, height: 5, sillHeight: 2 },
  family:       { count: 2, width: 5, height: 5, sillHeight: 2 },
  great_room:   { count: 3, width: 5, height: 6, sillHeight: 2 },
  kitchen:      { count: 1, width: 4, height: 3, sillHeight: 3.5 },
  dining:       { count: 1, width: 4, height: 5, sillHeight: 2.5 },
  office:       { count: 1, width: 3, height: 4, sillHeight: 3 },
  primary_bath: { count: 1, width: 2, height: 2, sillHeight: 5 },
  bathroom:     { count: 1, width: 2, height: 2, sillHeight: 5 },
};

// ─── Wall Thickness ───────────────────────────────────────────────

export const EXTERIOR_WALL_THICKNESS = 6; // inches
export const INTERIOR_WALL_THICKNESS = 4; // inches

// ─── Default Room Labels ──────────────────────────────────────────

export const DEFAULT_LABELS: Partial<Record<RoomType, string>> = {
  primary_bed: 'Primary Bedroom',
  bedroom: 'Bedroom',
  primary_bath: 'Primary Bath',
  bathroom: 'Bathroom',
  half_bath: 'Half Bath',
  kitchen: 'Kitchen',
  dining: 'Dining Room',
  living: 'Living Room',
  family: 'Family Room',
  great_room: 'Great Room',
  office: 'Office',
  laundry: 'Laundry',
  mudroom: 'Mudroom',
  pantry: 'Pantry',
  walk_in_closet: 'Walk-in Closet',
  garage: 'Garage',
  front_porch: 'Front Porch',
  back_porch: 'Back Porch',
  outdoor_living: 'Outdoor Living',
  foyer: 'Foyer',
  hallway: 'Hallway',
  stairs: 'Stairs',
  bonus: 'Bonus Room',
  theater: 'Theater',
  gym: 'Gym',
};

// ─── Variation Strategies ─────────────────────────────────────────

export const VARIATION_STRATEGIES = [
  { name: 'compact-rectangle', envelope: 'rectangle' as const, zoneFlip: false },
  { name: 'l-shape-left', envelope: 'l-shape-left' as const, zoneFlip: false },
  { name: 'l-shape-right', envelope: 'l-shape-right' as const, zoneFlip: false },
  { name: 'social-front', envelope: 'rectangle' as const, zoneFlip: false },
  { name: 'social-rear', envelope: 'rectangle' as const, zoneFlip: true },
  { name: 'open-concept-l', envelope: 'l-shape-left' as const, mergeRooms: ['kitchen' as RoomType, 'dining' as RoomType, 'living' as RoomType] },
];

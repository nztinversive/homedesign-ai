import type {
  BuildingEnvelope,
  CandidatePlacement,
  Direction,
  PlacementOptions,
  PlacedPlan,
  PlacedRoom,
  Rect,
  Zone,
  ZonedPlan,
  ZonedRoom,
} from './types';

type OccupancyGrid = boolean[][];

function createGrid(width: number, depth: number): OccupancyGrid {
  return Array.from({ length: depth }, () => Array.from({ length: width }, () => false));
}

function createFloorGrids(envelope: BuildingEnvelope): { 1: OccupancyGrid; 2?: OccupancyGrid } {
  const floor1 = envelope.floorRects[1];
  const floor2 = envelope.floorRects[2];
  return {
    1: createGrid(Math.floor(floor1.width), Math.floor(floor1.depth)),
    ...(floor2 ? { 2: createGrid(Math.floor(floor2.width), Math.floor(floor2.depth)) } : {}),
  };
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function areAdjacent(a: PlacedRoom, b: PlacedRoom): boolean {
  if (a.floor !== b.floor) {
    return false;
  }

  const verticalTouch =
    (a.x + a.width === b.x || b.x + b.width === a.x) &&
    overlapLength(a.y, a.y + a.depth, b.y, b.y + b.depth) > 0;

  const horizontalTouch =
    (a.y + a.depth === b.y || b.y + b.depth === a.y) &&
    overlapLength(a.x, a.x + a.width, b.x, b.x + b.width) > 0;

  return verticalTouch || horizontalTouch;
}

function manhattanDistanceBetweenRooms(a: PlacedRoom, b: PlacedRoom): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.depth / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.depth / 2;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function rectForFloor(envelope: BuildingEnvelope, floor: 1 | 2): Rect | undefined {
  return envelope.floorRects[floor];
}

function getExteriorWalls(rect: Rect, candidate: CandidatePlacement): Direction[] {
  const walls: Direction[] = [];
  if (candidate.x === rect.x) {
    walls.push('west');
  }
  if (candidate.x + candidate.width === rect.x + rect.width) {
    walls.push('east');
  }
  if (candidate.y === rect.y) {
    walls.push('north');
  }
  if (candidate.y + candidate.depth === rect.y + rect.depth) {
    walls.push('south');
  }
  return walls;
}

function isRectFree(
  grid: OccupancyGrid,
  floorRect: Rect,
  x: number,
  y: number,
  width: number,
  depth: number,
): boolean {
  const localX = x - floorRect.x;
  const localY = y - floorRect.y;
  if (localX < 0 || localY < 0) {
    return false;
  }
  if (localX + width > grid[0].length || localY + depth > grid.length) {
    return false;
  }

  for (let row = localY; row < localY + depth; row += 1) {
    for (let col = localX; col < localX + width; col += 1) {
      if (grid[row][col]) {
        return false;
      }
    }
  }
  return true;
}

function markRect(grid: OccupancyGrid, floorRect: Rect, room: PlacedRoom): void {
  const localX = room.x - floorRect.x;
  const localY = room.y - floorRect.y;
  for (let row = localY; row < localY + room.depth; row += 1) {
    for (let col = localX; col < localX + room.width; col += 1) {
      grid[row][col] = true;
    }
  }
}

function zoneAnchorLookup(zoned: ZonedPlan): Map<string, { x: number; y: number }> {
  const lookup = new Map<string, { x: number; y: number }>();
  for (const anchor of zoned.zoneAnchors) {
    const key = `${anchor.zone}:${anchor.floor}`;
    if (!lookup.has(key)) {
      lookup.set(key, { x: anchor.x, y: anchor.y });
    }
  }
  return lookup;
}

function dimensionCandidates(room: ZonedRoom, widthBias = 0): Array<{ width: number; depth: number; rotation: 0 | 90 }> {
  const candidates: Array<{ width: number; depth: number; rotation: 0 | 90 }> = [];
  const scales = [1, 0.95, 0.9, 0.85, 0.8, 0.75];
  const seen = new Set<string>();

  for (const scale of scales) {
    const scaledSqft = Math.max(room.minSqft, Math.round(room.targetSqft * scale));
    const width = Math.max(room.minWidth, Math.round((room.targetWidth + widthBias) * scale));
    const depth = Math.max(room.minDepth, Math.ceil(scaledSqft / width));
    const a = { width, depth, rotation: 0 as const };
    const b = { width: depth, depth: width, rotation: 90 as const };
    const encodedA = `${a.width}x${a.depth}:0`;
    const encodedB = `${b.width}x${b.depth}:90`;

    if (a.width * a.depth >= room.minSqft && !seen.has(encodedA)) {
      candidates.push(a);
      seen.add(encodedA);
    }
    if (b.width * b.depth >= room.minSqft && !seen.has(encodedB)) {
      candidates.push(b);
      seen.add(encodedB);
    }
  }

  return candidates;
}

function orderedRooms(rooms: ZonedRoom[], order: PlacementOptions['placementOrder']): ZonedRoom[] {
  const cloned = [...rooms];
  const zoneRank: Record<Zone, number> = {
    garage: 0,
    social: 1,
    private: 2,
    service: 3,
    circulation: 4,
    exterior: 5,
  };

  if (order === 'zone') {
    return cloned.sort((a, b) => zoneRank[a.zone] - zoneRank[b.zone] || b.targetSqft - a.targetSqft || b.priority - a.priority);
  }

  if (order === 'reverse') {
    return cloned.sort((a, b) => a.targetSqft - b.targetSqft || a.priority - b.priority);
  }

  if (order === 'priority') {
    return cloned.sort((a, b) => b.priority - a.priority || b.targetSqft - a.targetSqft);
  }

  // Default: largest-first.
  return cloned.sort((a, b) => b.targetSqft - a.targetSqft || b.priority - a.priority);
}

function scoreCandidate(
  room: ZonedRoom,
  candidate: CandidatePlacement,
  floorRect: Rect,
  placedRooms: PlacedRoom[],
  zoneAnchors: Map<string, { x: number; y: number }>,
): number {
  let score = 0;
  const exteriorWalls = getExteriorWalls(floorRect, candidate);
  const candidateRoom: PlacedRoom = {
    id: room.id,
    type: room.type,
    label: room.label,
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    depth: candidate.depth,
    floor: candidate.floor,
    sqft: candidate.width * candidate.depth,
    zone: room.zone,
    rotation: 0,
    adjacentRoomIds: [],
    exteriorWalls,
    hasPlumbing: room.needsPlumbing,
    targetSqft: room.targetSqft,
    minSqft: room.minSqft,
    needsExteriorWall: room.needsExteriorWall,
    needsPlumbing: room.needsPlumbing,
  };

  const anchor = zoneAnchors.get(`${room.zone}:${candidate.floor}`);
  if (anchor) {
    const centerX = candidate.x + candidate.width / 2;
    const centerY = candidate.y + candidate.depth / 2;
    const distance = Math.abs(anchor.x - centerX) + Math.abs(anchor.y - centerY);
    score += Math.max(0, 220 - distance * 8);
  }

  if (room.needsExteriorWall) {
    score += exteriorWalls.length > 0 ? 260 : -400;
  } else {
    score += exteriorWalls.length * 8;
  }

  for (const existing of placedRooms) {
    if (existing.floor !== candidate.floor) {
      continue;
    }
    const distance = manhattanDistanceBetweenRooms(existing, candidateRoom);
    const touches = areAdjacent(existing, candidateRoom);
    const desiredAdjacency = room.adjacentTo.includes(existing.type);
    const desiredSeparation = room.awayFrom.includes(existing.type);

    if (desiredAdjacency) {
      score += touches ? 140 : Math.max(0, 40 - distance * 3);
    } else if (touches) {
      score += 12;
    }

    if (desiredSeparation) {
      score -= touches ? 180 : Math.max(0, 50 - distance * 4);
    }

    if (existing.zone === room.zone) {
      score += Math.max(0, 30 - distance * 2);
    }
  }

  const normalizedSqftDelta = Math.abs(candidate.width * candidate.depth - room.targetSqft) / Math.max(room.targetSqft, 1);
  score -= normalizedSqftDelta * 60;

  return score;
}

function bestPlacementForRoom(
  room: ZonedRoom,
  floorRect: Rect,
  grid: OccupancyGrid,
  placedRooms: PlacedRoom[],
  zoneAnchors: Map<string, { x: number; y: number }>,
  widthBias = 0,
): CandidatePlacement | undefined {
  let best: CandidatePlacement | undefined;

  const dimCandidates = dimensionCandidates(room, widthBias);
  for (const dims of dimCandidates) {
    if (dims.width > floorRect.width || dims.depth > floorRect.depth) {
      continue;
    }

    const maxX = floorRect.x + floorRect.width - dims.width;
    const maxY = floorRect.y + floorRect.depth - dims.depth;

    for (let y = floorRect.y; y <= maxY; y += 1) {
      for (let x = floorRect.x; x <= maxX; x += 1) {
        if (!isRectFree(grid, floorRect, x, y, dims.width, dims.depth)) {
          continue;
        }
        const placement: CandidatePlacement = {
          x,
          y,
          width: dims.width,
          depth: dims.depth,
          floor: room.floor,
          score: 0,
        };
        placement.score = scoreCandidate(room, placement, floorRect, placedRooms, zoneAnchors);
        if (!best || placement.score > best.score) {
          best = placement;
        }
      }
    }
  }

  return best;
}

function populateAdjacency(rooms: PlacedRoom[]): void {
  for (const room of rooms) {
    room.adjacentRoomIds = [];
  }

  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const a = rooms[i];
      const b = rooms[j];
      if (!areAdjacent(a, b)) {
        continue;
      }
      a.adjacentRoomIds.push(b.id);
      b.adjacentRoomIds.push(a.id);
    }
  }
}

export function placeRooms(
  zoned: ZonedPlan,
  envelope: BuildingEnvelope,
  options: PlacementOptions = {},
): PlacedPlan {
  const floorGrids = createFloorGrids(envelope);
  const placedRooms: PlacedRoom[] = [];
  const unplacedRoomIds: string[] = [];
  const warnings: string[] = [];
  const zoneAnchors = zoneAnchorLookup(zoned);
  const widthBias = options.widthBias ?? 0;

  const roomsInPlacementOrder = orderedRooms(zoned.rooms, options.placementOrder);
  for (const room of roomsInPlacementOrder) {
    const floorRect = rectForFloor(envelope, room.floor);
    const floorGrid = room.floor === 1 ? floorGrids[1] : floorGrids[2];

    if (!floorRect || !floorGrid) {
      unplacedRoomIds.push(room.id);
      warnings.push(`No floor geometry available for ${room.id} on floor ${room.floor}.`);
      continue;
    }

    const best = bestPlacementForRoom(room, floorRect, floorGrid, placedRooms, zoneAnchors, widthBias);
    if (!best) {
      unplacedRoomIds.push(room.id);
      warnings.push(`Unable to place ${room.id} (${room.type}) within floor envelope.`);
      continue;
    }

    const exteriorWalls = getExteriorWalls(floorRect, best);
    const placed: PlacedRoom = {
      id: room.id,
      type: room.type,
      label: room.label,
      x: best.x,
      y: best.y,
      width: best.width,
      depth: best.depth,
      floor: best.floor,
      sqft: best.width * best.depth,
      zone: room.zone,
      rotation: 0,
      adjacentRoomIds: [],
      exteriorWalls,
      hasPlumbing: room.needsPlumbing,
      targetSqft: room.targetSqft,
      minSqft: room.minSqft,
      needsExteriorWall: room.needsExteriorWall,
      needsPlumbing: room.needsPlumbing,
    };
    markRect(floorGrid, floorRect, placed);
    placedRooms.push(placed);
  }

  populateAdjacency(placedRooms);

  return {
    brief: zoned.brief,
    envelope,
    rooms: placedRooms,
    doors: [],
    windows: [],
    circulation: {
      isFullyConnected: false,
      deadEnds: [],
      mainPath: [],
      hallwayPercent: 0,
      doors: [],
    },
    unplacedRoomIds,
    metadata: {
      strategy: 'greedy-occupancy-grid',
      warnings,
    },
  };
}

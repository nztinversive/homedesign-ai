import { EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from './constants';
import type { PlacedPlan, PlacedRoom, SharedWall, Wall, WallAnalysis } from './types';

function wallLength(wall: Wall): number {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function roomWalls(room: PlacedRoom): Wall[] {
  const north: Wall = {
    id: `${room.id}-north`,
    x1: room.x,
    y1: room.y,
    x2: room.x + room.width,
    y2: room.y,
    isExterior: room.exteriorWalls.includes('north'),
    isLoadBearing: room.exteriorWalls.includes('north'),
    thickness: room.exteriorWalls.includes('north') ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS,
  };
  const south: Wall = {
    id: `${room.id}-south`,
    x1: room.x,
    y1: room.y + room.depth,
    x2: room.x + room.width,
    y2: room.y + room.depth,
    isExterior: room.exteriorWalls.includes('south'),
    isLoadBearing: room.exteriorWalls.includes('south'),
    thickness: room.exteriorWalls.includes('south') ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS,
  };
  const west: Wall = {
    id: `${room.id}-west`,
    x1: room.x,
    y1: room.y,
    x2: room.x,
    y2: room.y + room.depth,
    isExterior: room.exteriorWalls.includes('west'),
    isLoadBearing: room.exteriorWalls.includes('west'),
    thickness: room.exteriorWalls.includes('west') ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS,
  };
  const east: Wall = {
    id: `${room.id}-east`,
    x1: room.x + room.width,
    y1: room.y,
    x2: room.x + room.width,
    y2: room.y + room.depth,
    isExterior: room.exteriorWalls.includes('east'),
    isLoadBearing: room.exteriorWalls.includes('east'),
    thickness: room.exteriorWalls.includes('east') ? EXTERIOR_WALL_THICKNESS : INTERIOR_WALL_THICKNESS,
  };

  return [north, south, east, west];
}

function sharedWallBetween(roomA: PlacedRoom, roomB: PlacedRoom): SharedWall[] {
  if (roomA.floor !== roomB.floor) {
    return [];
  }

  const shared: SharedWall[] = [];
  const northSouthOverlap = overlapLength(roomA.x, roomA.x + roomA.width, roomB.x, roomB.x + roomB.width);
  const eastWestOverlap = overlapLength(roomA.y, roomA.y + roomA.depth, roomB.y, roomB.y + roomB.depth);

  if (roomA.y + roomA.depth === roomB.y && northSouthOverlap > 0) {
    shared.push({
      id: `shared-${roomA.id}-${roomB.id}-h1`,
      roomAId: roomA.id,
      roomBId: roomB.id,
      length: northSouthOverlap,
      orientation: 'horizontal',
    });
  }
  if (roomB.y + roomB.depth === roomA.y && northSouthOverlap > 0) {
    shared.push({
      id: `shared-${roomA.id}-${roomB.id}-h2`,
      roomAId: roomA.id,
      roomBId: roomB.id,
      length: northSouthOverlap,
      orientation: 'horizontal',
    });
  }
  if (roomA.x + roomA.width === roomB.x && eastWestOverlap > 0) {
    shared.push({
      id: `shared-${roomA.id}-${roomB.id}-v1`,
      roomAId: roomA.id,
      roomBId: roomB.id,
      length: eastWestOverlap,
      orientation: 'vertical',
    });
  }
  if (roomB.x + roomB.width === roomA.x && eastWestOverlap > 0) {
    shared.push({
      id: `shared-${roomA.id}-${roomB.id}-v2`,
      roomAId: roomA.id,
      roomBId: roomB.id,
      length: eastWestOverlap,
      orientation: 'vertical',
    });
  }

  return shared;
}

function plumbingGroups(rooms: PlacedRoom[], wetWalls: SharedWall[]): string[][] {
  const plumbingRooms = rooms.filter((room) => room.hasPlumbing).map((room) => room.id);
  const graph = new Map<string, Set<string>>();
  for (const id of plumbingRooms) {
    graph.set(id, new Set());
  }

  for (const wall of wetWalls) {
    graph.get(wall.roomAId)?.add(wall.roomBId);
    graph.get(wall.roomBId)?.add(wall.roomAId);
  }

  const groups: string[][] = [];
  const seen = new Set<string>();
  for (const id of plumbingRooms) {
    if (seen.has(id)) {
      continue;
    }
    const queue = [id];
    const group: string[] = [];
    seen.add(id);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      group.push(current);
      for (const neighbor of Array.from(graph.get(current) ?? new Set<string>())) {
        if (seen.has(neighbor)) {
          continue;
        }
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
    groups.push(group);
  }

  return groups;
}

export function analyzeWalls(plan: PlacedPlan): WallAnalysis {
  const walls: Wall[] = [];
  for (const room of plan.rooms) {
    walls.push(...roomWalls(room));
  }

  const sharedWalls: SharedWall[] = [];
  for (let i = 0; i < plan.rooms.length; i += 1) {
    for (let j = i + 1; j < plan.rooms.length; j += 1) {
      sharedWalls.push(...sharedWallBetween(plan.rooms[i], plan.rooms[j]));
    }
  }

  const roomById = new Map(plan.rooms.map((room) => [room.id, room] as const));
  const wetWalls = sharedWalls.filter((shared) => {
    const roomA = roomById.get(shared.roomAId);
    const roomB = roomById.get(shared.roomBId);
    return Boolean(roomA?.hasPlumbing && roomB?.hasPlumbing);
  });

  const totalExteriorLength = walls.filter((wall) => wall.isExterior).reduce((sum, wall) => sum + wallLength(wall), 0);
  const totalInteriorLength = sharedWalls.reduce((sum, wall) => sum + wall.length, 0);

  return {
    walls,
    sharedWalls,
    wetWalls,
    totalExteriorLength,
    totalInteriorLength,
    plumbingGroups: plumbingGroups(plan.rooms, wetWalls),
  };
}

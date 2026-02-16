import type { Door, PlacedPlan, PlacedRoom, Rect } from './types';

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

function center(room: PlacedRoom): { x: number; y: number } {
  return { x: room.x + room.width / 2, y: room.y + room.depth / 2 };
}

function manhattan(a: PlacedRoom, b: PlacedRoom): number {
  const ac = center(a);
  const bc = center(b);
  return Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y);
}

function cloneRoom(room: PlacedRoom): PlacedRoom {
  return {
    ...room,
    adjacentRoomIds: [...room.adjacentRoomIds],
  };
}

function rebuildAdjacency(rooms: PlacedRoom[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const room of rooms) {
    graph.set(room.id, new Set(room.adjacentRoomIds));
  }

  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const a = rooms[i];
      const b = rooms[j];
      if (!areAdjacent(a, b)) {
        continue;
      }
      graph.get(a.id)?.add(b.id);
      graph.get(b.id)?.add(a.id);
    }
  }

  for (const room of rooms) {
    room.adjacentRoomIds = Array.from(graph.get(room.id) ?? []);
  }
  return graph;
}

function findEntryRoom(rooms: PlacedRoom[]): PlacedRoom | undefined {
  return (
    rooms.find((room) => room.type === 'foyer') ??
    rooms.find((room) => room.type === 'living') ??
    rooms.find((room) => room.zone === 'social') ??
    rooms[0]
  );
}

function bfs(graph: Map<string, Set<string>>, startId: string): { visited: Set<string>; parent: Map<string, string | undefined> } {
  const visited = new Set<string>();
  const parent = new Map<string, string | undefined>();
  const queue: string[] = [startId];
  visited.add(startId);
  parent.set(startId, undefined);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const neighbors = graph.get(current) ?? new Set<string>();
    for (const neighbor of Array.from(neighbors)) {
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      parent.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  return { visited, parent };
}

function connectedComponents(graph: Map<string, Set<string>>): string[][] {
  const components: string[][] = [];
  const seen = new Set<string>();

  for (const node of Array.from(graph.keys())) {
    if (seen.has(node)) {
      continue;
    }
    const queue: string[] = [node];
    const component: string[] = [];
    seen.add(node);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      component.push(current);
      for (const neighbor of Array.from(graph.get(current) ?? new Set<string>())) {
        if (seen.has(neighbor)) {
          continue;
        }
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roomExteriorWalls(room: PlacedRoom, floorRect: Rect): Array<'north' | 'south' | 'east' | 'west'> {
  const walls: Array<'north' | 'south' | 'east' | 'west'> = [];
  if (room.x === floorRect.x) {
    walls.push('west');
  }
  if (room.x + room.width === floorRect.x + floorRect.width) {
    walls.push('east');
  }
  if (room.y === floorRect.y) {
    walls.push('north');
  }
  if (room.y + room.depth === floorRect.y + floorRect.depth) {
    walls.push('south');
  }
  return walls;
}

function nearestPair(componentA: PlacedRoom[], componentB: PlacedRoom[]): { a: PlacedRoom; b: PlacedRoom } | undefined {
  let best: { a: PlacedRoom; b: PlacedRoom; distance: number } | undefined;
  for (const a of componentA) {
    for (const b of componentB) {
      if (a.floor !== b.floor) {
        continue;
      }
      const distance = manhattan(a, b);
      if (!best || distance < best.distance) {
        best = { a, b, distance };
      }
    }
  }
  if (!best) {
    return undefined;
  }
  return { a: best.a, b: best.b };
}

function addDoor(doors: Door[], a: PlacedRoom, b: PlacedRoom, index: number): void {
  doors.push({
    id: `door-auto-${index}`,
    wallId: `shared-${a.id}-${b.id}`,
    position: 0.5,
    width: 3,
    type: 'standard',
    connectsRooms: [a.id, b.id],
  });
}

function createHallwayBetween(
  a: PlacedRoom,
  b: PlacedRoom,
  floorRect: Rect,
  hallwayIndex: number,
): PlacedRoom {
  const aCenter = center(a);
  const bCenter = center(b);
  const dx = bCenter.x - aCenter.x;
  const dy = bCenter.y - aCenter.y;

  let width = 3;
  let depth = 6;
  let x = Math.floor((aCenter.x + bCenter.x) / 2) - 1;
  let y = Math.floor((aCenter.y + bCenter.y) / 2) - 3;

  if (Math.abs(dx) >= Math.abs(dy)) {
    width = Math.max(6, Math.round(Math.abs(dx)));
    depth = 3;
    x = Math.floor(Math.min(aCenter.x, bCenter.x));
    y = Math.floor((aCenter.y + bCenter.y) / 2) - 1;
  } else {
    width = 3;
    depth = Math.max(6, Math.round(Math.abs(dy)));
    x = Math.floor((aCenter.x + bCenter.x) / 2) - 1;
    y = Math.floor(Math.min(aCenter.y, bCenter.y));
  }

  width = Math.max(3, width);
  depth = Math.max(6, depth);

  x = clamp(x, floorRect.x, floorRect.x + floorRect.width - width);
  y = clamp(y, floorRect.y, floorRect.y + floorRect.depth - depth);

  const hallway: PlacedRoom = {
    id: `hallway-auto-${hallwayIndex}`,
    type: 'hallway',
    label: `Auto Hallway ${hallwayIndex}`,
    x,
    y,
    width,
    depth,
    floor: a.floor,
    sqft: width * depth,
    zone: 'circulation',
    rotation: 0,
    adjacentRoomIds: [a.id, b.id],
    exteriorWalls: roomExteriorWalls(
      {
        id: '',
        type: 'hallway',
        label: '',
        x,
        y,
        width,
        depth,
        floor: a.floor,
        sqft: width * depth,
        zone: 'circulation',
        rotation: 0,
        adjacentRoomIds: [],
        exteriorWalls: [],
        hasPlumbing: false,
      },
      floorRect,
    ),
    hasPlumbing: false,
    targetSqft: width * depth,
    minSqft: 18,
    needsExteriorWall: false,
    needsPlumbing: false,
  };

  return hallway;
}

function deadEndRooms(rooms: PlacedRoom[]): string[] {
  return rooms.filter((room) => room.adjacentRoomIds.length <= 1 && room.type !== 'front_porch').map((room) => room.id);
}

function extractMainPath(parent: Map<string, string | undefined>, startId: string): string[] {
  let farthestNode = startId;
  let maxDepth = 0;
  const depthByNode = new Map<string, number>([[startId, 0]]);

  for (const node of Array.from(parent.keys())) {
    let depth = 0;
    let current = node;
    while (current !== startId) {
      const p = parent.get(current);
      if (!p) {
        break;
      }
      depth += 1;
      current = p;
    }
    depthByNode.set(node, depth);
    if (depth > maxDepth) {
      maxDepth = depth;
      farthestNode = node;
    }
  }

  const path: string[] = [];
  let cursor: string | undefined = farthestNode;
  while (cursor) {
    path.push(cursor);
    cursor = parent.get(cursor);
  }
  path.reverse();
  return path;
}

export function ensureCirculation(plan: PlacedPlan): PlacedPlan {
  const rooms = plan.rooms.map(cloneRoom);
  const doors: Door[] = [...plan.doors];
  const warnings = [...plan.metadata.warnings];

  let hallwayCounter = rooms.filter((room) => room.type === 'hallway').length + 1;
  let doorCounter = doors.length + 1;

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const graph = rebuildAdjacency(rooms);
    const entryRoom = findEntryRoom(rooms);
    if (!entryRoom) {
      break;
    }

    const { visited } = bfs(graph, entryRoom.id);
    if (visited.size === rooms.length) {
      break;
    }

    const components = connectedComponents(graph);
    const mainComponent = components.find((component) => component.includes(entryRoom.id)) ?? [];
    const disconnected = components.find((component) => !component.includes(entryRoom.id));

    if (!disconnected || mainComponent.length === 0) {
      break;
    }

    const mainRooms = rooms.filter((room) => mainComponent.includes(room.id));
    const disconnectedRooms = rooms.filter((room) => disconnected.includes(room.id));
    const pair = nearestPair(mainRooms, disconnectedRooms);
    if (!pair) {
      warnings.push('Unable to auto-connect all components because floors do not align.');
      break;
    }

    const floorRect = plan.envelope.floorRects[pair.a.floor];
    if (!floorRect) {
      warnings.push(`Missing floor envelope for floor ${pair.a.floor}; unable to auto-insert hallway.`);
      break;
    }
    const hallway = createHallwayBetween(pair.a, pair.b, floorRect, hallwayCounter);
    hallwayCounter += 1;
    rooms.push(hallway);

    addDoor(doors, pair.a, hallway, doorCounter);
    doorCounter += 1;
    addDoor(doors, hallway, pair.b, doorCounter);
    doorCounter += 1;
  }

  const finalGraph = rebuildAdjacency(rooms);
  const entryRoom = findEntryRoom(rooms);
  const bfsResult = entryRoom ? bfs(finalGraph, entryRoom.id) : { visited: new Set<string>(), parent: new Map<string, string | undefined>() };
  const isFullyConnected = entryRoom ? bfsResult.visited.size === rooms.length : false;
  const hallwaySqft = rooms.filter((room) => room.type === 'hallway').reduce((sum, room) => sum + room.sqft, 0);
  const totalSqft = rooms.reduce((sum, room) => sum + room.sqft, 0);
  const hallwayPercent = totalSqft > 0 ? (hallwaySqft / totalSqft) * 100 : 0;

  const nextPlan: PlacedPlan = {
    ...plan,
    rooms,
    doors,
    circulation: {
      isFullyConnected,
      deadEnds: deadEndRooms(rooms),
      mainPath: entryRoom ? extractMainPath(bfsResult.parent, entryRoom.id) : [],
      hallwayPercent,
      doors,
    },
    metadata: {
      ...plan.metadata,
      warnings,
    },
  };

  return nextPlan;
}

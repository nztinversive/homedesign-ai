import { ANTI_ADJACENCY, DEFAULT_LABELS, HARD_ADJACENCY, ROOM_DEFAULTS, ZONE_PRIORITY } from './constants';
import type { DesignBrief, LotConstraints, NormalizedBrief, NormalizedRoom, RoomType } from './types';

const DEFAULT_LOT: LotConstraints = {
  maxWidth: 120,
  maxDepth: 120,
  setbackFront: 20,
  setbackSide: 6,
  setbackRear: 20,
  entryFacing: 'south',
  garagePosition: 'none',
};

function uniqRoomTypes(values: RoomType[]): RoomType[] {
  return Array.from(new Set(values));
}

function computeDims(targetSqft: number, minWidth: number, minDepth: number): { width: number; depth: number } {
  let width = Math.max(minWidth, Math.round(Math.sqrt(targetSqft)));
  let depth = Math.max(minDepth, Math.ceil(targetSqft / width));
  if (width * depth < targetSqft) {
    width = Math.max(width, Math.ceil(targetSqft / depth));
  }
  return { width, depth };
}

function cloneLot(briefLot?: LotConstraints): LotConstraints {
  if (!briefLot) {
    return { ...DEFAULT_LOT };
  }
  return {
    maxWidth: Math.max(briefLot.maxWidth, 20),
    maxDepth: Math.max(briefLot.maxDepth, 20),
    setbackFront: Math.max(briefLot.setbackFront, 0),
    setbackSide: Math.max(briefLot.setbackSide, 0),
    setbackRear: Math.max(briefLot.setbackRear, 0),
    entryFacing: briefLot.entryFacing ?? DEFAULT_LOT.entryFacing,
    garagePosition: briefLot.garagePosition ?? DEFAULT_LOT.garagePosition,
  };
}

function roomLabel(type: RoomType, fallback: string): string {
  return fallback.trim() || DEFAULT_LABELS[type] || type;
}

function toNormalizedRooms(brief: DesignBrief): NormalizedRoom[] {
  const perTypeCount: Partial<Record<RoomType, number>> = {};

  return brief.rooms.map((room) => {
    const defaults = ROOM_DEFAULTS[room.type];
    const baseMinSqft = room.minSqft ?? defaults.minSqft;
    const baseTargetSqft = room.targetSqft ?? defaults.targetSqft;
    const minSqft = Math.max(1, Math.round(baseMinSqft));
    const targetSqft = Math.max(minSqft, Math.round(baseTargetSqft));
    const { width: targetWidth, depth: targetDepth } = computeDims(targetSqft, defaults.minWidth, defaults.minDepth);

    const hardAdjacency = HARD_ADJACENCY
      .filter(([a, b]) => a === room.type || b === room.type)
      .map(([a, b]) => (a === room.type ? b : a));

    const antiAdjacency = ANTI_ADJACENCY
      .filter(([a, b]) => a === room.type || b === room.type)
      .map(([a, b]) => (a === room.type ? b : a));

    const adjacentTo = uniqRoomTypes([...(room.adjacentTo ?? []), ...hardAdjacency].filter((type) => type !== room.type));
    const awayFrom = uniqRoomTypes([...(room.awayFrom ?? []), ...antiAdjacency].filter((type) => type !== room.type));
    const cleanedAwayFrom = awayFrom.filter((type) => !adjacentTo.includes(type));

    perTypeCount[room.type] = (perTypeCount[room.type] ?? 0) + 1;
    const ordinal = perTypeCount[room.type] ?? 1;
    const id = `${room.type}-${ordinal}`;

    let floor = room.floor;
    if (brief.stories === 1) {
      floor = 1;
    }

    return {
      id,
      type: room.type,
      label: roomLabel(room.type, room.label),
      targetSqft,
      minSqft,
      minWidth: defaults.minWidth,
      minDepth: defaults.minDepth,
      targetWidth,
      targetDepth,
      needsExteriorWall: room.needsExteriorWall ?? defaults.needsExteriorWall,
      needsPlumbing: room.needsPlumbing ?? defaults.needsPlumbing,
      zone: defaults.zone,
      mustHave: room.mustHave,
      adjacentTo,
      awayFrom: cleanedAwayFrom,
      floor,
      priority: targetSqft + (room.mustHave ? 120 : 0) + ZONE_PRIORITY[defaults.zone],
    };
  });
}

function addImplicitRoom(
  rooms: NormalizedRoom[],
  impliedRoomIds: string[],
  type: RoomType,
  options: {
    mustHave?: boolean;
    floor?: 1 | 2;
    adjacentTo?: RoomType[];
    targetSqft?: number;
    minSqft?: number;
    priorityBoost?: number;
  } = {},
): void {
  const existingCount = rooms.filter((room) => room.type === type).length;
  const defaults = ROOM_DEFAULTS[type];
  const targetSqft = Math.max(options.minSqft ?? defaults.minSqft, options.targetSqft ?? defaults.targetSqft);
  const minSqft = Math.max(defaults.minSqft, options.minSqft ?? defaults.minSqft);
  const dims = computeDims(targetSqft, defaults.minWidth, defaults.minDepth);
  const id = `${type}-${existingCount + 1}`;

  rooms.push({
    id,
    type,
    label: DEFAULT_LABELS[type] ?? type,
    targetSqft,
    minSqft,
    minWidth: defaults.minWidth,
    minDepth: defaults.minDepth,
    targetWidth: dims.width,
    targetDepth: dims.depth,
    needsExteriorWall: defaults.needsExteriorWall,
    needsPlumbing: defaults.needsPlumbing,
    zone: defaults.zone,
    mustHave: options.mustHave ?? true,
    adjacentTo: uniqRoomTypes(options.adjacentTo ?? []),
    awayFrom: [],
    floor: options.floor,
    priority: targetSqft + ZONE_PRIORITY[defaults.zone] + (options.priorityBoost ?? 40),
  });
  impliedRoomIds.push(id);
}

function addImplicitRooms(brief: DesignBrief, rooms: NormalizedRoom[], impliedRoomIds: string[]): void {
  const hasRoom = (type: RoomType): boolean => rooms.some((room) => room.type === type);

  if (!hasRoom('foyer')) {
    addImplicitRoom(rooms, impliedRoomIds, 'foyer', {
      mustHave: true,
      floor: 1,
      adjacentTo: ['living', 'family', 'great_room'],
      priorityBoost: 60,
    });
  }

  if (!hasRoom('hallway')) {
    addImplicitRoom(rooms, impliedRoomIds, 'hallway', {
      mustHave: true,
      floor: 1,
      adjacentTo: ['foyer'],
      targetSqft: 36,
      priorityBoost: 70,
    });
  }

  const primaryBedrooms = rooms.filter((room) => room.type === 'primary_bed').length;
  const walkInClosets = rooms.filter((room) => room.type === 'walk_in_closet').length;
  if (primaryBedrooms > walkInClosets) {
    for (let index = walkInClosets; index < primaryBedrooms; index += 1) {
      addImplicitRoom(rooms, impliedRoomIds, 'walk_in_closet', {
        mustHave: true,
        adjacentTo: ['primary_bed'],
        floor: rooms.find((room) => room.type === 'primary_bed')?.floor,
        targetSqft: 42,
      });
    }
  }

  if (brief.stories === 2 && !hasRoom('stairs')) {
    addImplicitRoom(rooms, impliedRoomIds, 'stairs', {
      mustHave: true,
      floor: 1,
      adjacentTo: ['hallway'],
      targetSqft: 40,
      priorityBoost: 80,
    });
  }
}

function scaleRoomsToTargetSqft(targetSqft: number, rooms: NormalizedRoom[], warnings: string[]): void {
  const totalSqft = rooms.reduce((acc, room) => acc + room.targetSqft, 0);
  if (totalSqft <= 0) {
    return;
  }

  const minTotalSqft = rooms.reduce((acc, room) => acc + room.minSqft, 0);
  if (minTotalSqft > targetSqft) {
    warnings.push(
      `Requested targetSqft ${targetSqft} is below required minimum ${minTotalSqft}; rooms retained at minimum sizes.`,
    );
    for (const room of rooms) {
      room.targetSqft = room.minSqft;
      const dims = computeDims(room.targetSqft, room.minWidth, room.minDepth);
      room.targetWidth = dims.width;
      room.targetDepth = dims.depth;
    }
    return;
  }

  const scale = targetSqft / totalSqft;
  if (Math.abs(1 - scale) < 0.01) {
    return;
  }

  for (const room of rooms) {
    const scaled = Math.round(room.targetSqft * scale);
    room.targetSqft = Math.max(room.minSqft, scaled);
    const dims = computeDims(room.targetSqft, room.minWidth, room.minDepth);
    room.targetWidth = dims.width;
    room.targetDepth = dims.depth;
    room.priority = room.targetSqft + (room.mustHave ? 120 : 0) + ZONE_PRIORITY[room.zone];
  }
}

function resolveBidirectionalConflicts(rooms: NormalizedRoom[]): void {
  const byType = new Map<RoomType, NormalizedRoom[]>();
  for (const room of rooms) {
    const existing = byType.get(room.type) ?? [];
    existing.push(room);
    byType.set(room.type, existing);
  }

  for (const room of rooms) {
    const nextAdjacent: RoomType[] = [];
    for (const target of room.adjacentTo) {
      if (target === room.type) {
        continue;
      }
      nextAdjacent.push(target);
      const targets = byType.get(target) ?? [];
      for (const targetRoom of targets) {
        if (!targetRoom.adjacentTo.includes(room.type)) {
          targetRoom.adjacentTo.push(room.type);
        }
        targetRoom.awayFrom = targetRoom.awayFrom.filter((type) => type !== room.type);
      }
    }
    room.adjacentTo = uniqRoomTypes(nextAdjacent);
    room.awayFrom = uniqRoomTypes(room.awayFrom.filter((type) => type !== room.type && !room.adjacentTo.includes(type)));
  }
}

function ensureValidFloors(stories: 1 | 2, rooms: NormalizedRoom[], warnings: string[]): void {
  for (const room of rooms) {
    if (stories === 1) {
      room.floor = 1;
      continue;
    }
    if (room.floor !== undefined && room.floor !== 1 && room.floor !== 2) {
      warnings.push(`Room ${room.id} had invalid floor assignment; floor preference removed.`);
      room.floor = undefined;
    }
  }
}

export function normalizeDesignBrief(brief: DesignBrief): NormalizedBrief {
  const warnings: string[] = [];
  const impliedRoomIds: string[] = [];

  const lot = cloneLot(brief.lot);
  const rooms = toNormalizedRooms(brief);

  addImplicitRooms(brief, rooms, impliedRoomIds);
  resolveBidirectionalConflicts(rooms);
  ensureValidFloors(brief.stories, rooms, warnings);
  scaleRoomsToTargetSqft(brief.targetSqft, rooms, warnings);

  return {
    targetSqft: Math.max(brief.targetSqft, 1),
    stories: brief.stories,
    style: brief.style,
    lot,
    rooms,
    metadata: {
      impliedRoomIds,
      warnings,
    },
  };
}

import { WINDOW_RULES } from './constants';
import type { Direction, PlacedPlan, PlacedRoom, WindowConfig, WindowPlacement } from './types';

function wallLength(room: PlacedRoom, wall: Direction): number {
  if (wall === 'north' || wall === 'south') {
    return room.width;
  }
  return room.depth;
}

function inferWindowConfig(room: PlacedRoom): WindowConfig {
  const preset = WINDOW_RULES[room.type];
  if (preset) {
    return preset;
  }

  const sizeCount = room.sqft >= 260 ? 3 : room.sqft >= 140 ? 2 : 1;
  const zoneBoost = room.zone === 'social' ? 1 : 0;

  return {
    count: Math.max(1, Math.min(4, sizeCount + zoneBoost)),
    width: room.zone === 'social' ? 4 : 3,
    height: room.zone === 'social' ? 5 : 4,
    sillHeight: room.zone === 'private' ? 3 : 2.5,
  };
}

function chooseWindowType(room: PlacedRoom): 'standard' | 'picture' | 'bay' | 'clerestory' {
  if (room.type === 'primary_bath' || room.type === 'bathroom' || room.type === 'half_bath') {
    return 'clerestory';
  }
  if (room.zone === 'social' && room.sqft >= 220) {
    return 'picture';
  }
  if (room.zone === 'social' && room.sqft >= 160) {
    return 'bay';
  }
  return 'standard';
}

function sortedWallsByLength(room: PlacedRoom): Direction[] {
  return [...room.exteriorWalls].sort((a, b) => wallLength(room, b) - wallLength(room, a));
}

function windowPosition(index: number, total: number, availableWallLength: number): number {
  const slotWidth = availableWallLength / (total + 1);
  return Number((slotWidth * (index + 1)).toFixed(2));
}

export function assignWindows(plan: PlacedPlan): PlacedPlan {
  const windows: WindowPlacement[] = [];
  const warnings = [...plan.metadata.warnings];
  let counter = 1;

  for (const room of plan.rooms) {
    const config = inferWindowConfig(room);
    const walls = sortedWallsByLength(room);

    let targetCount = config.count;
    if (room.needsExteriorWall) {
      targetCount = Math.max(1, targetCount);
    }
    if (room.zone === 'exterior' || room.type === 'garage' || room.type === 'hallway') {
      targetCount = 0;
    }

    if (targetCount === 0) {
      continue;
    }

    if (walls.length === 0) {
      if (room.needsExteriorWall) {
        warnings.push(`Room ${room.id} needs exterior wall access but has no exterior-facing walls for windows.`);
      }
      continue;
    }

    for (let index = 0; index < targetCount; index += 1) {
      const wall = walls[index % walls.length];
      const length = wallLength(room, wall);
      const width = Math.max(1.5, Math.min(config.width, Math.max(1.5, length - 2)));
      const position = windowPosition(index, targetCount, Math.max(2, length));

      windows.push({
        id: `window-${counter}`,
        wallId: `${room.id}-${wall}-wall`,
        position,
        width,
        height: config.height,
        sillHeight: config.sillHeight,
        type: chooseWindowType(room),
        roomId: room.id,
        floor: room.floor,
        wallDirection: wall,
      });
      counter += 1;
    }
  }

  return {
    ...plan,
    windows,
    metadata: {
      ...plan.metadata,
      warnings,
    },
  };
}

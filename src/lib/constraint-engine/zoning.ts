import type {
  BuildingEnvelope,
  Direction,
  NormalizedBrief,
  Rect,
  ZoneAnchor,
  ZonedPlan,
  ZonedRegion,
  ZonedRoom,
  ZoningOptions,
} from './types';

function oppositeDirection(direction: Direction): Direction {
  if (direction === 'north') {
    return 'south';
  }
  if (direction === 'south') {
    return 'north';
  }
  if (direction === 'east') {
    return 'west';
  }
  return 'east';
}

function toFacing(entryFacing: Direction, rotateEntry: boolean | undefined): Direction {
  return rotateEntry ? oppositeDirection(entryFacing) : entryFacing;
}

function assignFloor(room: ZonedRoom, stories: 1 | 2): 1 | 2 {
  if (stories === 1) {
    return 1;
  }
  if (room.floor) {
    return room.floor;
  }
  if (room.type === 'stairs') {
    return 1;
  }
  if (room.zone === 'private') {
    return 2;
  }
  return 1;
}

function splitFrontBack(rect: Rect, facing: Direction): { front: Rect; back: Rect } {
  if (facing === 'north' || facing === 'south') {
    const frontDepth = Math.max(8, Math.floor(rect.depth * 0.46));
    const backDepth = Math.max(8, rect.depth - frontDepth);
    if (facing === 'north') {
      return {
        front: { x: rect.x, y: rect.y, width: rect.width, depth: frontDepth },
        back: { x: rect.x, y: rect.y + frontDepth, width: rect.width, depth: backDepth },
      };
    }
    return {
      front: { x: rect.x, y: rect.y + (rect.depth - frontDepth), width: rect.width, depth: frontDepth },
      back: { x: rect.x, y: rect.y, width: rect.width, depth: backDepth },
    };
  }

  const frontWidth = Math.max(8, Math.floor(rect.width * 0.46));
  const backWidth = Math.max(8, rect.width - frontWidth);
  if (facing === 'west') {
    return {
      front: { x: rect.x, y: rect.y, width: frontWidth, depth: rect.depth },
      back: { x: rect.x + frontWidth, y: rect.y, width: backWidth, depth: rect.depth },
    };
  }
  return {
    front: { x: rect.x + (rect.width - frontWidth), y: rect.y, width: frontWidth, depth: rect.depth },
    back: { x: rect.x, y: rect.y, width: backWidth, depth: rect.depth },
  };
}

function centerOf(rect: Rect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.depth / 2,
  };
}

function buildZoneRegions(rect: Rect, floor: 1 | 2, facing: Direction, swapSocialPrivate: boolean): ZonedRegion[] {
  const { front, back } = splitFrontBack(rect, facing);
  const socialRect = swapSocialPrivate ? back : front;
  const privateRect = swapSocialPrivate ? front : back;

  const serviceWidth = Math.max(6, Math.floor(rect.width * 0.24));
  const serviceRect: Rect = {
    x: rect.x + rect.width - serviceWidth,
    y: rect.y,
    width: serviceWidth,
    depth: rect.depth,
  };

  const garageDepth = Math.max(10, Math.floor(rect.depth * 0.42));
  const garageRect: Rect = {
    x: rect.x,
    y: rect.y,
    width: Math.max(10, Math.floor(rect.width * 0.35)),
    depth: garageDepth,
  };

  const circulationRect: Rect = {
    x: rect.x + Math.floor(rect.width * 0.38),
    y: rect.y,
    width: Math.max(4, Math.floor(rect.width * 0.16)),
    depth: rect.depth,
  };

  const exteriorStripDepth = Math.max(4, Math.floor(rect.depth * 0.12));
  const exteriorRect: Rect =
    facing === 'north'
      ? { x: rect.x, y: rect.y, width: rect.width, depth: exteriorStripDepth }
      : facing === 'south'
      ? { x: rect.x, y: rect.y + rect.depth - exteriorStripDepth, width: rect.width, depth: exteriorStripDepth }
      : facing === 'west'
      ? { x: rect.x, y: rect.y, width: Math.max(4, Math.floor(rect.width * 0.12)), depth: rect.depth }
      : {
          x: rect.x + rect.width - Math.max(4, Math.floor(rect.width * 0.12)),
          y: rect.y,
          width: Math.max(4, Math.floor(rect.width * 0.12)),
          depth: rect.depth,
        };

  return [
    { zone: 'social', rect: socialRect, floor },
    { zone: 'private', rect: privateRect, floor },
    { zone: 'service', rect: serviceRect, floor },
    { zone: 'garage', rect: garageRect, floor },
    { zone: 'circulation', rect: circulationRect, floor },
    { zone: 'exterior', rect: exteriorRect, floor },
  ];
}

function anchorsFromRegions(regions: ZonedRegion[]): ZoneAnchor[] {
  return regions.map((region) => {
    const center = centerOf(region.rect);
    return {
      zone: region.zone,
      floor: region.floor,
      x: center.x,
      y: center.y,
    };
  });
}

export function assignZones(
  brief: NormalizedBrief,
  envelope: BuildingEnvelope,
  options: ZoningOptions = {},
): ZonedPlan {
  const facing = toFacing(brief.lot.entryFacing, options.rotateEntry);
  const floor1Rect = envelope.floorRects[1];
  const floor2Rect = envelope.floorRects[2];
  const swapSocialPrivate = Boolean(options.swapSocialPrivate);

  const zoneRegions: ZonedRegion[] = [
    ...buildZoneRegions(floor1Rect, 1, facing, swapSocialPrivate),
    ...(floor2Rect ? buildZoneRegions(floor2Rect, 2, facing, swapSocialPrivate) : []),
  ];

  const rooms: ZonedRoom[] = brief.rooms.map((room) => {
    const assignedFloor = assignFloor({ ...room, floor: room.floor ?? 1 }, brief.stories);
    return {
      ...room,
      floor: assignedFloor,
    };
  });

  const zoneAnchors = anchorsFromRegions(zoneRegions);

  return {
    brief,
    envelope,
    rooms,
    zoneRegions,
    zoneAnchors,
  };
}

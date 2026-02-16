import { assignZones } from './zoning';
import { assignWindows } from './windows';
import { ensureCirculation } from './circulation';
import { placeRooms } from './placement';
import type { BuildingEnvelope, NormalizedBrief, PlacementOptions, PlacedPlan, PlacedRoom, VariationOptions } from './types';

function mirroredRoom(room: PlacedRoom, envelope: BuildingEnvelope, mirrorX: boolean, mirrorY: boolean): PlacedRoom {
  const floorRect = envelope.floorRects[room.floor];
  if (!floorRect) {
    return room;
  }

  let x = room.x;
  let y = room.y;
  let exteriorWalls = [...room.exteriorWalls];

  if (mirrorX) {
    x = floorRect.x + floorRect.width - (room.x - floorRect.x) - room.width;
    exteriorWalls = exteriorWalls.map((wall) => (wall === 'east' ? 'west' : wall === 'west' ? 'east' : wall));
  }
  if (mirrorY) {
    y = floorRect.y + floorRect.depth - (room.y - floorRect.y) - room.depth;
    exteriorWalls = exteriorWalls.map((wall) => (wall === 'north' ? 'south' : wall === 'south' ? 'north' : wall));
  }

  return {
    ...room,
    x,
    y,
    exteriorWalls,
  };
}

function mirrorPlan(plan: PlacedPlan, mirrorX: boolean, mirrorY: boolean): PlacedPlan {
  if (!mirrorX && !mirrorY) {
    return plan;
  }

  return {
    ...plan,
    rooms: plan.rooms.map((room) => mirroredRoom(room, plan.envelope, mirrorX, mirrorY)),
  };
}

function withStrategy(plan: PlacedPlan, strategyName: string): PlacedPlan {
  return {
    ...plan,
    metadata: {
      ...plan.metadata,
      strategy: strategyName,
    },
  };
}

function generateOneVariation(
  brief: NormalizedBrief,
  envelope: BuildingEnvelope,
  variation: VariationOptions,
): PlacedPlan {
  const zoned = assignZones(brief, envelope, {
    swapSocialPrivate: variation.swapSocialPrivate,
    rotateEntry: variation.rotateEntry,
  });

  const placementOptions: PlacementOptions = {
    widthBias: variation.widthBias,
    placementOrder: variation.placementOrder,
  };
  let plan = placeRooms(zoned, envelope, placementOptions);
  plan = mirrorPlan(plan, Boolean(variation.mirrorX), Boolean(variation.mirrorY));
  plan = ensureCirculation(plan);
  plan = assignWindows(plan);

  return withStrategy(plan, variation.name);
}

export function generateVariations(brief: NormalizedBrief, envelope: BuildingEnvelope): PlacedPlan[] {
  const variations: VariationOptions[] = [
    {
      name: 'base-greedy',
      placementOrder: 'default',
      widthBias: 0,
    },
    {
      name: 'mirror-x',
      mirrorX: true,
      placementOrder: 'default',
      widthBias: 0,
    },
    {
      name: 'swap-zones',
      swapSocialPrivate: true,
      placementOrder: 'zone',
      widthBias: 0,
    },
    {
      name: 'rotate-entry',
      rotateEntry: true,
      placementOrder: 'priority',
      widthBias: 0,
    },
    {
      name: 'proportion-wide',
      placementOrder: 'default',
      widthBias: 2,
    },
    {
      name: 'reverse-order-mirror-y',
      mirrorY: true,
      placementOrder: 'reverse',
      widthBias: -1,
    },
  ];

  const plans: PlacedPlan[] = [];
  for (const variation of variations) {
    plans.push(generateOneVariation(brief, envelope, variation));
  }

  return plans;
}

import { ANTI_ADJACENCY, HARD_ADJACENCY, SOFT_ADJACENCY } from './constants';
import type { PlanScore, PlacedPlan, PlacedRoom, RoomType, WallAnalysis } from './types';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function center(room: PlacedRoom): { x: number; y: number } {
  return { x: room.x + room.width / 2, y: room.y + room.depth / 2 };
}

function manhattan(a: PlacedRoom, b: PlacedRoom): number {
  const ac = center(a);
  const bc = center(b);
  return Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y);
}

function typeRooms(plan: PlacedPlan, type: RoomType): PlacedRoom[] {
  return plan.rooms.filter((room) => room.type === type);
}

function anyRoomsAdjacent(roomsA: PlacedRoom[], roomsB: PlacedRoom[]): boolean {
  if (roomsA.length === 0 || roomsB.length === 0) {
    return false;
  }
  const roomBIds = new Set(roomsB.map((room) => room.id));
  for (const room of roomsA) {
    for (const adjacentId of room.adjacentRoomIds) {
      if (roomBIds.has(adjacentId)) {
        return true;
      }
    }
  }
  return false;
}

function scoreAdjacency(plan: PlacedPlan): number {
  let hardTotal = 0;
  let hardSatisfied = 0;
  for (const [typeA, typeB] of HARD_ADJACENCY) {
    const roomsA = typeRooms(plan, typeA);
    const roomsB = typeRooms(plan, typeB);
    if (roomsA.length === 0 || roomsB.length === 0) {
      continue;
    }
    hardTotal += 1;
    if (anyRoomsAdjacent(roomsA, roomsB)) {
      hardSatisfied += 1;
    }
  }

  let softTotalWeight = 0;
  let softEarnedWeight = 0;
  for (const [typeA, typeB, weight] of SOFT_ADJACENCY) {
    const roomsA = typeRooms(plan, typeA);
    const roomsB = typeRooms(plan, typeB);
    if (roomsA.length === 0 || roomsB.length === 0) {
      continue;
    }
    softTotalWeight += weight;
    if (anyRoomsAdjacent(roomsA, roomsB)) {
      softEarnedWeight += weight;
    }
  }

  let antiTotalWeight = 0;
  let antiPenalty = 0;
  for (const [typeA, typeB, penalty] of ANTI_ADJACENCY) {
    const roomsA = typeRooms(plan, typeA);
    const roomsB = typeRooms(plan, typeB);
    if (roomsA.length === 0 || roomsB.length === 0) {
      continue;
    }
    const weight = Math.abs(penalty);
    antiTotalWeight += weight;
    if (anyRoomsAdjacent(roomsA, roomsB)) {
      antiPenalty += weight;
    }
  }

  const hardScore = hardTotal > 0 ? (hardSatisfied / hardTotal) * 100 : 100;
  const softScore = softTotalWeight > 0 ? (softEarnedWeight / softTotalWeight) * 100 : 100;
  const antiScore = antiTotalWeight > 0 ? 100 - (antiPenalty / antiTotalWeight) * 100 : 100;

  return clampScore(hardScore * 0.5 + softScore * 0.3 + antiScore * 0.2);
}

function scoreZoneCohesion(plan: PlacedPlan): number {
  const zones = ['social', 'private', 'service', 'garage', 'circulation', 'exterior'] as const;
  const diagonal = Math.hypot(plan.envelope.footprint.width, plan.envelope.footprint.depth) || 1;

  let weightedScore = 0;
  let totalWeight = 0;

  for (const zone of zones) {
    const rooms = plan.rooms.filter((room) => room.zone === zone);
    if (rooms.length <= 1) {
      continue;
    }

    let pairDistance = 0;
    let pairCount = 0;
    for (let i = 0; i < rooms.length; i += 1) {
      for (let j = i + 1; j < rooms.length; j += 1) {
        pairDistance += manhattan(rooms[i], rooms[j]);
        pairCount += 1;
      }
    }
    const averageDistance = pairCount > 0 ? pairDistance / pairCount : 0;
    const normalized = averageDistance / diagonal;
    const zoneScore = clampScore(100 - normalized * 100);
    weightedScore += zoneScore * rooms.length;
    totalWeight += rooms.length;
  }

  return totalWeight > 0 ? clampScore(weightedScore / totalWeight) : 100;
}

function scoreNaturalLight(plan: PlacedPlan): number {
  const windowsByRoom = new Map<string, number>();
  for (const window of plan.windows) {
    if (!window.roomId) {
      continue;
    }
    windowsByRoom.set(window.roomId, (windowsByRoom.get(window.roomId) ?? 0) + 1);
  }

  let total = 0;
  let count = 0;
  for (const room of plan.rooms) {
    if (room.zone === 'exterior' || room.type === 'garage' || room.type === 'hallway') {
      continue;
    }
    let roomScore = 40;
    if (room.exteriorWalls.length > 0) {
      roomScore += 25;
    }
    const windowCount = windowsByRoom.get(room.id) ?? 0;
    roomScore += Math.min(35, windowCount * 12);
    if (room.needsExteriorWall && room.exteriorWalls.length === 0) {
      roomScore -= 45;
    }
    if (room.needsExteriorWall && windowCount === 0) {
      roomScore -= 30;
    }
    total += clampScore(roomScore);
    count += 1;
  }

  return count > 0 ? clampScore(total / count) : 100;
}

function scorePlumbingEfficiency(plan: PlacedPlan, walls: WallAnalysis): number {
  const plumbingRooms = plan.rooms.filter((room) => room.hasPlumbing);
  if (plumbingRooms.length <= 1) {
    return 100;
  }

  const diagonal = Math.hypot(plan.envelope.footprint.width, plan.envelope.footprint.depth) || 1;
  let totalDistance = 0;
  let pairCount = 0;
  for (let i = 0; i < plumbingRooms.length; i += 1) {
    for (let j = i + 1; j < plumbingRooms.length; j += 1) {
      totalDistance += manhattan(plumbingRooms[i], plumbingRooms[j]);
      pairCount += 1;
    }
  }
  const avgDistance = pairCount > 0 ? totalDistance / pairCount : diagonal;
  const normalizedDistance = clampScore(100 - (avgDistance / diagonal) * 100);

  const wetWallLength = walls.wetWalls.reduce((sum, wall) => sum + wall.length, 0);
  const targetWetWallLength = plumbingRooms.length * 6;
  const wetWallScore = clampScore((wetWallLength / Math.max(targetWetWallLength, 1)) * 100);

  return clampScore(normalizedDistance * 0.65 + wetWallScore * 0.35);
}

function scoreCirculation(plan: PlacedPlan): number {
  let score = plan.circulation.isFullyConnected ? 82 : 35;
  score -= plan.circulation.deadEnds.length * 4;
  const hallwayPenalty = Math.abs(plan.circulation.hallwayPercent - 12) * 1.8;
  score -= hallwayPenalty;
  if (plan.circulation.mainPath.length >= 4) {
    score += 8;
  }
  return clampScore(score);
}

function scoreSpaceUtilization(plan: PlacedPlan): number {
  const usedSqft = plan.rooms.reduce((sum, room) => sum + room.sqft, 0);
  const availableSqft = plan.envelope.footprint.width * plan.envelope.footprint.depth * plan.brief.stories;
  if (availableSqft <= 0) {
    return 0;
  }
  const ratio = usedSqft / availableSqft;
  return clampScore(100 - Math.abs(ratio - 0.82) * 220);
}

function scorePrivacyGradient(plan: PlacedPlan): number {
  const entryRoom =
    plan.rooms.find((room) => room.type === 'foyer') ??
    plan.rooms.find((room) => room.zone === 'social') ??
    plan.rooms[0];
  if (!entryRoom) {
    return 0;
  }

  const socialRooms = plan.rooms.filter((room) => room.zone === 'social');
  const privateRooms = plan.rooms.filter((room) => room.zone === 'private');
  if (socialRooms.length === 0 || privateRooms.length === 0) {
    return 70;
  }

  const avgSocial =
    socialRooms.reduce((sum, room) => sum + manhattan(entryRoom, room), 0) / Math.max(socialRooms.length, 1);
  const avgPrivate =
    privateRooms.reduce((sum, room) => sum + manhattan(entryRoom, room), 0) / Math.max(privateRooms.length, 1);
  const diagonal = Math.hypot(plan.envelope.footprint.width, plan.envelope.footprint.depth) || 1;
  const gradient = (avgPrivate - avgSocial) / diagonal;
  let score = 65 + gradient * 60;

  const privateById = new Set(privateRooms.map((room) => room.id));
  const noisyTypes = new Set<RoomType>(['garage', 'kitchen', 'family', 'living']);
  for (const room of privateRooms) {
    for (const adjacentId of room.adjacentRoomIds) {
      const adjacent = plan.rooms.find((candidate) => candidate.id === adjacentId);
      if (!adjacent || privateById.has(adjacent.id)) {
        continue;
      }
      if (noisyTypes.has(adjacent.type)) {
        score -= 6;
      }
    }
  }

  return clampScore(score);
}

function scoreBuildability(plan: PlacedPlan, walls: WallAnalysis): number {
  const shapeScore =
    plan.rooms.length > 0
      ? plan.rooms.reduce((sum, room) => {
          const aspect = Math.max(room.width, room.depth) / Math.max(1, Math.min(room.width, room.depth));
          return sum + (aspect <= 2.5 ? 1 : 0);
        }, 0) / plan.rooms.length
      : 0;

  const wallComplexity = walls.sharedWalls.length + walls.walls.length / 4;
  const complexityPenalty = Math.min(35, wallComplexity * 0.7);
  const placementPenalty = plan.unplacedRoomIds.length * 12;
  const circulationBonus = plan.circulation.isFullyConnected ? 12 : -12;

  return clampScore(shapeScore * 80 + 20 - complexityPenalty - placementPenalty + circulationBonus);
}

function scoreSqftAccuracy(plan: PlacedPlan): number {
  const actual = plan.rooms.reduce((sum, room) => sum + room.sqft, 0);
  const target = plan.brief.targetSqft;
  if (target <= 0) {
    return 0;
  }
  const errorRatio = Math.abs(actual - target) / target;
  return clampScore(100 - errorRatio * 180);
}

export function scorePlan(plan: PlacedPlan, walls: WallAnalysis): PlanScore {
  const adjacencySatisfaction = scoreAdjacency(plan);
  const zoneCohesion = scoreZoneCohesion(plan);
  const naturalLight = scoreNaturalLight(plan);
  const plumbingEfficiency = scorePlumbingEfficiency(plan, walls);
  const circulationQuality = scoreCirculation(plan);
  const spaceUtilization = scoreSpaceUtilization(plan);
  const privacyGradient = scorePrivacyGradient(plan);
  const overallBuildability = scoreBuildability(plan, walls);

  const overall = clampScore(
    (adjacencySatisfaction +
      zoneCohesion +
      naturalLight +
      plumbingEfficiency +
      circulationQuality +
      spaceUtilization +
      privacyGradient +
      overallBuildability) /
      8,
  );

  const sqftAccuracy = scoreSqftAccuracy(plan);

  return {
    overall,
    adjacencySatisfaction,
    zoneCohesion,
    naturalLight,
    plumbingEfficiency,
    circulationQuality,
    spaceUtilization,
    privacyGradient,
    overallBuildability,
    adjacencyScore: adjacencySatisfaction,
    circulation: circulationQuality,
    privacy: privacyGradient,
    buildability: overallBuildability,
    sqftAccuracy,
  };
}

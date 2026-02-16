import type { BuildingEnvelope, NormalizedBrief, Rect } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeBuildableRect(brief: NormalizedBrief): Rect {
  const { lot } = brief;
  const width = Math.max(10, lot.maxWidth - lot.setbackSide * 2);
  const depth = Math.max(10, lot.maxDepth - lot.setbackFront - lot.setbackRear);
  return {
    x: lot.setbackSide,
    y: lot.setbackFront,
    width,
    depth,
  };
}

function computeFootprint(buildableRect: Rect, targetSqftPerFloor: number): Rect {
  const maxWidth = Math.floor(buildableRect.width);
  const maxDepth = Math.floor(buildableRect.depth);
  const minWidth = 12;
  const minDepth = 12;

  const ratio = buildableRect.width / buildableRect.depth;
  let width = clamp(Math.round(Math.sqrt(targetSqftPerFloor * ratio)), minWidth, maxWidth);
  let depth = clamp(Math.ceil(targetSqftPerFloor / width), minDepth, maxDepth);

  if (width * depth < targetSqftPerFloor) {
    const widthGain = Math.max(0, maxWidth - width);
    const depthGain = Math.max(0, maxDepth - depth);
    if (widthGain >= depthGain && widthGain > 0) {
      width = clamp(Math.ceil(targetSqftPerFloor / depth), minWidth, maxWidth);
    } else if (depthGain > 0) {
      depth = clamp(Math.ceil(targetSqftPerFloor / width), minDepth, maxDepth);
    }
  }

  // Keep the footprint centered inside the buildable area.
  const x = buildableRect.x + Math.floor((buildableRect.width - width) / 2);
  const y = buildableRect.y + Math.floor((buildableRect.depth - depth) / 2);

  return { x, y, width, depth };
}

export function computeEnvelope(brief: NormalizedBrief): BuildingEnvelope {
  const buildableRect = computeBuildableRect(brief);
  const programTargetSqft = brief.rooms.reduce((sum, room) => sum + room.targetSqft, 0);
  const baseTargetSqftPerFloor = Math.max(brief.targetSqft / brief.stories, programTargetSqft / brief.stories, 100);
  const circulationFactor = brief.rooms.length >= 10 ? 1.12 : 1.08;
  const targetSqftPerFloor = Math.ceil(baseTargetSqftPerFloor * circulationFactor);
  const footprint = computeFootprint(buildableRect, targetSqftPerFloor);
  const footprintSqft = footprint.width * footprint.depth;
  const totalSqft = footprintSqft * brief.stories;

  return {
    shape: 'rectangle',
    segments: [footprint],
    totalSqft,
    boundingWidth: footprint.width,
    boundingDepth: footprint.depth,
    streetFacing: brief.lot.entryFacing,
    lot: brief.lot,
    buildableRect,
    footprint,
    floorRects: brief.stories === 2 ? { 1: footprint, 2: footprint } : { 1: footprint },
    targetSqftPerFloor,
    gridResolution: 1,
  };
}

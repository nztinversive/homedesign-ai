/**
 * Helper utilities for serializing/deserializing constraint engine
 * output to/from Convex storage (JSON strings).
 */

import type { PlacedPlan, PlanScore, WallAnalysis } from "./constraint-engine/types";

export function serializePlan(plan: PlacedPlan): string {
  return JSON.stringify(plan);
}

export function deserializePlan(json: string): PlacedPlan {
  try {
    return JSON.parse(json) as PlacedPlan;
  } catch (err) {
    console.error('Failed to deserialize plan:', err);
    return {} as PlacedPlan;
  }
}

export function serializeScore(score: PlanScore): string {
  return JSON.stringify(score);
}

export function deserializeScore(json: string): PlanScore {
  try {
    return JSON.parse(json) as PlanScore;
  } catch (err) {
    console.error('Failed to deserialize score:', err);
    return { overall: 0 } as PlanScore;
  }
}

export function serializeWalls(walls: WallAnalysis): string {
  return JSON.stringify(walls);
}

export function deserializeWalls(json: string): WallAnalysis {
  try {
    return JSON.parse(json) as WallAnalysis;
  } catch (err) {
    console.error('Failed to deserialize walls:', err);
    return {} as WallAnalysis;
  }
}

/**
 * Helper utilities for serializing/deserializing constraint engine
 * output to/from Convex storage (JSON strings).
 */

import type { PlacedPlan, PlanScore, WallAnalysis } from "./constraint-engine/types";

export function serializePlan(plan: PlacedPlan): string {
  return JSON.stringify(plan);
}

export function deserializePlan(json: string): PlacedPlan {
  return JSON.parse(json) as PlacedPlan;
}

export function serializeScore(score: PlanScore): string {
  return JSON.stringify(score);
}

export function deserializeScore(json: string): PlanScore {
  return JSON.parse(json) as PlanScore;
}

export function serializeWalls(walls: WallAnalysis): string {
  return JSON.stringify(walls);
}

export function deserializeWalls(json: string): WallAnalysis {
  return JSON.parse(json) as WallAnalysis;
}

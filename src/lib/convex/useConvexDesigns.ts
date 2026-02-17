"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PlacedPlan, PlanScore, WallAnalysis } from "../constraint-engine/types";

/**
 * Hook to save and load designs from Convex.
 */
export function useConvexDesigns(projectId: Id<"projects"> | undefined) {
  const designs = useQuery(
    api.designs.listByProject,
    projectId ? { projectId } : "skip"
  );

  const saveGenerationResults = useMutation(api.designs.saveGenerationResults);
  const toggleFavoriteMutation = useMutation(api.designs.toggleFavorite);

  const saveResults = async (
    userId: Id<"users">,
    plans: PlacedPlan[],
    wallAnalyses: WallAnalysis[],
    scores: PlanScore[]
  ) => {
    if (!projectId) return;

    const designsPayload = plans.map((plan, i) => ({
      name: `Variation ${i + 1}`,
      variationIndex: i,
      planData: JSON.stringify(plan),
      wallData: JSON.stringify(wallAnalyses[i] ?? {}),
      scoreData: JSON.stringify(scores[i] ?? {}),
      overallScore: scores[i]?.overall ?? 0,
    }));

    return await saveGenerationResults({
      projectId,
      userId,
      designs: designsPayload,
    });
  };

  const toggleFavorite = async (designId: Id<"designs">) => {
    return await toggleFavoriteMutation({ designId });
  };

  const parseDesign = (design: NonNullable<typeof designs>[number]) => {
    try {
      return {
        plan: JSON.parse(design.planData) as PlacedPlan,
        walls: JSON.parse(design.wallData) as WallAnalysis,
        score: JSON.parse(design.scoreData) as PlanScore,
      };
    } catch (err) {
      console.error('Failed to parse design data:', err);
      return {
        plan: {} as PlacedPlan,
        walls: {} as WallAnalysis,
        score: { overall: 0 } as PlanScore,
      };
    }
  };

  return {
    designs: designs ?? [],
    isLoading: designs === undefined,
    saveResults,
    toggleFavorite,
    parseDesign,
  };
}

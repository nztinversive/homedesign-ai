"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { DesignBrief, PlacedPlan, PlanScore, WallAnalysis } from "../constraint-engine/types";

const STORAGE_KEY = "homedesign_anonymous_user";

/**
 * All-in-one hook for persisting designs to Convex.
 * Handles anonymous user creation, project creation, and design saving.
 */
export function usePersistDesigns() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const didInit = useRef(false);

  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const createProject = useMutation(api.projects.create);
  const saveGenerationResults = useMutation(api.designs.saveGenerationResults);
  const toggleFavoriteMutation = useMutation(api.designs.toggleFavorite);

  // All designs for this user
  const allDesigns = useQuery(
    api.designs.listFavorites,
    userId ? { userId } : "skip"
  );
  const userProjects = useQuery(
    api.projects.listByUser,
    userId ? { userId } : "skip"
  );

  // Init anonymous user
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.userId) {
          setUserId(parsed.userId as Id<"users">);
          return;
        }
      } catch { /* ignore */ }
    }

    const anonId = Math.random().toString(36).slice(2, 10);
    const email = `anon-${anonId}@homedesign.local`;
    getOrCreateUser({ name: `Anonymous ${anonId}`, email })
      .then((id) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: id, email }));
        setUserId(id);
      })
      .catch((err) => console.warn("Failed to create anonymous user:", err));
  }, [getOrCreateUser]);

  /**
   * Save generated plans to Convex. Creates a project if needed.
   */
  const saveDesigns = useCallback(
    async (
      brief: DesignBrief,
      plans: PlacedPlan[],
      wallAnalyses: WallAnalysis[],
      scores: PlanScore[]
    ) => {
      if (!userId) return null;

      try {
        // Create a project from the brief
        const projectId = await createProject({
          userId,
          name: `${brief.style} ${brief.targetSqft}sqft`,
          description: `${brief.stories}-story ${brief.style} home, ${brief.rooms.length} rooms`,
          brief: {
            targetSqft: brief.targetSqft,
            stories: brief.stories as 1 | 2,
            style: brief.style,
            rooms: brief.rooms.map((r) => ({
              type: r.type,
              label: r.label,
              minSqft: r.minSqft,
              targetSqft: r.targetSqft,
              mustHave: r.mustHave,
              adjacentTo: r.adjacentTo,
              awayFrom: r.awayFrom,
              needsExteriorWall: r.needsExteriorWall,
              needsPlumbing: r.needsPlumbing,
              floor: r.floor as 1 | 2 | undefined,
            })),
            lot: brief.lot,
          },
        });

        // Save designs
        const designsPayload = plans.map((plan, i) => ({
          name: `Variation ${i + 1}`,
          variationIndex: i,
          planData: JSON.stringify(plan),
          wallData: JSON.stringify(wallAnalyses[i] ?? {}),
          scoreData: JSON.stringify(scores[i] ?? {}),
          overallScore: scores[i]?.overall ?? 0,
        }));

        await saveGenerationResults({
          projectId,
          userId,
          designs: designsPayload,
        });

        return projectId;
      } catch (err) {
        console.warn("Failed to save designs:", err);
        return null;
      }
    },
    [userId, createProject, saveGenerationResults]
  );

  const toggleFavorite = useCallback(
    async (designId: Id<"designs">) => {
      try {
        return await toggleFavoriteMutation({ designId });
      } catch (err) {
        console.warn("Failed to toggle favorite:", err);
        return null;
      }
    },
    [toggleFavoriteMutation]
  );

  return {
    userId,
    isReady: userId !== null,
    saveDesigns,
    toggleFavorite,
    favorites: allDesigns ?? [],
    projects: userProjects ?? [],
  };
}

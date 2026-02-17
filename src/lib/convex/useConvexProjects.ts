"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { DesignBrief } from "../constraint-engine/types";

/**
 * Hook to manage projects in Convex.
 */
export function useConvexProjects(userId: Id<"users"> | undefined) {
  const projects = useQuery(
    api.projects.listByUser,
    userId ? { userId } : "skip"
  );

  const createMutation = useMutation(api.projects.create);
  const updateMutation = useMutation(api.projects.update);
  const removeMutation = useMutation(api.projects.remove);

  const createProject = async (
    name: string,
    brief: DesignBrief,
    description?: string
  ) => {
    if (!userId) throw new Error("No user");
    return await createMutation({
      userId,
      name,
      brief: brief as any,
      description,
    });
  };

  const updateProject = async (
    projectId: Id<"projects">,
    updates: { name?: string; description?: string; brief?: DesignBrief }
  ) => {
    return await updateMutation({
      projectId,
      ...updates,
      brief: updates.brief as any,
    });
  };

  const removeProject = async (projectId: Id<"projects">) => {
    return await removeMutation({ projectId });
  };

  return {
    projects: projects ?? [],
    isLoading: projects === undefined,
    createProject,
    updateProject,
    removeProject,
  };
}

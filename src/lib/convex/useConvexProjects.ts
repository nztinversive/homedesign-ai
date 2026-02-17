"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type CreateProjectArgs = FunctionArgs<typeof api.projects.create>;
type UpdateProjectArgs = FunctionArgs<typeof api.projects.update>;
type ProjectBrief = CreateProjectArgs["brief"];
type ProjectUpdates = Omit<UpdateProjectArgs, "projectId">;

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
    brief: ProjectBrief,
    description?: string
  ) => {
    if (!userId) throw new Error("No user");
    return await createMutation({
      userId,
      name,
      brief,
      description,
    });
  };

  const updateProject = async (
    projectId: Id<"projects">,
    updates: ProjectUpdates
  ) => {
    return await updateMutation({
      projectId,
      ...updates,
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

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ──────────────────────────────────────────────────────────────

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("designs")
      .withIndex("by_project_score", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { designId: v.id("designs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.designId);
  },
});

export const listFavorites = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("designs")
      .withIndex("by_user_favorites", (q) =>
        q.eq("userId", args.userId).eq("isFavorite", true)
      )
      .collect();
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

/**
 * Save a batch of generated designs for a project.
 * Replaces all existing designs for that project.
 */
export const saveGenerationResults = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    designs: v.array(
      v.object({
        name: v.string(),
        variationIndex: v.number(),
        planData: v.string(),
        wallData: v.string(),
        scoreData: v.string(),
        overallScore: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Remove old designs for this project
    const old = await ctx.db
      .query("designs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const d of old) {
      await ctx.db.delete(d._id);
    }

    const ids = [];
    for (const design of args.designs) {
      const id = await ctx.db.insert("designs", {
        projectId: args.projectId,
        userId: args.userId,
        name: design.name,
        variationIndex: design.variationIndex,
        planData: design.planData,
        wallData: design.wallData,
        scoreData: design.scoreData,
        overallScore: design.overallScore,
        isFavorite: false,
        updatedAt: Date.now(),
      });
      ids.push(id);
    }

    // Update project timestamp
    await ctx.db.patch(args.projectId, { updatedAt: Date.now() });

    return ids;
  },
});

export const toggleFavorite = mutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");
    await ctx.db.patch(args.designId, {
      isFavorite: !design.isFavorite,
      updatedAt: Date.now(),
    });
    return !design.isFavorite;
  },
});

export const remove = mutation({
  args: { designId: v.id("designs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.designId);
  },
});

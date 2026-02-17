import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const briefValidator = v.object({
  targetSqft: v.number(),
  stories: v.union(v.literal(1), v.literal(2)),
  style: v.string(),
  rooms: v.array(
    v.object({
      type: v.string(),
      label: v.string(),
      minSqft: v.optional(v.number()),
      targetSqft: v.optional(v.number()),
      mustHave: v.boolean(),
      adjacentTo: v.optional(v.array(v.string())),
      awayFrom: v.optional(v.array(v.string())),
      needsExteriorWall: v.optional(v.boolean()),
      needsPlumbing: v.optional(v.boolean()),
      floor: v.optional(v.union(v.literal(1), v.literal(2))),
    })
  ),
  lot: v.optional(
    v.object({
      maxWidth: v.number(),
      maxDepth: v.number(),
      setbackFront: v.number(),
      setbackSide: v.number(),
      setbackRear: v.number(),
      entryFacing: v.string(),
      garagePosition: v.optional(v.string()),
    })
  ),
});

// ── Queries ──────────────────────────────────────────────────────────────

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// ── Mutations ────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    brief: briefValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      brief: args.brief,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    brief: v.optional(briefValidator),
  },
  handler: async (ctx, args) => {
    const { projectId, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.brief !== undefined) updates.brief = fields.brief;

    await ctx.db.patch(projectId, updates);
    return projectId;
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Delete all child designs first
    const designs = await ctx.db
      .query("designs")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const design of designs) {
      await ctx.db.delete(design._id);
    }
    await ctx.db.delete(args.projectId);
  },
});

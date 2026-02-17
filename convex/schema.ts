import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    // Auth provider token subject (e.g. from Clerk, Auth0, etc.)
    tokenIdentifier: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_token", ["tokenIdentifier"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    // The design brief that drives the constraint engine
    brief: v.object({
      targetSqft: v.number(),
      stories: v.union(v.literal(1), v.literal(2)),
      style: v.string(), // HomeStyle
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
    }),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  designs: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    name: v.string(),
    // Index within the generated variations (0-based)
    variationIndex: v.number(),
    // Serialised PlacedPlan (the full output of the constraint engine)
    planData: v.string(), // JSON-stringified PlacedPlan
    // Serialised WallAnalysis
    wallData: v.string(), // JSON-stringified WallAnalysis
    // Serialised PlanScore
    scoreData: v.string(), // JSON-stringified PlanScore
    // Denormalised overall score for sorting/filtering
    overallScore: v.number(),
    // Whether the user has "starred" / favourited this variation
    isFavorite: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_score", ["projectId", "overallScore"])
    .index("by_user", ["userId"])
    .index("by_user_favorites", ["userId", "isFavorite"]),
});

# CLAUDE.md — Home Design AI

## Overview
AI-powered home design tool that generates buildable floor plans from text descriptions.
Constraint engine validates room placement, adjacency, circulation, and buildability.

## Stack
- Next.js 14, TypeScript, Tailwind CSS
- Constraint engine: pure TypeScript, zero dependencies
- Future: Convex (real-time backend), Three.js (3D), World Labs (photorealistic renders)

## Constraint Engine (`src/lib/constraint-engine/`)
- `types.ts` — All interfaces
- `constants.ts` — Room defaults (23 types), adjacency rules, window configs
- `normalize.ts` — Parse & scale rooms to target sqft
- `envelope.ts` — Building envelope generation (rect/L/U/T shapes)
- `zoning.ts` — Zone envelope into social/private/service regions
- `placement.ts` — Greedy room placement with occupancy grid
- `circulation.ts` — BFS connectivity, hallway insertion, door placement
- `windows.ts` — Window placement per room type
- `walls.ts` — Wall generation from room boundaries
- `scoring.ts` — Plan scoring (light, circulation, privacy, buildability)
- `variations.ts` — Generate 4-6 plan variations

## Branding
- Dark theme with gold #B8860B accents
- Clean, professional UI

## Key Rules
- All plans must pass circulation check (every room reachable)
- Plumbing rooms cluster for shared wet walls
- Primary suite isolated from social/noisy rooms
- Garage street-facing
- Kitchen adjacent to dining (hard rule)

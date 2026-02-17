# Home Design AI

AI-powered modular home floor plan generator with compliance checking. Input your requirements, get optimized floor plans that meet building codes.

## What It Does

- **Design from Scratch** — Fill out a design brief (square footage, style, rooms, budget) and generate multiple floor plan variations
- **Upload Floor Plan** — Upload an existing floor plan photo to extract dimensions and generate optimized alternatives
- **Constraint Engine** — 10+ rule categories ensure plans meet IRC/IBC residential building codes (room minimums, egress, accessibility, bathroom fixtures, etc.)
- **Compliance Review** — Each plan is scored across structural, code compliance, livability, and efficiency dimensions
- **Jurisdiction Support** — Colorado-specific amendments with extensible framework for other states
- **Plan Gallery** — Compare variations side-by-side, ranked by overall score
- **PDF Export** — Download detailed floor plan PDFs with dimensions and room labels
- **Convex Backend** — Real-time data persistence for designs, projects, and user favorites

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** [Convex](https://convex.dev) (real-time reactive database, serverless functions)
- **Constraint Engine:** Custom TypeScript rules engine (`src/lib/constraint-engine/`)
- **PDF:** `@react-pdf/renderer` for floor plan PDF generation

## Getting Started

```bash
# Install dependencies
npm install

# Set up Convex (already configured — just need local dev server)
npx convex dev

# Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
```

## Project Structure

```
src/
├── app/                    # Next.js app router
├── components/             # UI components
│   ├── DesignBriefForm.tsx  # Input form for design requirements
│   ├── PhotoUpload.tsx      # Floor plan image upload + extraction
│   ├── PlanGallery.tsx      # Side-by-side plan comparison
│   ├── PlanDetail.tsx       # Detailed plan view with scores
│   └── PlanPDF.tsx          # PDF generation
├── lib/
│   ├── constraint-engine/   # Building code compliance rules
│   │   ├── types.ts         # Core types (plans, rooms, scores)
│   │   ├── constants.ts     # IRC/IBC code constants
│   │   ├── index.ts         # Engine orchestration
│   │   ├── colorado.ts      # Colorado-specific amendments
│   │   └── rules/           # Individual rule implementations
│   ├── convex/              # Convex hooks and helpers
│   └── convex-helpers.ts    # Serialization utilities
convex/
├── schema.ts               # Database schema (designs, projects, users)
├── designs.ts              # Design CRUD mutations/queries
├── projects.ts             # Project management
└── users.ts                # User management
```

## Deployment

Deployed on [Render](https://render.com) with Convex Cloud backend.

## License

Private — Fading West Development

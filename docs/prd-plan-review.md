# PRD: Plan Review Compliance Engine

**Version**: 1.0  
**Date**: February 17, 2026  
**Product**: Plan Review Compliance Engine for Home Design AI  

## Overview

Automated plan review compliance engine for residential building codes, starting with Colorado International Residential Code (IRC). Validates floor plans against code requirements and generates compliance reports with specific violations and remediation suggestions.

## Problem Statement

Manual plan review is time-intensive, error-prone, and requires specialized expertise. Architects and homebuilders need instant feedback on code compliance during the design phase to avoid costly revisions and permit delays.

## Solution

TypeScript compliance engine that validates floor plans against IRC requirements. Modular rule-based system supporting jurisdiction-specific amendments and overrides.

## Core Features

### 1. Room Minimums (IRC R304)
- Minimum floor areas (120 sq ft habitable rooms, 70 sq ft bedrooms)
- Minimum horizontal dimensions (7 feet any direction)  
- Ceiling heights (7'6" general, 7' specific areas)
- Sloped ceiling exceptions

### 2. Emergency Egress (IRC R310+R311)  
- Emergency escape windows in bedrooms/basements
- Minimum opening sizes (5.7 sq ft, 5.0 sq ft grade level)
- Maximum sill heights (44" above floor)
- Minimum clear width/height (20" x 24")
- Exterior door requirements
- Stairway egress widths

### 3. Bathroom Requirements (IRC R307)
- Toilet clearances (15" from centerline, 21" front)
- Lavatory clearances (15" from centerline)  
- Shower minimum size (30" x 30")
- Bathtub access clearances
- Door swing restrictions

### 4. Kitchen Requirements
- Counter depth minimums (15" clear workspace)
- Aisle widths (36" minimum between parallel counters)
- Work triangle efficiency
- Appliance clearances

### 5. Hallway Requirements (IRC R311.6)
- Minimum width (36" minimum)
- Minimum height (6'8" minimum)  
- Dead-end limitations
- Accessible route compliance

## Technical Architecture

### Core Interfaces
```typescript
interface ComplianceRule {
  id: string;
  code: string; // IRC section
  category: 'room-minimums' | 'egress' | 'bathrooms' | 'kitchens' | 'hallways';
  description: string;
  check: (plan: FloorPlan, jurisdiction?: string) => RuleResult;
}

interface RuleResult {
  ruleId: string;
  passed: boolean;
  violations: Violation[];
  recommendations?: string[];
}

interface ComplianceReport {
  planId: string;
  jurisdiction: string;
  timestamp: Date;
  overallCompliance: boolean;
  results: RuleResult[];
  summary: {
    passed: number;
    failed: number; 
    warnings: number;
  };
}
```

### File Structure
```
src/lib/compliance-engine/
├── types.ts              # Core interfaces
├── index.ts               # Main entry point
├── colorado.ts            # CO-specific rules
├── rules/
│   ├── room-minimums.ts   # IRC R304 rules
│   ├── egress.ts          # IRC R310+R311 rules  
│   ├── bathrooms.ts       # IRC R307 rules
│   ├── kitchens.ts        # Kitchen clearance rules
│   └── hallways.ts        # IRC R311.6 rules
└── __tests__/
    └── compliance.test.ts # Integration tests
```

## Rule Categories

### Room Minimums (~8 rules)
- R304.1: Minimum area requirements
- R304.2: Minimum dimensions
- R304.3: Height requirements  
- R304.4: Sloped ceiling exceptions
- Bedroom-specific minimums
- Living space classifications
- Closet and storage space rules
- Basement/below-grade exceptions

### Emergency Egress (~10 rules)
- R310.1: Emergency escape windows required
- R310.2: Minimum opening dimensions
- R310.3: Maximum sill height
- R310.4: Operational constraints
- R311.2: Exterior door requirements
- R311.3: Floor elevations 
- R311.4: Landings at doors
- R311.5: Stairway requirements
- Window well requirements
- Basement egress specifics

### Bathroom Requirements (~6 rules)
- R307.1: Space requirements  
- R307.2: Toilet clearances
- R307.3: Lavatory clearances
- R307.4: Shower/tub requirements
- R307.5: Door swing restrictions
- Accessibility considerations

### Kitchen Requirements (~4 rules)
- Minimum counter workspace
- Aisle width requirements
- Work triangle constraints  
- Appliance clearance minimums

### Hallway Requirements (~4 rules)  
- R311.6.1: Minimum width
- R311.6.2: Minimum height
- Dead-end corridor limits
- Accessible route compliance

## Colorado Amendments

Key Colorado-specific overrides:
- Enhanced energy efficiency requirements
- Wildfire mitigation measures in WUI zones
- Seismic design considerations (rare)
- High-altitude construction modifications
- Snow load requirements

## Success Criteria

1. **Accuracy**: 95%+ rule detection rate vs. manual review
2. **Performance**: <2 seconds for typical residential plan
3. **Coverage**: All major IRC residential requirements
4. **Extensibility**: Easy addition of new jurisdictions
5. **Integration**: Clean API for Home Design AI constraint engine

## Technical Constraints

- Pure TypeScript implementation
- Zero external dependencies  
- Node.js runtime compatibility
- Stateless rule evaluation
- JSON-serializable inputs/outputs

## Future Enhancements

- Commercial building code support (IBC)
- Mechanical/electrical/plumbing codes
- Accessibility compliance (ADA)
- Energy code validation
- 3D volumetric analysis
- Real-time plan annotation

## Testing Strategy

- Unit tests for each rule category
- Integration tests with sample floor plans
- Regression test suite for Colorado amendments
- Performance benchmarks
- Manual validation against known-good plans

## Rollout Plan

**Phase 1** (Night 1): Core engine + Room/Egress/Bathroom rules  
**Phase 2** (Night 2): Kitchen/Hallway rules + Colorado amendments  
**Phase 3** (Night 3): Integration testing + constraint engine hookup  
**Phase 4** (Night 4): Performance optimization + comprehensive testing

---

*This PRD focuses on automated code compliance to accelerate the residential design process while ensuring safety and habitability standards.*
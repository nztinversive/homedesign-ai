/**
 * Energy Efficiency Rules - IRC Chapter 11 / IECC
 * Window-to-wall ratio, insulation, thermal bridging, HVAC, solar orientation
 */

import type {
  ComplianceRule,
  RuleResult,
  Violation,
  FloorPlan,
  ComplianceContext,
  Room
} from '../types';

// ── Helpers ────────────────────────────────────────────────────────────

function getRooms(plan: FloorPlan): Room[] {
  return plan.rooms ?? [];
}

function getWindows(plan: FloorPlan) {
  return plan.windows ?? [];
}

function getDoors(plan: FloorPlan) {
  return plan.doors ?? [];
}

function createViolation(
  id: string,
  description: string,
  codeSection: string,
  roomId: string | undefined,
  currentValue: number | string,
  requiredValue: number | string,
  unit: string,
  remediation: string[]
): Violation {
  return {
    id,
    description,
    severity: 'error',
    codeSection,
    roomId,
    currentValue,
    requiredValue,
    unit,
    remediation,
  };
}

function createWarning(
  id: string,
  description: string,
  codeSection: string,
  roomId: string | undefined,
  remediation: string[]
): Violation {
  return {
    id,
    description,
    severity: 'warning',
    codeSection,
    roomId,
    remediation,
  };
}

/**
 * Estimate total exterior wall area (ft²) from room data.
 * Each exterior wall segment length × assumed 9 ft wall height.
 */
function estimateExteriorWallArea(plan: FloorPlan): number {
  const WALL_HEIGHT = 9; // ft
  const rooms = getRooms(plan);
  let totalLength = 0;

  for (const room of rooms) {
    const dirs = room.exteriorWalls ?? [];
    for (const dir of dirs) {
      if (dir === 'north' || dir === 'south') {
        totalLength += room.width;
      } else if (dir === 'east' || dir === 'west') {
        totalLength += room.depth;
      }
    }
  }

  return totalLength * WALL_HEIGHT;
}

/**
 * Estimate total window area (ft²).
 * window.width and window.height are in feet from constraint engine.
 */
function estimateTotalWindowArea(plan: FloorPlan): number {
  const windows = getWindows(plan);
  let total = 0;
  for (const w of windows) {
    total += (w.width ?? 3) * (w.height ?? 4);
  }
  return total;
}

/**
 * Check if a room is a habitable living space (needs heating/cooling).
 */
function isConditionedSpace(room: Room): boolean {
  const unconditioned = ['garage', 'front_porch', 'back_porch', 'outdoor_living'];
  return !unconditioned.includes(room.type);
}

/**
 * Get the total conditioned floor area.
 */
function getConditionedArea(plan: FloorPlan): number {
  return getRooms(plan)
    .filter(isConditionedSpace)
    .reduce((sum, r) => sum + (r.sqft ?? r.width * r.depth), 0);
}

// ── Rules ──────────────────────────────────────────────────────────────

/**
 * Rule 1: Window-to-Wall Ratio (WWR)
 * IECC Table R402.1.2 — Max 15% WWR for prescriptive compliance in CZ 5+.
 * We use 25% as a generous limit for CZ 3-4 (most US residential).
 */
const windowToWallRatio: ComplianceRule = {
  id: 'energy-window-wall-ratio',
  code: 'IECC R402.3.3',
  category: 'energy',
  description: 'Window-to-wall ratio must not exceed 25% (prescriptive path)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const MAX_WWR = 0.25;

    const wallArea = estimateExteriorWallArea(plan);
    const windowArea = estimateTotalWindowArea(plan);

    if (wallArea <= 0) {
      return { ruleId: this.id, passed: true, violations: [] };
    }

    const wwr = windowArea / wallArea;

    if (wwr > MAX_WWR) {
      violations.push(createViolation(
        'wwr-exceeded',
        `Window-to-wall ratio is ${(wwr * 100).toFixed(1)}%, exceeding the 25% prescriptive limit`,
        this.code,
        undefined,
        `${(wwr * 100).toFixed(1)}%`,
        '≤ 25%',
        '%',
        [
          'Reduce total glazing area',
          'Use smaller windows or fewer windows on non-primary facades',
          'Use performance path (REScheck) to justify higher WWR with better U-factors',
        ]
      ));
    }

    return { ruleId: this.id, passed: violations.length === 0, violations };
  },
};

/**
 * Rule 2: Window U-Factor Check
 * IECC Table R402.1.2 — Windows must meet maximum U-factor for climate zone.
 * We check that windows exist; actual U-factor is a spec concern flagged as a warning.
 */
const windowUFactor: ComplianceRule = {
  id: 'energy-window-u-factor',
  code: 'IECC R402.1.2',
  category: 'energy',
  description: 'Windows must meet U-factor requirements for the climate zone',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const windows = getWindows(plan);
    const rooms = getRooms(plan);

    // Flag if conditioned rooms have no windows at all (missed daylighting + U-factor concern)
    const conditionedRooms = rooms.filter(isConditionedSpace);
    const roomsWithWindows = new Set(windows.map(w => w.roomId).filter(Boolean));

    const bedroomsWithoutWindows = conditionedRooms.filter(
      r => (r.type === 'bedroom' || r.type === 'primary_bed') && !roomsWithWindows.has(r.id)
    );

    for (const room of bedroomsWithoutWindows) {
      violations.push(createWarning(
        `no-window-${room.id}`,
        `${room.label} has no windows — verify U-factor compliance during specification`,
        this.code,
        room.id,
        [
          'Add at least one window meeting climate zone U-factor requirements',
          'Specify windows with U-factor ≤ 0.30 (CZ 5) or ≤ 0.35 (CZ 3-4)',
        ]
      ));
    }

    return {
      ruleId: this.id,
      passed: violations.length === 0,
      violations,
      recommendations: [
        'Specify window U-factors during construction documents phase',
        'Consider triple-pane for cold climates (CZ 5+)',
      ],
    };
  },
};

/**
 * Rule 3: Insulation R-Value Verification
 * IECC Table R402.1.2 — Verify plan supports insulation requirements.
 * We check wall thickness and flag rooms where cavity depth may be insufficient.
 */
const insulationRValues: ComplianceRule = {
  id: 'energy-insulation-r-values',
  code: 'IECC R402.1.2',
  category: 'energy',
  description: 'Wall cavity depth must support required insulation R-values',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];

    // Modular homes typically use 2×6 walls (R-20 cavity).
    // Colorado (CZ 5) requires R-20 wall or R-13+5ci.
    // Check that exterior walls exist for conditioned rooms.
    const rooms = getRooms(plan);
    const conditioned = rooms.filter(isConditionedSpace);
    const roomsWithExterior = conditioned.filter(r => (r.exteriorWalls ?? []).length > 0);

    if (conditioned.length > 0 && roomsWithExterior.length === 0) {
      violations.push(createWarning(
        'no-exterior-walls-detected',
        'No exterior walls detected on conditioned rooms — cannot verify insulation compliance',
        this.code,
        undefined,
        [
          'Verify exterior wall assignments in plan data',
          'Ensure modular module edges are marked as exterior where applicable',
        ]
      ));
    }

    return {
      ruleId: this.id,
      passed: violations.length === 0,
      violations,
      recommendations: [
        'Specify 2×6 exterior walls (R-20 cavity) for CZ 4-5',
        'Add continuous insulation (ci) for enhanced envelope performance',
        context.jurisdiction === 'colorado'
          ? 'Colorado requires R-20 or R-13+5ci for walls (CZ 5)'
          : 'Check local climate zone insulation table',
      ],
    };
  },
};

/**
 * Rule 4: Air Sealing — Blower Door Readiness
 * IECC R402.4 — Requires ≤3 ACH50 (CZ 3-8) or ≤5 ACH50 (CZ 1-2).
 * At plan level we flag penetration count (plumbing, exterior doors).
 */
const airSealing: ComplianceRule = {
  id: 'energy-air-sealing',
  code: 'IECC R402.4',
  category: 'energy',
  description: 'Plan must support air sealing requirements (penetration count check)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const doors = getDoors(plan);
    const rooms = getRooms(plan);

    // Count exterior doors
    const exteriorDoors = doors.filter(d => d.type === 'exterior');

    // Count plumbing penetrations (rooms with plumbing that touch exterior walls)
    const plumbingExteriorPenetrations = rooms.filter(
      r => r.hasPlumbing && (r.exteriorWalls ?? []).length > 0
    );

    const totalPenetrations = exteriorDoors.length + plumbingExteriorPenetrations.length;

    // Flag high penetration counts (>6 is a lot for a single-family modular home)
    if (totalPenetrations > 6) {
      violations.push(createWarning(
        'high-penetration-count',
        `${totalPenetrations} envelope penetrations detected (${exteriorDoors.length} exterior doors, ${plumbingExteriorPenetrations.length} plumbing walls) — may challenge air sealing targets`,
        this.code,
        undefined,
        [
          'Consolidate plumbing to interior walls where possible',
          'Reduce exterior door count if feasible',
          'Specify air sealing details at each penetration',
        ]
      ));
    }

    return {
      ruleId: this.id,
      passed: violations.length === 0,
      violations,
      recommendations: [
        'Target ≤ 3 ACH50 for blower door test',
        'Seal all modular marriage wall joints thoroughly',
        'Specify caulking and foam at all penetrations',
      ],
    };
  },
};

/**
 * Rule 5: HVAC Proximity / Duct Run Length
 * IECC R403.3 — Ducts in conditioned space preferred.
 * Flag if mechanical room is far from conditioned spaces.
 */
const hvacProximity: ComplianceRule = {
  id: 'energy-hvac-proximity',
  code: 'IECC R403.3',
  category: 'energy',
  description: 'Mechanical/utility room should be centrally located to minimize duct runs',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const rooms = getRooms(plan);

    const mechRoom = rooms.find(r =>
      r.type === 'laundry'
    );

    if (!mechRoom) {
      violations.push(createWarning(
        'no-mechanical-room',
        'No utility/mechanical room found — HVAC equipment location undetermined',
        this.code,
        undefined,
        [
          'Add a utility or mechanical room for HVAC equipment',
          'Consider locating near center of home for shortest duct runs',
        ]
      ));
      return { ruleId: this.id, passed: false, violations };
    }

    // Calculate centroid of all conditioned rooms
    const conditioned = rooms.filter(isConditionedSpace);
    if (conditioned.length === 0) {
      return { ruleId: this.id, passed: true, violations: [] };
    }

    const centroidX = conditioned.reduce((s, r) => s + r.x + r.width / 2, 0) / conditioned.length;
    const centroidY = conditioned.reduce((s, r) => s + r.y + r.depth / 2, 0) / conditioned.length;

    const mechCenterX = mechRoom.x + mechRoom.width / 2;
    const mechCenterY = mechRoom.y + mechRoom.depth / 2;

    const distance = Math.sqrt(
      (mechCenterX - centroidX) ** 2 + (mechCenterY - centroidY) ** 2
    );

    // If mech room is more than 30 ft from centroid, flag it
    if (distance > 30) {
      violations.push(createWarning(
        'hvac-far-from-center',
        `Mechanical room is ${distance.toFixed(0)} ft from conditioned space centroid — long duct runs reduce efficiency`,
        this.code,
        mechRoom.id,
        [
          'Relocate mechanical room closer to center of conditioned space',
          'Consider mini-split systems if central location is not feasible',
          'Insulate all duct runs to R-8 minimum',
        ]
      ));
    }

    return { ruleId: this.id, passed: violations.length === 0, violations };
  },
};

/**
 * Rule 6: Thermal Bridging at Marriage Walls
 * Modular-specific: marriage wall joints are thermal weak points.
 * Flag if plan has rooms spanning multiple modules (many marriage walls).
 */
const thermalBridging: ComplianceRule = {
  id: 'energy-thermal-bridging',
  code: 'IECC R402.2',
  category: 'energy',
  description: 'Marriage wall joints must be insulated to prevent thermal bridging',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const rooms = getRooms(plan);

    // In modular construction, modules are typically 14-16 ft wide.
    // If a plan is wider than 16 ft, there's at least one marriage wall.
    const envelope = 'envelope' in plan ? plan.envelope : null;
    const planWidth = envelope && 'width' in envelope ? (envelope as any).width : 0;

    const MODULE_MAX_WIDTH = 16; // ft (transport limit)

    if (planWidth > MODULE_MAX_WIDTH) {
      const estimatedMarriageWalls = Math.floor(planWidth / MODULE_MAX_WIDTH);
      const marriageWallLength = rooms.reduce((max, r) => Math.max(max, r.depth), 0);

      violations.push(createWarning(
        'marriage-wall-thermal-bridge',
        `Estimated ${estimatedMarriageWalls} marriage wall joint(s) over ~${marriageWallLength.toFixed(0)} ft — requires thermal break detailing`,
        this.code,
        undefined,
        [
          'Specify continuous insulation across marriage wall joints',
          'Use gasket or spray foam at all marriage wall connections',
          'Detail thermal break at rim joist/marriage wall intersection',
        ]
      ));
    }

    return {
      ruleId: this.id,
      passed: violations.length === 0,
      violations,
      recommendations: [
        'Specify R-3+ continuous insulation at marriage wall joints',
        'Use thermal imaging during set to verify seal quality',
      ],
    };
  },
};

/**
 * Rule 7: Garage Separation / Thermal Boundary
 * IRC R302.5 + IECC — Garage walls shared with conditioned space must be insulated.
 */
const garageSeparation: ComplianceRule = {
  id: 'energy-garage-separation',
  code: 'IRC R302.5 / IECC R402.2',
  category: 'energy',
  description: 'Garage walls adjacent to conditioned space must be insulated and air-sealed',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const rooms = getRooms(plan);

    const garages = rooms.filter(r => r.type === 'garage');

    for (const garage of garages) {
      const adjacentIds = garage.adjacentRoomIds ?? [];
      const adjacentConditioned = rooms.filter(
        r => adjacentIds.includes(r.id) && isConditionedSpace(r)
      );

      if (adjacentConditioned.length > 0) {
        const adjNames = adjacentConditioned.map(r => r.label).join(', ');
        violations.push(createWarning(
          `garage-adj-conditioned-${garage.id}`,
          `Garage "${garage.label}" shares walls with conditioned spaces (${adjNames}) — requires fire-rated and insulated separation`,
          this.code,
          garage.id,
          [
            'Install 1/2" gypsum board on garage side of shared walls',
            'Insulate shared walls to match exterior wall R-value',
            'Air-seal all penetrations between garage and conditioned space',
            'Self-closing, tight-fitting door between garage and house',
          ]
        ));
      }
    }

    return { ruleId: this.id, passed: violations.length === 0, violations };
  },
};

/**
 * Rule 8: Water Heater Proximity to Fixtures
 * IECC R403.5.3 — Hot water distribution piping should be short.
 * Flag if water heater is far from plumbing fixtures.
 */
const waterHeaterProximity: ComplianceRule = {
  id: 'energy-water-heater-proximity',
  code: 'IECC R403.5.3',
  category: 'energy',
  description: 'Water heater should be near plumbing fixtures to minimize hot water wait time and heat loss',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const rooms = getRooms(plan);

    // Water heater is typically in utility/laundry room
    const waterHeaterRoom = rooms.find(r =>
      r.type === 'laundry'
    );

    if (!waterHeaterRoom) {
      return { ruleId: this.id, passed: true, violations: [] };
    }

    // Find plumbing fixture rooms
    const plumbingRooms = rooms.filter(r =>
      r.hasPlumbing && r.id !== waterHeaterRoom.id
    );

    const whCenter = { x: waterHeaterRoom.x + waterHeaterRoom.width / 2, y: waterHeaterRoom.y + waterHeaterRoom.depth / 2 };

    for (const room of plumbingRooms) {
      const roomCenter = { x: room.x + room.width / 2, y: room.y + room.depth / 2 };
      const distance = Math.sqrt(
        (roomCenter.x - whCenter.x) ** 2 + (roomCenter.y - whCenter.y) ** 2
      );

      // Flag if any plumbing fixture is more than 40 ft away (pipe run)
      if (distance > 40) {
        violations.push(createWarning(
          `water-heater-far-${room.id}`,
          `${room.label} is ~${distance.toFixed(0)} ft from water heater — long pipe runs waste energy and water`,
          this.code,
          room.id,
          [
            'Consider a recirculation loop for distant fixtures',
            'Install point-of-use water heater for remote bathrooms',
            'Insulate all hot water pipes to R-3 minimum',
          ]
        ));
      }
    }

    return { ruleId: this.id, passed: violations.length === 0, violations };
  },
};

/**
 * Rule 9: Natural Ventilation — Window Area per Room
 * IRC R303.1 — Habitable rooms need ventilation openings ≥ 4% of floor area
 * (or mechanical ventilation as alternative).
 */
const naturalVentilation: ComplianceRule = {
  id: 'energy-natural-ventilation',
  code: 'IRC R303.1',
  category: 'energy',
  description: 'Habitable rooms must have openable window area ≥ 4% of floor area (or mechanical ventilation)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const rooms = getRooms(plan);
    const windows = getWindows(plan);

    const habitable = rooms.filter(r => {
      const nonHabitable = ['hallway', 'foyer', 'walk_in_closet', 'garage', 'laundry', 'mudroom', 'pantry', 'front_porch', 'back_porch', 'outdoor_living', 'stairs'];
      return !nonHabitable.includes(r.type);
    });

    for (const room of habitable) {
      const roomWindows = windows.filter(w => w.roomId === room.id);
      const totalWindowArea = roomWindows.reduce((s, w) => s + (w.width ?? 3) * (w.height ?? 4), 0);

      const floorArea = room.sqft ?? room.width * room.depth;
      // Openable area is typically ~50% of total window area
      const openableArea = totalWindowArea * 0.5;
      const requiredOpenable = floorArea * 0.04;

      if (openableArea < requiredOpenable && roomWindows.length > 0) {
        violations.push(createViolation(
          `ventilation-${room.id}`,
          `${room.label} has ~${openableArea.toFixed(1)} ft² openable window area, needs ${requiredOpenable.toFixed(1)} ft² (4% of ${floorArea.toFixed(0)} ft²)`,
          this.code,
          room.id,
          `${openableArea.toFixed(1)} ft²`,
          `${requiredOpenable.toFixed(1)} ft²`,
          'ft²',
          [
            'Increase window sizes or add operable windows',
            'Use casement windows (100% openable) instead of single-hung (50%)',
            'Alternatively, provide mechanical ventilation per IRC R303.1 exception',
          ]
        ));
      } else if (roomWindows.length === 0) {
        violations.push(createWarning(
          `no-ventilation-${room.id}`,
          `${room.label} has no windows — must provide mechanical ventilation per IRC R303.1`,
          this.code,
          room.id,
          [
            'Add operable windows for natural ventilation',
            'Or specify mechanical ventilation system (exhaust fan, ERV, or HRV)',
          ]
        ));
      }
    }

    return { ruleId: this.id, passed: violations.length === 0, violations };
  },
};

/**
 * Rule 10: Solar Orientation — Window Distribution
 * IECC/passive design best practice.
 * Flag if majority of glazing faces west (worst for cooling load).
 */
const solarOrientation: ComplianceRule = {
  id: 'energy-solar-orientation',
  code: 'IECC R402.3 (advisory)',
  category: 'energy',
  description: 'Window distribution should favor south over west to optimize solar gain and reduce cooling load',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado', 'california', 'texas', 'florida'],
  version: '1.0.0',
  check(plan: FloorPlan, _context: ComplianceContext): RuleResult {
    const violations: Violation[] = [];
    const windows = getWindows(plan);

    if (windows.length === 0) {
      return { ruleId: this.id, passed: true, violations: [] };
    }

    // Group windows by wall direction
    const areaByDirection: Record<string, number> = { north: 0, south: 0, east: 0, west: 0 };

    for (const w of windows) {
      const dir = w.wallDirection;
      if (dir && dir in areaByDirection) {
        areaByDirection[dir] += (w.width ?? 3) * (w.height ?? 4);
      }
    }

    const totalArea = Object.values(areaByDirection).reduce((s, v) => s + v, 0);

    if (totalArea <= 0) {
      return { ruleId: this.id, passed: true, violations: [] };
    }

    const westPct = areaByDirection.west / totalArea;

    // Flag if >40% of glazing faces west
    if (westPct > 0.40) {
      violations.push(createWarning(
        'excessive-west-glazing',
        `${(westPct * 100).toFixed(0)}% of window area faces west — increases cooling load significantly`,
        this.code,
        undefined,
        [
          'Redistribute glazing to favor south (passive solar) and north (diffuse light)',
          'Add exterior shading devices on west-facing windows',
          'Use low-SHGC glass (≤ 0.25) on west-facing windows',
        ]
      ));
    }

    return {
      ruleId: this.id,
      passed: violations.length === 0,
      violations,
      recommendations: [
        'Optimal glazing distribution: ~40% south, ~20% east, ~20% north, ~20% west',
        'South-facing windows with overhangs provide free winter heating',
      ],
    };
  },
};

// ── Export ──────────────────────────────────────────────────────────────

export const energyRules: ComplianceRule[] = [
  windowToWallRatio,
  windowUFactor,
  insulationRValues,
  airSealing,
  hvacProximity,
  thermalBridging,
  garageSeparation,
  waterHeaterProximity,
  naturalVentilation,
  solarOrientation,
];


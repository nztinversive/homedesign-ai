/**
 * Energy Rules - IECC / IRC Chapter 11
 * Window ratios, insulation, air sealing, HVAC placement, solar orientation
 */

import type {
  ComplianceRule,
  RuleResult,
  Violation,
  FloorPlan,
  ComplianceContext,
  Room
} from '../types';

function createViolation(
  id: string,
  description: string,
  codeSection: string,
  roomId: string,
  currentValue: number | string,
  requiredValue: number | string,
  unit: string,
  remediation: string[],
  severity: 'error' | 'warning' | 'info' = 'error'
): Violation {
  return { id, description, severity, codeSection, roomId, currentValue, requiredValue, unit, remediation };
}

function isConditioned(room: Room): boolean {
  return !['garage', 'front_porch', 'back_porch', 'outdoor_living'].includes(room.type as string);
}

function isHabitable(room: Room): boolean {
  return !['garage', 'hallway', 'stairs', 'walk_in_closet', 'pantry', 'front_porch', 'back_porch', 'outdoor_living'].includes(room.type as string);
}

/**
 * IECC R402.3.3 - Window-to-wall ratio
 * Total window area max 15% of conditioned floor area (climate zones 4-5)
 */
const windowToWallRatio: ComplianceRule = {
  id: 'IECC-R402.3.3-window-ratio',
  code: 'R402.3.3',
  category: 'energy',
  description: 'Window area must not exceed 15% of conditioned floor area',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    // Calculate total conditioned floor area
    const conditionedArea = rooms
      .filter(isConditioned)
      .reduce((sum, r) => sum + r.width * r.depth, 0);

    // Estimate total window area from windows on rooms
    let totalWindowArea = 0;
    for (const room of rooms) {
      for (const win of room.windows || []) {
        const winArea = ((win.width || 3) * (win.height || 4)); // ft
        totalWindowArea += winArea;
      }
    }

    const maxRatio = 0.15;
    const maxWindowArea = conditionedArea * maxRatio;

    if (totalWindowArea > maxWindowArea && totalWindowArea > 0) {
      violations.push(createViolation(
        'window-to-wall-ratio',
        `Total window area ${totalWindowArea.toFixed(0)}sqft exceeds 15% of conditioned floor area (${maxWindowArea.toFixed(0)}sqft max)`,
        'IECC R402.3.3',
        '',
        `${totalWindowArea.toFixed(0)}sqft (${((totalWindowArea / conditionedArea) * 100).toFixed(1)}%)`,
        `${maxWindowArea.toFixed(0)}sqft (15%)`,
        'sqft',
        ['Reduce total window area', 'Use higher-performance glazing (lower U-factor) to compensate', 'Apply UA trade-off method per IECC R402.1.5']
      ));
    }

    return { ruleId: 'IECC-R402.3.3-window-ratio', passed: violations.length === 0, violations };
  }
};

/**
 * Air sealing risk - Rooms with excessive exterior exposure
 * Flag rooms with more than 2 exterior walls (higher energy loss)
 */
const airSealingRisk: ComplianceRule = {
  id: 'IECC-air-sealing-risk',
  code: 'IECC R402.4',
  category: 'energy',
  description: 'Rooms with more than 2 exterior walls have higher energy loss risk',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = (plan.rooms || []).filter(isConditioned);

    // Estimate exterior walls: rooms at building edges
    let maxX = 0, maxY = 0;
    for (const room of plan.rooms || []) {
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.depth);
    }

    for (const room of rooms) {
      let exteriorWalls = 0;
      if (room.x <= 0.5) exteriorWalls++;
      if (room.y <= 0.5) exteriorWalls++;
      if (room.x + room.width >= maxX - 0.5) exteriorWalls++;
      if (room.y + room.depth >= maxY - 0.5) exteriorWalls++;

      if (exteriorWalls > 2) {
        violations.push(createViolation(
          `air-sealing-${room.id}`,
          `${room.label || room.type} has ${exteriorWalls} exterior walls — high energy loss risk, prioritize air sealing`,
          'IECC R402.4',
          room.id,
          `${exteriorWalls} exterior walls`,
          '2 or fewer preferred',
          '',
          ['Ensure continuous air barrier on all exterior walls', 'Consider additional insulation on corner rooms', 'Blower door test target: 3 ACH50 or lower'],
          'warning'
        ));
      }
    }

    return { ruleId: 'IECC-air-sealing-risk', passed: violations.length === 0, violations };
  }
};

/**
 * IRC N1102.1 - Insulation R-values reminder
 * Exterior walls R-20, ceiling R-49, floor R-30 (Climate Zone 5)
 */
const insulationRequirements: ComplianceRule = {
  id: 'N1102.1-insulation',
  code: 'N1102.1',
  category: 'energy',
  description: 'Verify insulation meets minimum R-values for climate zone',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const climateZone = context.climateZone || 5; // Colorado default

    const requirements: Record<number, { walls: number; ceiling: number; floor: number }> = {
      3: { walls: 20, ceiling: 38, floor: 19 },
      4: { walls: 20, ceiling: 49, floor: 19 },
      5: { walls: 20, ceiling: 49, floor: 30 },
      6: { walls: 20, ceiling: 49, floor: 30 },
    };

    const req = requirements[climateZone] || requirements[5];

    violations.push(createViolation(
      'insulation-requirements',
      `Climate Zone ${climateZone}: verify exterior walls R-${req.walls}, ceiling R-${req.ceiling}, floor R-${req.floor}`,
      'IRC N1102.1 / IECC Table R402.1.2',
      '',
      'design phase',
      `Walls R-${req.walls}, Ceiling R-${req.ceiling}, Floor R-${req.floor}`,
      'R-value',
      [`Specify wall insulation R-${req.walls} minimum`, `Specify ceiling insulation R-${req.ceiling} minimum`, `Specify floor insulation R-${req.floor} minimum`],
      'info'
    ));

    return { ruleId: 'N1102.1-insulation', passed: true, violations };
  }
};

/**
 * Garage thermal separation
 * Garage must be thermally separated from conditioned space
 */
const garageThermalSeparation: ComplianceRule = {
  id: 'IECC-garage-separation',
  code: 'IECC R402.2',
  category: 'energy',
  description: 'Garage must be thermally separated from conditioned living space',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];
    const garages = rooms.filter(r => r.type === 'garage');
    const conditioned = rooms.filter(isConditioned);

    for (const garage of garages) {
      // Check if garage shares walls with conditioned rooms
      const garageRight = garage.x + garage.width;
      const garageBottom = garage.y + garage.depth;

      for (const room of conditioned) {
        const roomRight = room.x + room.width;
        const roomBottom = room.y + room.depth;

        // Check adjacency (shared wall)
        const sharesWall = (
          (Math.abs(garage.x - roomRight) < 0.5 || Math.abs(garageRight - room.x) < 0.5) &&
          garage.y < roomBottom && garageBottom > room.y
        ) || (
          (Math.abs(garage.y - roomBottom) < 0.5 || Math.abs(garageBottom - room.y) < 0.5) &&
          garage.x < roomRight && garageRight > room.x
        );

        if (sharesWall) {
          violations.push(createViolation(
            `garage-separation-${garage.id}-${room.id}`,
            `Garage shares wall with ${room.label || room.type} — must have thermal barrier and air sealing`,
            'IECC R402.2',
            garage.id,
            'shared wall detected',
            'thermal barrier required',
            '',
            ['Install min R-20 insulation on garage-side of shared wall', 'Air seal all penetrations', 'Use 5/8" Type X drywall on garage side (also fire code)'],
            'warning'
          ));
          break; // One warning per garage is enough
        }
      }
    }

    return { ruleId: 'IECC-garage-separation', passed: violations.length === 0, violations };
  }
};

/**
 * IRC R303.1 - Natural ventilation
 * Habitable rooms need openable window area >= 4% of floor area
 */
const naturalVentilation: ComplianceRule = {
  id: 'R303.1-ventilation',
  code: 'R303.1',
  category: 'energy',
  description: 'Habitable rooms must have natural ventilation (openable window area >= 4% of floor area)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = (plan.rooms || []).filter(isHabitable);

    for (const room of rooms) {
      const floorArea = room.width * room.depth;
      const minWindowArea = floorArea * 0.04;
      const windows = room.windows || [];

      const totalWindowArea = windows.reduce((sum, w) => {
        return sum + ((w.width || 3) * (w.height || 4));
      }, 0);

      if (windows.length === 0) {
        violations.push(createViolation(
          `ventilation-no-windows-${room.id}`,
          `${room.label || room.type} has no windows — habitable rooms require openable window area >= 4% of floor area`,
          'IRC R303.1',
          room.id,
          '0 sqft',
          `${minWindowArea.toFixed(1)} sqft minimum`,
          'sqft',
          [`Add openable windows totaling at least ${minWindowArea.toFixed(1)} sqft`]
        ));
      } else if (totalWindowArea < minWindowArea) {
        violations.push(createViolation(
          `ventilation-insufficient-${room.id}`,
          `${room.label || room.type} window area ${totalWindowArea.toFixed(1)}sqft is below ${minWindowArea.toFixed(1)}sqft minimum (4% of ${floorArea.toFixed(0)}sqft floor)`,
          'IRC R303.1',
          room.id,
          `${totalWindowArea.toFixed(1)} sqft`,
          `${minWindowArea.toFixed(1)} sqft`,
          'sqft',
          ['Add or enlarge windows to meet 4% ventilation requirement', 'Or provide mechanical ventilation per IRC M1507'],
          'warning'
        ));
      }
    }

    return { ruleId: 'R303.1-ventilation', passed: violations.length === 0, violations };
  }
};

/**
 * HVAC proximity - Mechanical room centrality
 * Utility/mechanical room should be centrally located for efficient distribution
 */
const hvacProximity: ComplianceRule = {
  id: 'IECC-hvac-proximity',
  code: 'IECC R403.3',
  category: 'energy',
  description: 'Mechanical/utility room should be centrally located for efficient HVAC distribution',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    // Find mechanical room (laundry often doubles as utility)
    const mechRoom = rooms.find(r => r.type === 'laundry' || (r.label && r.label.toLowerCase().includes('utility')));

    if (!mechRoom) {
      violations.push(createViolation(
        'no-mechanical-room',
        'No dedicated mechanical/utility room identified — HVAC equipment needs designated space',
        'IECC R403.3',
        '',
        'not found',
        'dedicated space required',
        '',
        ['Designate a utility/mechanical room for HVAC, water heater, and electrical panel'],
        'warning'
      ));
      return { ruleId: 'IECC-hvac-proximity', passed: false, violations };
    }

    // Check centrality
    let maxX = 0, maxY = 0;
    for (const room of rooms) {
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.depth);
    }

    const buildingCenterX = maxX / 2;
    const buildingCenterY = maxY / 2;
    const mechCenterX = mechRoom.x + mechRoom.width / 2;
    const mechCenterY = mechRoom.y + mechRoom.depth / 2;

    const distFromCenter = Math.sqrt(
      Math.pow(mechCenterX - buildingCenterX, 2) +
      Math.pow(mechCenterY - buildingCenterY, 2)
    );
    const buildingDiag = Math.sqrt(maxX * maxX + maxY * maxY);
    const distRatio = distFromCenter / (buildingDiag / 2);

    if (distRatio > 0.6) {
      violations.push(createViolation(
        'hvac-not-central',
        `Mechanical room is at ${(distRatio * 100).toFixed(0)}% distance from center — duct runs will be longer, reducing efficiency`,
        'IECC R403.3',
        mechRoom.id,
        `${(distRatio * 100).toFixed(0)}% from center`,
        '< 40% from center',
        '',
        ['Move mechanical room closer to building center for shorter duct runs', 'Or plan for insulated ductwork to offset losses'],
        'info'
      ));
    }

    return { ruleId: 'IECC-hvac-proximity', passed: violations.length === 0, violations };
  }
};

/**
 * Water heater proximity
 * Water heater should be within 30ft pipe run of kitchen and bathrooms
 */
const waterHeaterProximity: ComplianceRule = {
  id: 'ENERGY-water-heater',
  code: 'IECC R403.5',
  category: 'energy',
  description: 'Water heater should be within 30ft pipe run of kitchen and bathrooms',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    const waterHeaterRoom = rooms.find(r => r.type === 'laundry' || (r.label && r.label.toLowerCase().includes('utility')));
    if (!waterHeaterRoom) return { ruleId: 'ENERGY-water-heater', passed: true, violations };

    const whCenterX = waterHeaterRoom.x + waterHeaterRoom.width / 2;
    const whCenterY = waterHeaterRoom.y + waterHeaterRoom.depth / 2;

    const plumbingRooms = rooms.filter(r =>
      r.type === 'kitchen' || r.type === 'bathroom' || r.type === 'primary_bath' || r.type === 'half_bath' || r.type === 'laundry'
    );

    for (const room of plumbingRooms) {
      if (room.id === waterHeaterRoom.id) continue;
      const roomCenterX = room.x + room.width / 2;
      const roomCenterY = room.y + room.depth / 2;
      // Manhattan distance as pipe run estimate
      const pipeRunFt = Math.abs(whCenterX - roomCenterX) + Math.abs(whCenterY - roomCenterY);

      if (pipeRunFt > 30) {
        violations.push(createViolation(
          `water-heater-dist-${room.id}`,
          `${room.label || room.type} is ~${pipeRunFt.toFixed(0)}ft pipe run from water heater — exceeds 30ft recommended max`,
          'IECC R403.5',
          room.id,
          `${pipeRunFt.toFixed(0)}ft`,
          '30ft max',
          'feet',
          ['Move water heater closer to distant fixtures', 'Or install point-of-use tankless water heater', 'Or add recirculation loop'],
          'info'
        ));
      }
    }

    return { ruleId: 'ENERGY-water-heater', passed: violations.length === 0, violations };
  }
};

export const energyRules: ComplianceRule[] = [
  windowToWallRatio,
  airSealingRisk,
  insulationRequirements,
  garageThermalSeparation,
  naturalVentilation,
  hvacProximity,
  waterHeaterProximity,
];

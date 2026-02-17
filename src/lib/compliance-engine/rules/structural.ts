/**
 * Structural Rules - IRC R301-R502
 * Load-bearing walls, spans, ceiling heights, modular transport constraints
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

function isHabitable(room: Room): boolean {
  return !['garage', 'hallway', 'stairs', 'walk_in_closet', 'pantry', 'front_porch', 'back_porch', 'outdoor_living'].includes(room.type as string);
}

/**
 * R502.3 - Maximum room span without intermediate support
 * Floor joists max 20ft span without beam/bearing wall
 */
const maxRoomSpan: ComplianceRule = {
  id: 'R502.3-max-span',
  code: 'R502.3',
  category: 'structural',
  description: 'Rooms wider than 20ft need intermediate structural support',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const maxSpanFt = 20;

    for (const room of plan.rooms || []) {
      const maxDim = Math.max(room.width, room.depth);
      if (maxDim > maxSpanFt) {
        violations.push(createViolation(
          `max-span-${room.id}`,
          `${room.label || room.type} has ${maxDim}ft span exceeding ${maxSpanFt}ft max without intermediate support`,
          'IRC R502.3',
          room.id,
          maxDim,
          maxSpanFt,
          'feet',
          [`Add beam or load-bearing wall to break span to under ${maxSpanFt}ft`, 'Consider LVL or steel beam for open-concept layout']
        ));
      }
    }

    return { ruleId: 'R502.3-max-span', passed: violations.length === 0, violations };
  }
};

/**
 * R305.1 - Minimum ceiling height
 * Habitable rooms: 7ft min, bathrooms/hallways: 6ft 8in min
 */
const ceilingHeight: ComplianceRule = {
  id: 'R305.1-ceiling-height',
  code: 'R305.1',
  category: 'structural',
  description: 'Rooms must meet minimum ceiling height requirements',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    for (const room of rooms) {
      const ceilingFt = room.ceilingHeight || 8; // default 8ft if not specified
      const isHab = isHabitable(room);
      const minHeight = isHab ? 7 : 6.67; // 7ft habitable, 6'8" non-habitable
      const minLabel = isHab ? "7ft" : "6ft 8in";

      if (ceilingFt < minHeight) {
        violations.push(createViolation(
          `ceiling-height-${room.id}`,
          `${room.label || room.type} ceiling height ${ceilingFt}ft is below ${minLabel} minimum`,
          'IRC R305.1',
          room.id,
          `${ceilingFt}ft`,
          minLabel,
          'feet',
          [`Raise ceiling to at least ${minLabel}`]
        ));
      }
    }

    return { ruleId: 'R305.1-ceiling-height', passed: violations.length === 0, violations };
  }
};

/**
 * R602.3 - Header sizing for openings
 * Openings wider than 4ft in load-bearing walls need headers
 */
const headerSizing: ComplianceRule = {
  id: 'R602.3-headers',
  code: 'R602.3',
  category: 'structural',
  description: 'Openings wider than 4ft in walls need engineered headers',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];

    for (const room of plan.rooms || []) {
      for (const door of room.doors || []) {
        const doorWidthFt = (door.width || 30) / 12;
        if (doorWidthFt > 4) {
          violations.push(createViolation(
            `header-${room.id}-${door.id || 'door'}`,
            `Opening in ${room.label || room.type} is ${(doorWidthFt).toFixed(1)}ft wide — requires engineered header`,
            'IRC R602.3',
            room.id,
            `${(doorWidthFt).toFixed(1)}ft`,
            '4ft max without header',
            'feet',
            ['Specify header size per IRC Table R602.7', 'For spans >6ft consider LVL or steel header'],
            'warning'
          ));
        }
      }
    }

    return { ruleId: 'R602.3-headers', passed: violations.length === 0, violations };
  }
};

/**
 * Modular Transport - Maximum module width
 * Highway transport max 16ft wide, 72ft long
 */
const modularTransportWidth: ComplianceRule = {
  id: 'MOD-transport-width',
  code: 'DOT Modular Transport',
  category: 'structural',
  description: 'Module sections must not exceed highway transport limits (16ft wide, 72ft long)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const maxWidthFt = 16;
    const maxLengthFt = 72;
    const rooms = plan.rooms || [];

    // Estimate overall building dimensions from room positions
    let maxX = 0;
    let maxY = 0;
    for (const room of rooms) {
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.depth);
    }

    // For single-wide modular, the narrower dimension should be ≤16ft
    const narrowDim = Math.min(maxX, maxY);
    const longDim = Math.max(maxX, maxY);

    if (narrowDim > maxWidthFt) {
      violations.push(createViolation(
        'transport-width',
        `Building narrow dimension is ${narrowDim.toFixed(1)}ft — exceeds ${maxWidthFt}ft highway transport limit for single module. Plan as multi-section.`,
        'DOT Modular Transport',
        '',
        `${narrowDim.toFixed(1)}ft`,
        `${maxWidthFt}ft per module`,
        'feet',
        ['Split into multiple modules at marriage wall', 'Each module section max 16ft wide'],
        'warning'
      ));
    }

    if (longDim > maxLengthFt) {
      violations.push(createViolation(
        'transport-length',
        `Building length is ${longDim.toFixed(1)}ft — exceeds ${maxLengthFt}ft highway transport limit`,
        'DOT Modular Transport',
        '',
        `${longDim.toFixed(1)}ft`,
        `${maxLengthFt}ft`,
        'feet',
        ['Reduce overall building length or split into additional modules']
      ));
    }

    return { ruleId: 'MOD-transport-width', passed: violations.length === 0, violations };
  }
};

/**
 * Modular - Marriage wall alignment
 * Where two modules join, walls must align for structural continuity
 */
const marriageWallAlignment: ComplianceRule = {
  id: 'MOD-marriage-wall',
  code: 'HUD Modular Standards',
  category: 'structural',
  description: 'Marriage walls (module join lines) must align with room boundaries',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];
    const maxWidthFt = 16;

    // Find rooms that cross potential marriage wall lines (every 16ft)
    let maxX = 0;
    for (const room of rooms) {
      maxX = Math.max(maxX, room.x + room.width);
    }

    if (maxX > maxWidthFt) {
      const marriageLines: number[] = [];
      for (let x = maxWidthFt; x < maxX; x += maxWidthFt) {
        marriageLines.push(x);
      }

      for (const line of marriageLines) {
        for (const room of rooms) {
          const roomLeft = room.x;
          const roomRight = room.x + room.width;
          // Room crosses a marriage line if it spans across it
          if (roomLeft < line && roomRight > line) {
            violations.push(createViolation(
              `marriage-wall-${room.id}-${line}`,
              `${room.label || room.type} crosses potential marriage wall at ${line}ft — room spans ${roomLeft}ft to ${roomRight}ft`,
              'HUD Modular Standards',
              room.id,
              `spans ${roomLeft}-${roomRight}ft`,
              `must not cross ${line}ft line`,
              'feet',
              ['Adjust room boundaries to align with module split line', 'Or adjust module split to avoid crossing this room'],
              'warning'
            ));
          }
        }
      }
    }

    return { ruleId: 'MOD-marriage-wall', passed: violations.length === 0, violations };
  }
};

/**
 * R403.1 - Foundation bearing
 * Exterior walls need continuous foundation support
 */
const foundationBearing: ComplianceRule = {
  id: 'R403.1-foundation',
  code: 'R403.1',
  category: 'structural',
  description: 'Exterior walls must have continuous foundation support with min 12in wide footings',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    // Calculate building perimeter
    let maxX = 0, maxY = 0;
    for (const room of rooms) {
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.depth);
    }
    const perimeterFt = 2 * (maxX + maxY);

    if (perimeterFt > 0) {
      violations.push(createViolation(
        'foundation-bearing',
        `Building perimeter is ${perimeterFt.toFixed(0)}ft — verify continuous foundation footing (min 12in wide) supports all exterior walls`,
        'IRC R403.1',
        '',
        `${perimeterFt.toFixed(0)}ft perimeter`,
        'continuous support required',
        'feet',
        ['Specify continuous strip footing min 12in wide under all exterior walls', 'Include pier/pad footings under interior load-bearing points'],
        'info'
      ));
    }

    return { ruleId: 'R403.1-foundation', passed: violations.length === 0, violations };
  }
};

/**
 * R301 - Point loads above garage/large spans
 * Rooms above large open spaces need beam support
 */
const pointLoads: ComplianceRule = {
  id: 'R301-point-loads',
  code: 'R301.2',
  category: 'structural',
  description: 'Large open-span rooms (garage, great room) need identified beam support points',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const largeSpanTypes = ['garage', 'great_room'];

    for (const room of plan.rooms || []) {
      if (largeSpanTypes.includes(room.type as string)) {
        const maxDim = Math.max(room.width, room.depth);
        if (maxDim > 14) {
          violations.push(createViolation(
            `point-load-${room.id}`,
            `${room.label || room.type} is ${maxDim}ft — identify beam support points for this large span`,
            'IRC R301.2',
            room.id,
            `${maxDim}ft span`,
            'beam support required >14ft',
            'feet',
            ['Specify beam locations and sizing', 'Consider steel beam or engineered lumber (LVL) for spans >14ft'],
            'warning'
          ));
        }
      }
    }

    return { ruleId: 'R301-point-loads', passed: violations.length === 0, violations };
  }
};

export const structuralRules: ComplianceRule[] = [
  maxRoomSpan,
  ceilingHeight,
  headerSizing,
  modularTransportWidth,
  marriageWallAlignment,
  foundationBearing,
  pointLoads,
];

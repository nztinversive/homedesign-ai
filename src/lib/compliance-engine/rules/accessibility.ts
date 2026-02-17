/**
 * Accessibility Rules - ADA / Fair Housing Act / IRC R320
 * Wheelchair accessibility, grab bar blocking, lever hardware, and main-floor access
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

function isBathroom(room: Room): boolean {
  return room.type === 'bathroom' || room.type === 'primary_bath' || room.type === 'half_bath';
}

function isBedroom(room: Room): boolean {
  return room.type === 'bedroom' || room.type === 'primary_bed';
}

function isHabitable(room: Room): boolean {
  return !['garage', 'hallway', 'stairs', 'walk_in_closet', 'pantry'].includes(room.type as string);
}

/**
 * R320.1 - Minimum doorway clear width
 * Primary entrance: 36in clear (ADA), interior doors: 32in clear
 */
const doorwayClearWidth: ComplianceRule = {
  id: 'ADA-doorway-width',
  code: 'R320.1',
  category: 'accessibility',
  description: 'Doorways must meet minimum clear width for wheelchair passage',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    for (const room of rooms) {
      const doors = room.doors || [];
      for (const door of doors) {
        const doorWidth = door.width || 30;
        const isExterior = door.isExterior || false;
        const minWidth = isExterior ? 36 : 32;

        if (doorWidth < minWidth) {
          violations.push(createViolation(
            `doorway-width-${room.id}-${door.id || 'door'}`,
            `${isExterior ? 'Exterior' : 'Interior'} door in ${room.label || room.type} is ${doorWidth}in wide, minimum ${minWidth}in required`,
            'IRC R320.1',
            room.id,
            doorWidth,
            minWidth,
            'inches',
            [`Widen doorway to at least ${minWidth} inches clear`]
          ));
        }
      }
    }

    return { ruleId: 'ADA-doorway-width', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Bathroom turning radius
 * 60in diameter clear floor space for wheelchair users in at least one bathroom
 */
const bathroomTurningRadius: ComplianceRule = {
  id: 'ADA-bathroom-turning',
  code: 'ADA 304.3',
  category: 'accessibility',
  description: 'At least one bathroom must have 60-inch turning radius for wheelchair access',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const bathrooms = (plan.rooms || []).filter(isBathroom);
    const turningDiameter = 60; // inches = 5 feet

    let hasAccessibleBathroom = false;
    for (const room of bathrooms) {
      const minDim = Math.min(room.width * 12, room.depth * 12); // convert ft to inches
      if (minDim >= turningDiameter) {
        hasAccessibleBathroom = true;
        break;
      }
    }

    if (bathrooms.length > 0 && !hasAccessibleBathroom) {
      violations.push(createViolation(
        'bathroom-turning-radius',
        'No bathroom has sufficient space for a 60-inch wheelchair turning radius',
        'ADA 304.3',
        bathrooms[0].id,
        `${Math.min(...bathrooms.map(b => Math.min(b.width, b.depth)))}ft min dimension`,
        '5ft (60in)',
        'feet',
        ['Enlarge at least one bathroom to minimum 5ft x 5ft clear floor space']
      ));
    }

    return { ruleId: 'ADA-bathroom-turning', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Grab bar blocking
 * Walls near tub/shower/toilet must have blocking for future grab bar installation
 */
const grabBarBlocking: ComplianceRule = {
  id: 'ADA-grab-bar-blocking',
  code: 'IRC R320.1',
  category: 'accessibility',
  description: 'Bathroom walls must have blocking for future grab bar installation',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const bathrooms = (plan.rooms || []).filter(isBathroom);

    for (const room of bathrooms) {
      // Flag all bathrooms as needing grab bar blocking (info-level)
      violations.push(createViolation(
        `grab-bar-blocking-${room.id}`,
        `${room.label || room.type}: ensure wall blocking is specified for future grab bars near toilet, tub, and shower locations`,
        'IRC R320.1',
        room.id,
        'not specified',
        'blocking required',
        '',
        ['Add wood blocking (2x6 min) between studs at 33-36in height on all wet walls'],
        'info'
      ));
    }

    return { ruleId: 'ADA-grab-bar-blocking', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Kitchen clearances for wheelchair
 * 40in between opposing counters standard, 60in for wheelchair access
 */
const kitchenWheelchairClearance: ComplianceRule = {
  id: 'ADA-kitchen-clearance',
  code: 'ADA 804.2',
  category: 'accessibility',
  description: 'Kitchen must have adequate clearance between opposing counters for wheelchair access',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const kitchens = (plan.rooms || []).filter(r => r.type === 'kitchen');

    for (const kitchen of kitchens) {
      const minDimFt = Math.min(kitchen.width, kitchen.depth);
      // Standard counter depth is ~2ft on each side, so clearance = room width - 4ft
      const estimatedClearanceFt = minDimFt - 4;
      const minClearanceFt = 5; // 60in ADA

      if (estimatedClearanceFt < minClearanceFt) {
        violations.push(createViolation(
          `kitchen-clearance-${kitchen.id}`,
          `Kitchen ${kitchen.label || ''} estimated aisle clearance is ${(estimatedClearanceFt * 12).toFixed(0)}in, ADA requires 60in minimum`,
          'ADA 804.2',
          kitchen.id,
          `${(estimatedClearanceFt * 12).toFixed(0)}in`,
          '60in',
          'inches',
          ['Widen kitchen to at least 9ft in the narrowest dimension to allow 60in clearance between counters'],
          'warning'
        ));
      }
    }

    return { ruleId: 'ADA-kitchen-clearance', passed: violations.length === 0, violations };
  }
};

/**
 * Fair Housing - Main floor bedroom and bathroom
 * At least one bedroom and one full bathroom must be on the main floor
 */
const mainFloorAccessibility: ComplianceRule = {
  id: 'FHA-main-floor-access',
  code: 'Fair Housing Act',
  category: 'accessibility',
  description: 'At least one bedroom and one full bathroom must be accessible on the main floor',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    // For single-story modular homes, all rooms are on main floor
    // For multi-story, check floor property
    const mainFloorRooms = rooms.filter(r => !r.floor || r.floor === 1);

    const hasBedroom = mainFloorRooms.some(isBedroom);
    const hasFullBath = mainFloorRooms.some(r => r.type === 'bathroom' || r.type === 'primary_bath');

    if (!hasBedroom) {
      violations.push(createViolation(
        'main-floor-no-bedroom',
        'No bedroom found on the main floor — Fair Housing requires at least one accessible bedroom',
        'Fair Housing Act 24 CFR 100.205',
        '',
        '0 bedrooms on main floor',
        '1 minimum',
        '',
        ['Add at least one bedroom on the main floor or ensure elevator access to upper floors']
      ));
    }

    if (!hasFullBath) {
      violations.push(createViolation(
        'main-floor-no-bathroom',
        'No full bathroom found on the main floor — Fair Housing requires at least one accessible bathroom',
        'Fair Housing Act 24 CFR 100.205',
        '',
        '0 full bathrooms on main floor',
        '1 minimum',
        '',
        ['Add at least one full bathroom on the main floor']
      ));
    }

    return { ruleId: 'FHA-main-floor-access', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Threshold heights
 * Interior: max 0.5in, exterior: max 0.75in with bevel
 */
const thresholdHeights: ComplianceRule = {
  id: 'ADA-thresholds',
  code: 'ADA 303',
  category: 'accessibility',
  description: 'Door thresholds must not exceed maximum heights for wheelchair passage',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    // This is a construction-phase check — at plan review, we flag as info
    const violations: Violation[] = [];
    const rooms = (plan.rooms || []).filter(r => r.doors && r.doors.length > 0);

    const hasExteriorDoors = rooms.some(r => (r.doors || []).some(d => d.isExterior));

    if (hasExteriorDoors) {
      violations.push(createViolation(
        'threshold-height-reminder',
        'Verify exterior door thresholds do not exceed 0.75in (beveled) for wheelchair access',
        'ADA 303',
        '',
        'design phase',
        '0.75in max exterior, 0.5in max interior',
        'inches',
        ['Specify low-profile thresholds at all exterior doors', 'Use beveled transitions where threshold is needed'],
        'info'
      ));
    }

    return { ruleId: 'ADA-thresholds', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Lever hardware requirement
 * All doors should specify lever handles, not round knobs
 */
const leverHardware: ComplianceRule = {
  id: 'ADA-lever-hardware',
  code: 'ADA 404.2.7',
  category: 'accessibility',
  description: 'All door hardware must be operable with one hand without tight grasping (lever handles)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    // Plan-level reminder — hardware is a spec detail
    const totalDoors = (plan.rooms || []).reduce((sum, r) => sum + (r.doors || []).length, 0);

    if (totalDoors > 0) {
      violations.push(createViolation(
        'lever-hardware-spec',
        `${totalDoors} doors in plan — specify lever-style handles (not round knobs) for ADA compliance`,
        'ADA 404.2.7',
        '',
        'not specified',
        'lever handles required',
        '',
        ['Specify lever-style door handles on all interior and exterior doors'],
        'info'
      ));
    }

    return { ruleId: 'ADA-lever-hardware', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Light switch and outlet heights
 * Switches: max 48in from floor, Outlets: min 15in from floor
 */
const switchOutletHeights: ComplianceRule = {
  id: 'ADA-switch-outlet-heights',
  code: 'ADA 308',
  category: 'accessibility',
  description: 'Light switches and outlets must be at accessible heights',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const habitableRooms = (plan.rooms || []).filter(isHabitable);

    if (habitableRooms.length > 0) {
      violations.push(createViolation(
        'switch-outlet-heights',
        'Verify all light switches at max 48in and outlets at min 15in from finished floor',
        'ADA 308',
        '',
        'design phase',
        'switches ≤48in, outlets ≥15in',
        'inches',
        ['Mount switches at 42-48in from floor', 'Mount outlets at 15-18in from floor'],
        'info'
      ));
    }

    return { ruleId: 'ADA-switch-outlet-heights', passed: violations.length === 0, violations };
  }
};

/**
 * ADA/FHA - No-step entry
 * Primary entrance should have ramp or zero-step entry
 */
const noStepEntry: ComplianceRule = {
  id: 'ADA-no-step-entry',
  code: 'Fair Housing Act / ADA 402',
  category: 'accessibility',
  description: 'Primary entrance must have no-step or ramp access',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const rooms = plan.rooms || [];

    const hasEntryRoom = rooms.some(r => r.type === 'foyer' || r.type === 'mudroom' || r.type === 'front_porch');

    if (hasEntryRoom) {
      violations.push(createViolation(
        'no-step-entry',
        'Verify primary entrance provides zero-step or ramped access for wheelchair users',
        'Fair Housing Act / ADA 402',
        '',
        'design phase',
        'zero-step or ramp required',
        '',
        ['Design primary entrance at grade level', 'If elevation change required, include ramp with max 1:12 slope', 'Ramp width minimum 36 inches'],
        'warning'
      ));
    }

    return { ruleId: 'ADA-no-step-entry', passed: violations.length === 0, violations };
  }
};

/**
 * ADA - Hallway width for wheelchair passage
 * Min 42in for wheelchair passing (stricter than standard 36in)
 */
const hallwayWheelchairWidth: ComplianceRule = {
  id: 'ADA-hallway-width',
  code: 'ADA 403.5',
  category: 'accessibility',
  description: 'Hallways should be 42 inches wide minimum for wheelchair passing',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',

  check: (plan: FloorPlan, _context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const hallways = (plan.rooms || []).filter(r => r.type === 'hallway');

    for (const hall of hallways) {
      const widthInches = Math.min(hall.width, hall.depth) * 12;
      if (widthInches < 42) {
        violations.push(createViolation(
          `hallway-wheelchair-${hall.id}`,
          `Hallway ${hall.label || ''} is ${widthInches.toFixed(0)}in wide, ADA recommends 42in for wheelchair passing`,
          'ADA 403.5',
          hall.id,
          `${widthInches.toFixed(0)}in`,
          '42in',
          'inches',
          ['Widen hallway to at least 42 inches (3.5ft) for wheelchair passage'],
          'warning'
        ));
      }
    }

    return { ruleId: 'ADA-hallway-width', passed: violations.length === 0, violations };
  }
};

export const accessibilityRules: ComplianceRule[] = [
  doorwayClearWidth,
  bathroomTurningRadius,
  grabBarBlocking,
  kitchenWheelchairClearance,
  mainFloorAccessibility,
  thresholdHeights,
  leverHardware,
  switchOutletHeights,
  noStepEntry,
  hallwayWheelchairWidth,
];

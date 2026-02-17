/**
 * Emergency Egress Rules - IRC R310 & R311
 * Emergency escape windows and exit requirements
 */

import type { 
  ComplianceRule, 
  RuleResult, 
  Violation, 
  FloorPlan, 
  ComplianceContext, 
  Room,
  EgressWindow,
  ComplianceDoor
} from '../types';

/**
 * Helper function to determine if a room requires egress
 */
function requiresEgress(room: Room): boolean {
  // Bedrooms and basement habitable spaces require emergency egress
  return room.type === 'primary_bed' || room.type === 'bedroom' || 
         (room.floor === 1 && room.zone !== 'garage'); // Basement assumption for floor 1
}

/**
 * Helper function to get windows for a room (placeholder - needs implementation)
 */
function getRoomWindows(room: Room, plan: FloorPlan): EgressWindow[] {
  // TODO: This needs actual implementation based on plan.windows
  // For now, return mock data to test rule structure
  return [];
}

/**
 * Helper function to create a violation
 */
function createViolation(
  id: string,
  description: string,
  codeSection: string,
  roomId: string,
  remediation: string[]
): Violation {
  return {
    id,
    description,
    severity: 'error',
    codeSection,
    roomId,
    remediation
  };
}

/**
 * R310.1 - Emergency escape windows required
 */
const emergencyEscapeRequired: ComplianceRule = {
  id: 'R310.1-emergency-escape-required',
  code: 'R310.1',
  category: 'egress',
  description: 'Bedrooms and basement habitable rooms must have emergency escape opening',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(requiresEgress)
      .forEach(room => {
        const windows = getRoomWindows(room, plan);
        const egressWindows = windows.filter(w => w.meetsEgressRequirements);
        
        if (egressWindows.length === 0) {
          violations.push(createViolation(
            `${room.id}-no-egress`,
            `Room "${room.label}" lacks required emergency escape opening`,
            'R310.1',
            room.id,
            [
              'Install emergency escape window meeting size requirements',
              'Ensure window is operable from inside',
              'Provide proper window well if below grade',
              'Consider door to exterior as alternative egress'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R310.1-emergency-escape-required',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R310.2.1 - Minimum opening dimensions
 */
const minimumOpeningDimensions: ComplianceRule = {
  id: 'R310.2.1-opening-dimensions',
  code: 'R310.2.1',
  category: 'egress',
  description: 'Emergency escape openings must have minimum clear width of 20" and height of 24"',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minWidth = 20; // inches
    const minHeight = 24; // inches
    
    plan.rooms
      .filter(requiresEgress)
      .forEach(room => {
        const windows = getRoomWindows(room, plan);
        
        windows.forEach(window => {
          if (window.clearWidth < minWidth) {
            violations.push(createViolation(
              `${window.id}-width-violation`,
              `Window clear width ${window.clearWidth}" below ${minWidth}" minimum`,
              'R310.2.1',
              room.id,
              [
                `Increase window clear width to ${minWidth}" minimum`,
                'Consider larger window size',
                'Verify window specification and operation'
              ]
            ));
          }
          
          if (window.clearHeight < minHeight) {
            violations.push(createViolation(
              `${window.id}-height-violation`,
              `Window clear height ${window.clearHeight}" below ${minHeight}" minimum`,
              'R310.2.1',
              room.id,
              [
                `Increase window clear height to ${minHeight}" minimum`,
                'Consider taller window size',
                'Verify window specification and operation'
              ]
            ));
          }
        });
      });
    
    return {
      ruleId: 'R310.2.1-opening-dimensions',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R310.2.2 - Minimum clear opening area
 */
const minimumClearOpeningArea: ComplianceRule = {
  id: 'R310.2.2-clear-area',
  code: 'R310.2.2',
  category: 'egress',
  description: 'Emergency escape openings must have minimum clear area of 5.7 sq ft (5.0 sq ft at grade)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(requiresEgress)
      .forEach(room => {
        const windows = getRoomWindows(room, plan);
        const isGradeLevel = room.floor === 1; // Simplified assumption
        const minArea = isGradeLevel ? 5.0 : 5.7; // sq ft
        
        windows.forEach(window => {
          if (window.clearArea < minArea) {
            violations.push(createViolation(
              `${window.id}-area-violation`,
              `Window clear area ${window.clearArea} sq ft below ${minArea} sq ft minimum`,
              'R310.2.2',
              room.id,
              [
                `Increase window clear area to ${minArea} sq ft minimum`,
                'Consider larger window or different window type',
                'Verify grade level determination for area requirements'
              ]
            ));
          }
        });
      });
    
    return {
      ruleId: 'R310.2.2-clear-area',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R310.2.3 - Maximum sill height
 */
const maximumSillHeight: ComplianceRule = {
  id: 'R310.2.3-sill-height',
  code: 'R310.2.3',
  category: 'egress',
  description: 'Emergency escape window sills must be no more than 44 inches above floor',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const maxSillHeight = 44; // inches
    
    plan.rooms
      .filter(requiresEgress)
      .forEach(room => {
        const windows = getRoomWindows(room, plan);
        
        windows.forEach(window => {
          if (window.sillHeightInches > maxSillHeight) {
            violations.push(createViolation(
              `${window.id}-sill-height-violation`,
              `Window sill height ${window.sillHeightInches}" exceeds ${maxSillHeight}" maximum`,
              'R310.2.3',
              room.id,
              [
                `Lower window sill to ${maxSillHeight}" maximum above floor`,
                'Consider different window placement',
                'Verify floor-to-sill measurement'
              ]
            ));
          }
        });
      });
    
    return {
      ruleId: 'R310.2.3-sill-height',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R311.2 - Exterior door requirements
 */
const exteriorDoorRequirements: ComplianceRule = {
  id: 'R311.2-exterior-door',
  code: 'R311.2',
  category: 'egress',
  description: 'At least one exterior door must be provided with minimum clear width of 32 inches',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minWidth = 32; // inches
    
    // TODO: This needs actual implementation to identify exterior doors
    const exteriorDoors = plan.doors.filter(door => door.type === 'exterior');
    
    if (exteriorDoors.length === 0) {
      violations.push({
        id: 'no-exterior-door',
        description: 'No exterior door found in plan',
        severity: 'error',
        codeSection: 'R311.2',
        remediation: [
          'Add at least one exterior door to the dwelling',
          'Ensure door provides access to exterior',
          'Verify door meets minimum width requirements'
        ]
      });
    } else {
      const adequateDoors = exteriorDoors.filter(door => {
        // TODO: Need to implement clearWidth property on doors
        return true; // Placeholder
      });
      
      if (adequateDoors.length === 0) {
        violations.push({
          id: 'exterior-door-width',
          description: `No exterior door meets minimum ${minWidth}" clear width requirement`,
          severity: 'error',
          codeSection: 'R311.2',
          remediation: [
            `Ensure at least one exterior door has ${minWidth}" minimum clear width`,
            'Consider door size upgrade',
            'Verify door hardware and operation'
          ]
        });
      }
    }
    
    return {
      ruleId: 'R311.2-exterior-door',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R311.3 - Floor elevations at exterior doors
 */
const floorElevationsAtDoors: ComplianceRule = {
  id: 'R311.3-floor-elevations',
  code: 'R311.3',
  category: 'egress',
  description: 'Landing required at exterior doors with maximum 1.5" height difference',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Placeholder implementation - requires detailed door/landing geometry
    
    return {
      ruleId: 'R311.3-floor-elevations',
      passed: true,
      violations,
      metadata: {
        note: 'Landing and elevation analysis requires detailed door geometry - manual review needed'
      }
    };
  }
};

/**
 * R311.4.1 - Landing requirements at doors
 */
const landingRequirements: ComplianceRule = {
  id: 'R311.4.1-landing-requirements',
  code: 'R311.4.1',
  category: 'egress',
  description: 'Landings must be at least 36" deep in direction of travel',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Placeholder implementation - requires landing geometry data
    
    return {
      ruleId: 'R311.4.1-landing-requirements',
      passed: true,
      violations,
      metadata: {
        note: 'Landing dimension analysis requires detailed geometry - manual review needed'
      }
    };
  }
};

/**
 * R311.7.1 - Stairway width requirements
 */
const stairwayWidth: ComplianceRule = {
  id: 'R311.7.1-stairway-width',
  code: 'R311.7.1',
  category: 'egress',
  description: 'Stairways must have minimum clear width of 36 inches',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minWidth = 36; // inches
    
    const stairRooms = plan.rooms.filter(room => room.type === 'stairs');
    
    stairRooms.forEach(stair => {
      const clearWidth = Math.min(stair.width * 12, stair.depth * 12); // Convert to inches
      
      if (clearWidth < minWidth) {
        violations.push(createViolation(
          `${stair.id}-width-violation`,
          `Stairway "${stair.label}" width ${clearWidth}" below ${minWidth}" minimum`,
          'R311.7.1',
          stair.id,
          [
            `Increase stairway width to ${minWidth}" minimum`,
            'Reconfigure stair layout for proper width',
            'Verify clear width measurement excludes handrails'
          ]
        ));
      }
    });
    
    return {
      ruleId: 'R311.7.1-stairway-width',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * Window well requirements for basement egress
 */
const windowWellRequirements: ComplianceRule = {
  id: 'window-well-requirements',
  code: 'R310.3',
  category: 'egress',
  description: 'Window wells required for below-grade emergency escape windows',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Check for basement bedrooms that would need window wells
    const basementBedrooms = plan.rooms.filter(room => 
      (room.type === 'bedroom' || room.type === 'primary_bed') && room.floor === 1
    );
    
    basementBedrooms.forEach(room => {
      const windows = getRoomWindows(room, plan);
      
      if (windows.length > 0) {
        violations.push({
          id: `${room.id}-window-well-needed`,
          description: `Basement bedroom "${room.label}" may require window well for egress compliance`,
          severity: 'warning',
          codeSection: 'R310.3',
          roomId: room.id,
          remediation: [
            'Verify window well design meets code requirements',
            'Ensure proper drainage for window well',
            'Consider ladder or steps if well depth > 44"',
            'Manual review required for specific well dimensions'
          ]
        });
      }
    });
    
    return {
      ruleId: 'window-well-requirements',
      passed: violations.length === 0,
      violations,
      metadata: {
        note: 'Window well analysis requires site-specific data - manual review recommended'
      }
    };
  }
};

/**
 * Export all egress rules
 */
export const egressRules: ComplianceRule[] = [
  emergencyEscapeRequired,
  minimumOpeningDimensions,
  minimumClearOpeningArea,
  maximumSillHeight,
  exteriorDoorRequirements,
  floorElevationsAtDoors,
  landingRequirements,
  stairwayWidth,
  windowWellRequirements
];

export default egressRules;
/**
 * Hallway Rules - IRC R311.6
 * Minimum width, height, and dead-end requirements for hallways
 */

import type { 
  ComplianceRule, 
  RuleResult, 
  Violation, 
  FloorPlan, 
  ComplianceContext, 
  Room
} from '../types';

/**
 * Helper function to determine if a room is a hallway or circulation space
 */
function isHallway(room: Room): boolean {
  return room.type === 'hallway' || room.type === 'foyer';
}

/**
 * Helper function to create a violation
 */
function createViolation(
  id: string,
  description: string,
  codeSection: string,
  roomId: string,
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
    remediation
  };
}

/**
 * R311.6.1 - Minimum hallway width
 */
const minimumHallwayWidth: ComplianceRule = {
  id: 'R311.6.1-hallway-width',
  code: 'R311.6.1',
  category: 'hallways',
  description: 'Hallways must have minimum clear width of 36 inches',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minWidth = 36; // inches
    
    plan.rooms
      .filter(isHallway)
      .forEach(room => {
        const hallwayWidthInches = Math.min(room.width, room.depth) * 12; // convert to inches
        
        if (hallwayWidthInches < minWidth) {
          violations.push(createViolation(
            `${room.id}-width-violation`,
            `Hallway "${room.label}" width below minimum requirement`,
            'R311.6.1',
            room.id,
            hallwayWidthInches,
            minWidth,
            'inches',
            [
              `Increase hallway width to ${minWidth}" minimum`,
              'Reconfigure layout to provide adequate corridor width',
              'Verify clear width excludes wall thickness'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R311.6.1-hallway-width',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R311.6.2 - Minimum hallway height
 */
const minimumHallwayHeight: ComplianceRule = {
  id: 'R311.6.2-hallway-height',
  code: 'R311.6.2',
  category: 'hallways',
  description: 'Hallways must have minimum clear height of 80 inches (6 feet 8 inches)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minHeightInches = 80; // 6'8"
    const minHeightFeet = 6.67; // for display
    const defaultCeilingHeight = 8.0; // assume 8' if not specified
    
    plan.rooms
      .filter(isHallway)
      .forEach(room => {
        const ceilingHeightFeet = defaultCeilingHeight;
        const ceilingHeightInches = ceilingHeightFeet * 12;
        
        if (ceilingHeightInches < minHeightInches) {
          violations.push(createViolation(
            `${room.id}-height-violation`,
            `Hallway "${room.label}" height below minimum requirement`,
            'R311.6.2',
            room.id,
            `${ceilingHeightFeet}'`,
            `${minHeightFeet}'`,
            'feet',
            [
              `Increase hallway height to ${minHeightFeet}' (80") minimum`,
              'Check for beams, ducts, or other obstructions',
              'Verify structural clearances'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R311.6.2-hallway-height',
      passed: violations.length === 0,
      violations,
      metadata: {
        note: 'Assuming 8\' ceiling height - actual heights should be specified in plan data'
      }
    };
  }
};

/**
 * Dead-end corridor limitations
 */
const deadEndCorridorLimits: ComplianceRule = {
  id: 'dead-end-corridor-limits',
  code: 'R311.6',
  category: 'hallways',
  description: 'Dead-end corridors should be limited to avoid entrapment',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isHallway)
      .forEach(room => {
        // Simplified dead-end analysis based on room dimensions
        const hallwayLength = Math.max(room.width, room.depth);
        const maxDeadEndLength = 20; // feet (common guideline)
        
        // Get doors connecting to this hallway
        const connectingDoors = plan.doors.filter(door => 
          door.connectsRooms.includes(room.id)
        );
        
        // If only one door and long hallway, likely a dead end
        if (connectingDoors.length <= 1 && hallwayLength > maxDeadEndLength) {
          violations.push({
            id: `${room.id}-dead-end`,
            description: `Hallway "${room.label}" appears to be a dead end exceeding ${maxDeadEndLength}' length`,
            severity: 'warning',
            codeSection: 'R311.6',
            roomId: room.id,
            currentValue: `${hallwayLength}'`,
            requiredValue: `≤${maxDeadEndLength}'`,
            unit: 'feet',
            remediation: [
              'Provide alternative exit route from dead-end corridor',
              'Consider connecting hallway to create circulation loop',
              'Limit dead-end length for safety',
              'Manual review required for circulation analysis'
            ]
          });
        }
      });
    
    return {
      ruleId: 'dead-end-corridor-limits',
      passed: violations.length === 0,
      violations,
      metadata: {
        note: 'Dead-end analysis requires detailed circulation analysis - manual review recommended'
      }
    };
  }
};

/**
 * Accessible route compliance considerations
 */
const accessibleRouteCompliance: ComplianceRule = {
  id: 'accessible-route-compliance',
  code: 'ADA Guidelines',
  category: 'hallways',
  description: 'Consider accessible route requirements for hallways',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isHallway)
      .forEach(room => {
        const hallwayWidth = Math.min(room.width, room.depth);
        const recommendedAccessibleWidth = 3.5; // feet for wheelchair access
        
        if (hallwayWidth < recommendedAccessibleWidth) {
          violations.push({
            id: `${room.id}-accessible-width`,
            description: `Hallway "${room.label}" width may not accommodate wheelchair access`,
            severity: 'info',
            codeSection: 'ADA Guidelines',
            roomId: room.id,
            currentValue: `${hallwayWidth}'`,
            requiredValue: `${recommendedAccessibleWidth}'`,
            unit: 'feet',
            remediation: [
              'Consider 42" (3.5\') minimum width for wheelchair accessibility',
              'Provide passing spaces in long corridors',
              'Ensure level landings at doors',
              'Consider accessibility requirements for visitability'
            ]
          });
        }
      });
    
    return {
      ruleId: 'accessible-route-compliance',
      passed: true, // These are informational recommendations
      violations,
      metadata: {
        note: 'Accessibility considerations are recommendations for inclusive design'
      }
    };
  }
};

/**
 * Export all hallway rules
 */
export const hallwayRules: ComplianceRule[] = [
  minimumHallwayWidth,
  minimumHallwayHeight,
  deadEndCorridorLimits,
  accessibleRouteCompliance
];

export default hallwayRules;
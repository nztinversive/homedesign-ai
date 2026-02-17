/**
 * Kitchen Rules - Clearance and workspace requirements
 * IRC does not specify kitchen requirements, but these are industry standards
 */

import type { 
  ComplianceRule, 
  RuleResult, 
  Violation, 
  FloorPlan, 
  ComplianceContext, 
  Room,
  WorkTriangle
} from '../types';

/**
 * Helper function to determine if a room is a kitchen
 */
function isKitchen(room: Room): boolean {
  return room.type === 'kitchen';
}

/**
 * Helper function to get work triangle data (placeholder)
 */
function getWorkTriangle(room: Room): WorkTriangle | null {
  // TODO: This needs actual implementation based on appliance placement
  // For now, return mock data for testing
  const centerX = room.x + room.width / 2;
  const centerY = room.y + room.depth / 2;
  
  return {
    sink: { x: centerX - 2, y: centerY },
    refrigerator: { x: centerX + 2, y: centerY },
    cooktop: { x: centerX, y: centerY + 2 },
    perimeter: 18, // feet
    meetsEfficiencyStandards: true,
    legs: {
      sinkToRefrigerator: 4,
      refrigeratorToCooktop: 4,
      cooktopToSink: 4
    }
  };
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
    severity: 'warning',
    codeSection,
    roomId,
    remediation
  };
}

/**
 * Counter workspace depth requirements
 */
const counterWorkspaceDepth: ComplianceRule = {
  id: 'kitchen-counter-depth',
  code: 'Industry Standard',
  category: 'kitchens',
  description: 'Kitchen counters should have minimum 15" clear workspace depth',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minDepth = 15; // inches
    
    plan.rooms
      .filter(isKitchen)
      .forEach(room => {
        // Simplified check - assume counter along one wall
        const minRoomDimension = Math.min(room.width, room.depth) * 12; // convert to inches
        
        if (minRoomDimension < minDepth + 36) { // counter + aisle
          violations.push(createViolation(
            `${room.id}-counter-depth`,
            `Kitchen "${room.label}" may lack adequate counter workspace depth`,
            'Industry Standard',
            room.id,
            [
              `Ensure ${minDepth}" minimum counter depth`,
              'Provide adequate workspace behind counter edge',
              'Consider kitchen layout and workflow'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'kitchen-counter-depth',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * Aisle width requirements
 */
const aisleWidth: ComplianceRule = {
  id: 'kitchen-aisle-width',
  code: 'Industry Standard',
  category: 'kitchens',
  description: 'Kitchen aisles should have minimum 36" width between parallel counters',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minAisleWidth = 36; // inches
    
    plan.rooms
      .filter(isKitchen)
      .forEach(room => {
        // Simplified galley kitchen check
        const narrowDimension = Math.min(room.width, room.depth) * 12; // convert to inches
        const availableAisle = narrowDimension - 48; // assume 24" counters on both sides
        
        if (availableAisle < minAisleWidth) {
          violations.push(createViolation(
            `${room.id}-aisle-width`,
            `Kitchen "${room.label}" aisle width may be below ${minAisleWidth}" recommended minimum`,
            'Industry Standard',
            room.id,
            [
              `Provide ${minAisleWidth}" minimum between parallel counters`,
              'Consider single-wall or L-shaped layout if space is limited',
              'Ensure adequate space for cabinet doors and drawers to open'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'kitchen-aisle-width',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * Work triangle efficiency
 */
const workTriangleEfficiency: ComplianceRule = {
  id: 'kitchen-work-triangle',
  code: 'Industry Standard',
  category: 'kitchens',
  description: 'Kitchen work triangle should be efficient (12-26 feet total)',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isKitchen)
      .forEach(room => {
        const triangle = getWorkTriangle(room);
        
        if (triangle) {
          if (triangle.perimeter < 12 || triangle.perimeter > 26) {
            violations.push(createViolation(
              `${room.id}-work-triangle`,
              `Kitchen "${room.label}" work triangle ${triangle.perimeter}' outside recommended 12-26' range`,
              'Industry Standard',
              room.id,
              [
                'Optimize placement of sink, refrigerator, and cooktop',
                'Target 12-26 feet total triangle perimeter',
                'Ensure no leg exceeds 9 feet',
                'Avoid obstructions in triangle path'
              ]
            ));
          }
        } else {
          violations.push({
            id: `${room.id}-triangle-analysis`,
            description: `Kitchen "${room.label}" work triangle analysis requires appliance placement data`,
            severity: 'info',
            codeSection: 'Industry Standard',
            roomId: room.id,
            remediation: [
              'Define sink, refrigerator, and cooktop locations',
              'Analyze work triangle efficiency',
              'Manual review required for appliance layout'
            ]
          });
        }
      });
    
    return {
      ruleId: 'kitchen-work-triangle',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * Appliance clearance requirements
 */
const applianceClearances: ComplianceRule = {
  id: 'kitchen-appliance-clearances',
  code: 'Industry Standard',
  category: 'kitchens',
  description: 'Kitchen appliances should have adequate clearances for operation',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isKitchen)
      .forEach(room => {
        // Basic size check for common appliances
        if (room.sqft < 70) {
          violations.push(createViolation(
            `${room.id}-appliance-space`,
            `Kitchen "${room.label}" at ${room.sqft} sq ft may lack adequate appliance clearances`,
            'Industry Standard',
            room.id,
            [
              'Ensure adequate clearance for refrigerator doors (36" recommended)',
              'Provide clear space in front of dishwasher (21" minimum)',
              'Allow clearance for oven doors and range access',
              'Consider appliance sizes in kitchen planning'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'kitchen-appliance-clearances',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * Export all kitchen rules
 */
export const kitchenRules: ComplianceRule[] = [
  counterWorkspaceDepth,
  aisleWidth,
  workTriangleEfficiency,
  applianceClearances
];

export default kitchenRules;
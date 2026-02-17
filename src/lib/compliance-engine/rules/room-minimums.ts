/**
 * Room Minimum Rules - IRC R304
 * Minimum floor areas, dimensions, and ceiling heights for habitable rooms
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
 * Helper function to determine if a room is habitable space
 */
function isHabitableRoom(room: Room): boolean {
  const habitableTypes = [
    'primary_bed', 'bedroom', 'kitchen', 'dining', 'living', 
    'family', 'great_room', 'office', 'bonus', 'theater', 'gym'
  ];
  return habitableTypes.includes(room.type);
}

/**
 * Helper function to determine if a room is a bedroom
 */
function isBedroom(room: Room): boolean {
  return room.type === 'primary_bed' || room.type === 'bedroom';
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
 * R304.1 - Minimum floor area for habitable rooms (120 sq ft)
 */
const minimumHabitableArea: ComplianceRule = {
  id: 'R304.1-habitable-area',
  code: 'R304.1',
  category: 'room-minimums',
  description: 'Habitable rooms must have a minimum floor area of 120 square feet',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minArea = 120;
    
    plan.rooms
      .filter(isHabitableRoom)
      .forEach(room => {
        if (room.sqft < minArea) {
          violations.push(createViolation(
            `${room.id}-area-violation`,
            `Room "${room.label}" has insufficient floor area`,
            'R304.1',
            room.id,
            room.sqft,
            minArea,
            'sq ft',
            [
              `Increase room dimensions to achieve ${minArea} sq ft minimum`,
              'Consider combining with adjacent space',
              'Reconfigure floor plan layout'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R304.1-habitable-area',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R304.1 - Minimum floor area for bedrooms (70 sq ft)
 */
const minimumBedroomArea: ComplianceRule = {
  id: 'R304.1-bedroom-area',
  code: 'R304.1',
  category: 'room-minimums',
  description: 'Bedrooms must have a minimum floor area of 70 square feet',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minArea = 70;
    
    plan.rooms
      .filter(isBedroom)
      .forEach(room => {
        if (room.sqft < minArea) {
          violations.push(createViolation(
            `${room.id}-bedroom-area-violation`,
            `Bedroom "${room.label}" has insufficient floor area`,
            'R304.1',
            room.id,
            room.sqft,
            minArea,
            'sq ft',
            [
              `Increase bedroom dimensions to achieve ${minArea} sq ft minimum`,
              'Verify room classification - may need to be reclassified',
              'Consider removing from bedroom count if below minimum'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R304.1-bedroom-area',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R304.2 - Minimum horizontal dimension (7 feet)
 */
const minimumHorizontalDimension: ComplianceRule = {
  id: 'R304.2-horizontal-dimension',
  code: 'R304.2',
  category: 'room-minimums',
  description: 'Habitable rooms must have minimum horizontal dimension of 7 feet in any direction',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minDimension = 7;
    
    plan.rooms
      .filter(isHabitableRoom)
      .forEach(room => {
        const minRoomDimension = Math.min(room.width, room.depth);
        
        if (minRoomDimension < minDimension) {
          violations.push(createViolation(
            `${room.id}-dimension-violation`,
            `Room "${room.label}" has insufficient horizontal dimension`,
            'R304.2',
            room.id,
            `${minRoomDimension}'`,
            `${minDimension}'`,
            'feet',
            [
              `Increase room width or depth to achieve ${minDimension}' minimum`,
              'Reconfigure room shape for better proportions',
              'Consider L-shaped or other configuration to meet requirements'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R304.2-horizontal-dimension',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R304.3 - Minimum ceiling height (7'6" general)
 */
const minimumCeilingHeight: ComplianceRule = {
  id: 'R304.3-ceiling-height',
  code: 'R304.3',
  category: 'room-minimums',
  description: 'Habitable rooms must have minimum ceiling height of 7 feet 6 inches',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minHeight = 7.5; // 7'6" in decimal feet
    const defaultCeilingHeight = 8.0; // Assume 8' if not specified
    
    plan.rooms
      .filter(isHabitableRoom)
      .forEach(room => {
        // TODO: Add ceiling height to room interface - for now assume 8' default
        const ceilingHeight = defaultCeilingHeight;
        
        if (ceilingHeight < minHeight) {
          violations.push(createViolation(
            `${room.id}-ceiling-height-violation`,
            `Room "${room.label}" has insufficient ceiling height`,
            'R304.3',
            room.id,
            `${ceilingHeight}'`,
            `${minHeight}'`,
            'feet',
            [
              `Increase ceiling height to ${minHeight}' minimum`,
              'Consider structural modifications if necessary',
              'Verify basement/lower level compliance'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R304.3-ceiling-height',
      passed: violations.length === 0,
      violations,
      metadata: {
        note: 'Assuming 8\' ceiling height - actual heights should be specified in plan data'
      }
    };
  }
};

/**
 * R304.3 Exception 1 - Reduced ceiling height for specific rooms (7')
 */
const reducedCeilingHeightException: ComplianceRule = {
  id: 'R304.3-exception-1',
  code: 'R304.3 Exception 1',
  category: 'room-minimums',
  description: 'Kitchens, halls, bathrooms, and certain rooms may have 7 foot ceiling height',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minHeight = 7.0;
    const defaultCeilingHeight = 8.0;
    
    // Rooms that can have reduced ceiling height
    const reducedHeightRooms = ['kitchen', 'hallway', 'bathroom', 'primary_bath', 'half_bath', 'foyer', 'mudroom'];
    
    plan.rooms
      .filter(room => reducedHeightRooms.includes(room.type))
      .forEach(room => {
        const ceilingHeight = defaultCeilingHeight;
        
        if (ceilingHeight < minHeight) {
          violations.push(createViolation(
            `${room.id}-reduced-ceiling-height-violation`,
            `${room.type} "${room.label}" has insufficient ceiling height even under exception`,
            'R304.3 Exception 1',
            room.id,
            `${ceilingHeight}'`,
            `${minHeight}'`,
            'feet',
            [
              `Increase ceiling height to ${minHeight}' minimum (exception applies)`,
              'Verify room classification',
              'Consider structural modifications'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R304.3-exception-1',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R304.3 Exception 2 - Sloped ceiling requirements
 */
const slopedCeilingRequirements: ComplianceRule = {
  id: 'R304.3-sloped-ceiling',
  code: 'R304.3 Exception 2',
  category: 'room-minimums',
  description: 'Rooms with sloped ceilings must meet specific height and area requirements',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // This is a placeholder implementation - actual sloped ceiling analysis
    // would require detailed ceiling geometry data not available in current room interface
    
    return {
      ruleId: 'R304.3-sloped-ceiling',
      passed: true,
      violations,
      metadata: {
        note: 'Sloped ceiling analysis requires detailed ceiling geometry data - manual review needed'
      }
    };
  }
};

/**
 * R304.4 - Occupied space requirements for sloped ceilings
 */
const slopedCeilingOccupiedSpace: ComplianceRule = {
  id: 'R304.4-sloped-occupied-space',
  code: 'R304.4',
  category: 'room-minimums',
  description: 'At least 50% of required floor area must have ceiling height of 7 feet or more',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Placeholder implementation - requires sloped ceiling geometry
    // For now, we'll assume all rooms have flat ceilings
    
    return {
      ruleId: 'R304.4-sloped-occupied-space',
      passed: true,
      violations,
      metadata: {
        note: 'Sloped ceiling occupied space analysis requires ceiling geometry - manual review needed'
      }
    };
  }
};

/**
 * Bedroom count validation - ensure bedrooms meet IRC requirements
 */
const bedroomValidation: ComplianceRule = {
  id: 'bedroom-validation',
  code: 'R304.1',
  category: 'room-minimums',
  description: 'Validate bedroom designations meet minimum requirements',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const bedrooms = plan.rooms.filter(isBedroom);
    
    bedrooms.forEach(room => {
      const issues: string[] = [];
      
      // Check minimum area
      if (room.sqft < 70) {
        issues.push('Area below 70 sq ft minimum');
      }
      
      // Check minimum dimension
      if (Math.min(room.width, room.depth) < 7) {
        issues.push('Dimension below 7 feet minimum');
      }
      
      // Note: Egress requirements checked in egress rules
      
      if (issues.length > 0) {
        violations.push({
          id: `${room.id}-bedroom-validation`,
          description: `Bedroom "${room.label}" has validation issues: ${issues.join(', ')}`,
          severity: 'warning',
          codeSection: 'R304.1',
          roomId: room.id,
          remediation: [
            'Verify bedroom designation is appropriate',
            'Consider reclassifying as office or bonus room if requirements cannot be met',
            'Ensure proper egress and other bedroom requirements are addressed'
          ]
        });
      }
    });
    
    return {
      ruleId: 'bedroom-validation',
      passed: violations.length === 0,
      violations,
      metadata: {
        bedroomCount: bedrooms.length,
        note: 'Bedroom validation includes area and dimension checks - egress checked separately'
      }
    };
  }
};

/**
 * Export all room minimum rules
 */
export const roomMinimumRules: ComplianceRule[] = [
  minimumHabitableArea,
  minimumBedroomArea,
  minimumHorizontalDimension,
  minimumCeilingHeight,
  reducedCeilingHeightException,
  slopedCeilingRequirements,
  slopedCeilingOccupiedSpace,
  bedroomValidation
];

export default roomMinimumRules;
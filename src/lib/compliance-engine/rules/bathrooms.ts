/**
 * Bathroom Rules - IRC R307
 * Bathroom space requirements, fixture clearances, and door swing restrictions
 */

import type { 
  ComplianceRule, 
  RuleResult, 
  Violation, 
  FloorPlan, 
  ComplianceContext, 
  Room,
  FixtureClearances
} from '../types';

/**
 * Helper function to determine if a room is a bathroom
 */
function isBathroom(room: Room): boolean {
  return room.type === 'bathroom' || room.type === 'primary_bath' || room.type === 'half_bath';
}

/**
 * Helper function to get fixture clearances (placeholder - needs implementation)
 */
function getFixtureClearances(room: Room): FixtureClearances[] {
  // TODO: This needs actual implementation based on fixture placement data
  // For now, return mock data based on room type
  const fixtures: FixtureClearances[] = [];
  
  if (room.type === 'half_bath') {
    fixtures.push({
      type: 'toilet',
      centerX: room.x + room.width / 2,
      centerY: room.y + room.depth * 0.3,
      width: 2,
      depth: 2.5,
      frontClearance: 21,
      sideClearance: 15
    });
    fixtures.push({
      type: 'lavatory',
      centerX: room.x + room.width / 2,
      centerY: room.y + room.depth * 0.7,
      width: 2,
      depth: 1.5,
      frontClearance: 21,
      sideClearance: 15
    });
  } else {
    fixtures.push({
      type: 'toilet',
      centerX: room.x + room.width * 0.3,
      centerY: room.y + room.depth * 0.3,
      width: 2,
      depth: 2.5,
      frontClearance: 21,
      sideClearance: 15
    });
    fixtures.push({
      type: 'lavatory',
      centerX: room.x + room.width * 0.7,
      centerY: room.y + room.depth * 0.3,
      width: 2,
      depth: 1.5,
      frontClearance: 21,
      sideClearance: 15
    });
    if (room.type !== 'half_bath') {
      fixtures.push({
        type: 'shower',
        centerX: room.x + room.width * 0.7,
        centerY: room.y + room.depth * 0.7,
        width: 3,
        depth: 3,
        frontClearance: 24,
        sideClearance: 0
      });
    }
  }
  
  return fixtures;
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
 * R307.1 - Space requirements
 */
const bathroomSpaceRequirements: ComplianceRule = {
  id: 'R307.1-space-requirements',
  code: 'R307.1',
  category: 'bathrooms',
  description: 'Bathrooms must have adequate space for required fixtures and clearances',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isBathroom)
      .forEach(room => {
        // Minimum recommended sizes based on fixture requirements
        const minAreaHalfBath = 18; // sq ft for half bath
        const minAreaFullBath = 40; // sq ft for full bath
        const minWidth = 5; // feet
        
        const isHalfBath = room.type === 'half_bath';
        const minArea = isHalfBath ? minAreaHalfBath : minAreaFullBath;
        
        if (room.sqft < minArea) {
          violations.push(createViolation(
            `${room.id}-area-violation`,
            `Bathroom "${room.label}" area ${room.sqft} sq ft below recommended ${minArea} sq ft minimum`,
            'R307.1',
            room.id,
            [
              `Increase bathroom size to ${minArea} sq ft minimum`,
              'Verify all required fixtures can be accommodated',
              'Consider fixture clearance requirements in sizing'
            ]
          ));
        }
        
        if (Math.min(room.width, room.depth) < minWidth) {
          violations.push(createViolation(
            `${room.id}-width-violation`,
            `Bathroom "${room.label}" has dimension below ${minWidth}' minimum`,
            'R307.1',
            room.id,
            [
              `Increase bathroom width/depth to ${minWidth}' minimum`,
              'Reconfigure bathroom layout for adequate clearances',
              'Consider fixture arrangement and door swing'
            ]
          ));
        }
      });
    
    return {
      ruleId: 'R307.1-space-requirements',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R307.2 - Toilet clearances
 */
const toiletClearances: ComplianceRule = {
  id: 'R307.2-toilet-clearances',
  code: 'R307.2',
  category: 'bathrooms',
  description: 'Toilets must have minimum 15" clearance from centerline to wall and 21" front clearance',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isBathroom)
      .forEach(room => {
        const fixtures = getFixtureClearances(room);
        const toilets = fixtures.filter(f => f.type === 'toilet');
        
        toilets.forEach(toilet => {
          // Check side clearance (15" from centerline to wall)
          const minSideClearance = 15; // inches
          const actualSideClearance = toilet.sideClearance || 0;
          
          if (actualSideClearance < minSideClearance) {
            violations.push(createViolation(
              `${room.id}-toilet-side-clearance`,
              `Toilet side clearance ${actualSideClearance}" below ${minSideClearance}" minimum`,
              'R307.2',
              room.id,
              [
                `Provide ${minSideClearance}" minimum from toilet centerline to wall`,
                'Reposition toilet or increase bathroom width',
                'Verify measurement from centerline of toilet'
              ]
            ));
          }
          
          // Check front clearance (21" minimum)
          const minFrontClearance = 21; // inches
          const actualFrontClearance = toilet.frontClearance || 0;
          
          if (actualFrontClearance < minFrontClearance) {
            violations.push(createViolation(
              `${room.id}-toilet-front-clearance`,
              `Toilet front clearance ${actualFrontClearance}" below ${minFrontClearance}" minimum`,
              'R307.2',
              room.id,
              [
                `Provide ${minFrontClearance}" minimum in front of toilet`,
                'Reposition toilet or increase bathroom depth',
                'Consider door swing interference'
              ]
            ));
          }
        });
      });
    
    return {
      ruleId: 'R307.2-toilet-clearances',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R307.3 - Lavatory clearances
 */
const lavatoryClearances: ComplianceRule = {
  id: 'R307.3-lavatory-clearances',
  code: 'R307.3',
  category: 'bathrooms',
  description: 'Lavatories must have minimum clearances for access and use',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isBathroom)
      .forEach(room => {
        const fixtures = getFixtureClearances(room);
        const lavatories = fixtures.filter(f => f.type === 'lavatory');
        
        lavatories.forEach(lavatory => {
          // Check side clearance (minimum 15" from centerline for pedestal sinks)
          const minSideClearance = 15; // inches
          const actualSideClearance = lavatory.sideClearance || 0;
          
          if (actualSideClearance < minSideClearance) {
            violations.push(createViolation(
              `${room.id}-lavatory-side-clearance`,
              `Lavatory side clearance ${actualSideClearance}" may be insufficient`,
              'R307.3',
              room.id,
              [
                'Verify lavatory type and clearance requirements',
                'Consider vanity vs pedestal sink requirements',
                'Ensure adequate access for use and cleaning'
              ]
            ));
          }
          
          // Check front clearance (21" minimum typical)
          const minFrontClearance = 21; // inches
          const actualFrontClearance = lavatory.frontClearance || 0;
          
          if (actualFrontClearance < minFrontClearance) {
            violations.push(createViolation(
              `${room.id}-lavatory-front-clearance`,
              `Lavatory front clearance ${actualFrontClearance}" below ${minFrontClearance}" recommended`,
              'R307.3',
              room.id,
              [
                `Provide ${minFrontClearance}" minimum in front of lavatory`,
                'Reposition lavatory or increase bathroom size',
                'Consider door swing clearance'
              ]
            ));
          }
        });
      });
    
    return {
      ruleId: 'R307.3-lavatory-clearances',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R307.4 - Shower and bathtub spaces
 */
const showerBathtubSpaces: ComplianceRule = {
  id: 'R307.4-shower-bathtub',
  code: 'R307.4',
  category: 'bathrooms',
  description: 'Showers must have minimum 30" x 30" interior dimensions',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minShowerDimension = 30; // inches
    
    plan.rooms
      .filter(isBathroom)
      .forEach(room => {
        const fixtures = getFixtureClearances(room);
        const showers = fixtures.filter(f => f.type === 'shower');
        const bathtubs = fixtures.filter(f => f.type === 'bathtub');
        
        // Check shower dimensions
        showers.forEach(shower => {
          const showerWidth = shower.width * 12; // convert to inches
          const showerDepth = shower.depth * 12; // convert to inches
          
          if (showerWidth < minShowerDimension || showerDepth < minShowerDimension) {
            violations.push(createViolation(
              `${room.id}-shower-size`,
              `Shower dimensions ${showerWidth}" x ${showerDepth}" below ${minShowerDimension}" x ${minShowerDimension}" minimum`,
              'R307.4',
              room.id,
              [
                `Increase shower to ${minShowerDimension}" x ${minShowerDimension}" minimum`,
                'Consider standard shower base sizes',
                'Verify clearances to walls and door'
              ]
            ));
          }
        });
        
        // Check bathtub access clearances
        bathtubs.forEach(bathtub => {
          const minBathtubClearance = 24; // inches in front
          const actualClearance = bathtub.frontClearance || 0;
          
          if (actualClearance < minBathtubClearance) {
            violations.push(createViolation(
              `${room.id}-bathtub-clearance`,
              `Bathtub front clearance ${actualClearance}" below ${minBathtubClearance}" minimum`,
              'R307.4',
              room.id,
              [
                `Provide ${minBathtubClearance}" minimum clearance in front of bathtub`,
                'Reposition bathtub or increase bathroom size',
                'Consider bathtub access and safety'
              ]
            ));
          }
        });
      });
    
    return {
      ruleId: 'R307.4-shower-bathtub',
      passed: violations.length === 0,
      violations
    };
  }
};

/**
 * R307.5 - Door swing restrictions
 */
const doorSwingRestrictions: ComplianceRule = {
  id: 'R307.5-door-swing',
  code: 'R307.5',
  category: 'bathrooms',
  description: 'Bathroom doors must not swing into required fixture clearances',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isBathroom)
      .forEach(room => {
        // Get doors for this bathroom
        const roomDoors = plan.doors.filter(door => 
          door.connectsRooms.includes(room.id)
        );
        
        roomDoors.forEach(door => {
          // TODO: This requires detailed door swing analysis
          // For now, provide a warning for manual review
          violations.push({
            id: `${room.id}-door-swing-check`,
            description: `Verify door swing in "${room.label}" does not interfere with fixture clearances`,
            severity: 'warning',
            codeSection: 'R307.5',
            roomId: room.id,
            remediation: [
              'Verify door opens without hitting fixtures',
              'Check door swing clearance to toilet, lavatory, and shower',
              'Consider pocket door or outward-swinging door if needed',
              'Manual review required for specific door swing analysis'
            ]
          });
        });
      });
    
    return {
      ruleId: 'R307.5-door-swing',
      passed: violations.length === 0,
      violations,
      metadata: {
        note: 'Door swing analysis requires detailed geometry - manual review needed'
      }
    };
  }
};

/**
 * Accessibility considerations (not required by IRC but good practice)
 */
const accessibilityConsiderations: ComplianceRule = {
  id: 'bathroom-accessibility',
  code: 'ADA Guidelines',
  category: 'bathrooms',
  description: 'Consider accessibility guidelines for bathroom design',
  enabled: true,
  applicableJurisdictions: ['irc-base', 'colorado'],
  version: '1.0',
  
  check: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    plan.rooms
      .filter(isBathroom)
      .forEach(room => {
        // Accessibility recommendations (not violations, just info)
        const recommendations: string[] = [];
        
        if (room.sqft < 56) { // 7' x 8' minimum for wheelchair access
          recommendations.push('Consider 56+ sq ft for wheelchair accessibility');
        }
        
        if (Math.min(room.width, room.depth) < 7) {
          recommendations.push('Consider 7\' minimum width for wheelchair turning radius');
        }
        
        if (recommendations.length > 0) {
          violations.push({
            id: `${room.id}-accessibility-info`,
            description: `Bathroom "${room.label}" accessibility considerations`,
            severity: 'info',
            codeSection: 'ADA Guidelines',
            roomId: room.id,
            remediation: recommendations
          });
        }
      });
    
    return {
      ruleId: 'bathroom-accessibility',
      passed: true, // These are informational, not violations
      violations,
      metadata: {
        note: 'Accessibility considerations are recommendations for inclusive design'
      }
    };
  }
};

/**
 * Export all bathroom rules
 */
export const bathroomRules: ComplianceRule[] = [
  bathroomSpaceRequirements,
  toiletClearances,
  lavatoryClearances,
  showerBathtubSpaces,
  doorSwingRestrictions,
  accessibilityConsiderations
];

export default bathroomRules;
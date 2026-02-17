/**
 * Colorado IRC Amendments
 * Colorado-specific overrides and additions to base IRC requirements
 */

import type {
  ComplianceRule,
  RuleResult,
  FloorPlan,
  ComplianceContext,
  Violation
} from './types';

/**
 * Colorado amendment interface
 */
export interface ColoradoAmendment {
  ruleId: string;
  description: string;
  override?: (plan: FloorPlan, context: ComplianceContext) => RuleResult;
  version?: string;
}

/**
 * Colorado-specific ceiling height requirements (enhanced for energy efficiency)
 */
const coloradoCeilingHeight: ColoradoAmendment = {
  ruleId: 'R304.3-ceiling-height',
  description: 'Colorado amendment for ceiling height with energy efficiency considerations',
  version: '1.1-CO',
  
  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const minHeight = 7.5; // 7'6" standard
    const energyEfficientHeight = 8.0; // 8' recommended for proper insulation
    
    plan.rooms
      .filter(room => {
        const habitableTypes = [
          'primary_bed', 'bedroom', 'kitchen', 'dining', 'living', 
          'family', 'great_room', 'office', 'bonus', 'theater', 'gym'
        ];
        return habitableTypes.includes(room.type);
      })
      .forEach(room => {
        const ceilingHeight = 8.0; // Assume 8' default
        
        if (ceilingHeight < minHeight) {
          violations.push({
            id: `${room.id}-co-ceiling-height-violation`,
            description: `Room "${room.label}" ceiling height violates Colorado requirements`,
            severity: 'error',
            codeSection: 'R304.3 (Colorado)',
            roomId: room.id,
            currentValue: `${ceilingHeight}'`,
            requiredValue: `${minHeight}'`,
            unit: 'feet',
            remediation: [
              `Increase ceiling height to ${minHeight}' minimum (Colorado IRC)`,
              'Consider energy efficiency benefits of higher ceilings',
              'Verify insulation and air sealing requirements'
            ]
          });
        } else if (ceilingHeight < energyEfficientHeight) {
          violations.push({
            id: `${room.id}-co-ceiling-efficiency`,
            description: `Room "${room.label}" ceiling height below Colorado energy efficiency recommendation`,
            severity: 'warning',
            codeSection: 'Colorado Energy Code',
            roomId: room.id,
            currentValue: `${ceilingHeight}'`,
            requiredValue: `${energyEfficientHeight}'`,
            unit: 'feet',
            remediation: [
              `Consider ${energyEfficientHeight}' ceiling height for better energy performance`,
              'Higher ceilings improve insulation effectiveness',
              'Coordinate with HVAC design for proper air circulation'
            ]
          });
        }
      });
    
    return {
      ruleId: 'R304.3-ceiling-height',
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      metadata: {
        coloradoAmendment: true,
        energyConsiderations: true
      }
    };
  }
};

/**
 * Colorado wildfire interface zone requirements
 */
const wildfireInterfaceRequirements: ColoradoAmendment = {
  ruleId: 'colorado-wildfire-interface',
  description: 'Colorado wildfire interface zone construction requirements',
  version: '1.0-CO',
  
  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Only apply if in wildfire interface zone
    if (context.wildfireInterfaceZone) {
      // Enhanced egress requirements for bedrooms in WUI zones
      const bedrooms = plan.rooms.filter(room => 
        room.type === 'primary_bed' || room.type === 'bedroom'
      );
      
      bedrooms.forEach(room => {
        violations.push({
          id: `${room.id}-wui-egress`,
          description: `Bedroom "${room.label}" in Wildfire Interface Zone requires enhanced egress`,
          severity: 'warning',
          codeSection: 'Colorado WUI Code',
          roomId: room.id,
          remediation: [
            'Verify enhanced egress window requirements for WUI zone',
            'Consider fire-resistant landscaping around egress windows',
            'Ensure emergency access routes are maintained',
            'Manual review required for WUI compliance'
          ]
        });
      });
      
      // Check for defensible space considerations
      violations.push({
        id: 'wui-defensible-space',
        description: 'Wildfire Interface Zone requires defensible space planning',
        severity: 'info',
        codeSection: 'Colorado WUI Code',
        remediation: [
          'Plan for 30-foot defensible space Zone 1',
          'Consider 100-foot defensible space Zone 2',
          'Coordinate with local fire department requirements',
          'Implement fire-resistant construction materials'
        ]
      });
    }
    
    return {
      ruleId: 'colorado-wildfire-interface',
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      metadata: {
        coloradoAmendment: true,
        wildfireInterfaceZone: context.wildfireInterfaceZone
      }
    };
  }
};

/**
 * Colorado high-altitude construction considerations
 */
const highAltitudeRequirements: ColoradoAmendment = {
  ruleId: 'colorado-high-altitude',
  description: 'Colorado high-altitude construction requirements',
  version: '1.0-CO',
  
  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Snow load considerations (informational)
    if (context.snowLoad && context.snowLoad > 30) {
      violations.push({
        id: 'high-altitude-snow-load',
        description: `High snow load (${context.snowLoad} psf) requires enhanced structural design`,
        severity: 'info',
        codeSection: 'Colorado High Altitude Requirements',
        remediation: [
          'Coordinate with structural engineer for snow load design',
          'Consider roof pitch and drainage for heavy snow',
          'Verify foundation design for frost depth requirements',
          'Plan for proper ventilation at high altitude'
        ]
      });
    }
    
    return {
      ruleId: 'colorado-high-altitude',
      passed: true,
      violations,
      metadata: {
        coloradoAmendment: true,
        snowLoad: context.snowLoad
      }
    };
  }
};

/**
 * Colorado energy efficiency enhancements
 */
const energyEfficiencyEnhancements: ColoradoAmendment = {
  ruleId: 'colorado-energy-efficiency',
  description: 'Colorado enhanced energy efficiency requirements',
  version: '1.0-CO',
  
  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Window-to-wall ratio considerations
    plan.rooms.forEach(room => {
      if (room.needsExteriorWall) {
        violations.push({
          id: `${room.id}-energy-windows`,
          description: `Room "${room.label}" requires energy-efficient window planning`,
          severity: 'info',
          codeSection: 'Colorado Energy Code',
          roomId: room.id,
          remediation: [
            'Consider window-to-wall ratio for energy efficiency',
            'Plan for proper window orientation (south-facing preferred)',
            'Specify high-performance windows (low-E, proper SHGC)',
            'Coordinate with HVAC design for optimal performance'
          ]
        });
      }
    });
    
    return {
      ruleId: 'colorado-energy-efficiency',
      passed: true,
      violations,
      metadata: {
        coloradoAmendment: true,
        energyEfficiency: true
      }
    };
  }
};

/**
 * Colorado seismic design considerations (limited application)
 */
const seismicDesignConsiderations: ColoradoAmendment = {
  ruleId: 'colorado-seismic-design',
  description: 'Colorado seismic design requirements (limited areas)',
  version: '1.0-CO',
  
  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    
    // Only apply if seismic design category is specified and > A
    if (context.seismicDesignCategory && context.seismicDesignCategory > 'A') {
      violations.push({
        id: 'seismic-design-required',
        description: `Seismic Design Category ${context.seismicDesignCategory} requires enhanced structural design`,
        severity: 'info',
        codeSection: 'Colorado Seismic Requirements',
        remediation: [
          'Coordinate with structural engineer for seismic design',
          'Consider connection details and load paths',
          'Verify foundation anchorage requirements',
          'Plan for proper lateral force resistance'
        ]
      });
    }
    
    return {
      ruleId: 'colorado-seismic-design',
      passed: true,
      violations,
      metadata: {
        coloradoAmendment: true,
        seismicDesignCategory: context.seismicDesignCategory
      }
    };
  }
};

/**
 * Export all Colorado amendments
 */
export const coloradoAmendments: ColoradoAmendment[] = [
  coloradoCeilingHeight,
  wildfireInterfaceRequirements,
  highAltitudeRequirements,
  energyEfficiencyEnhancements,
  seismicDesignConsiderations
];

/**
 * Colorado-specific compliance context factory
 */
export function createColoradoContext(
  overrides: Partial<ComplianceContext> = {}
): ComplianceContext {
  return {
    jurisdiction: 'colorado',
    buildingType: 'residential',
    constructionType: 'wood',
    wildfireInterfaceZone: false, // Default - should be set based on location
    snowLoad: 30, // Default 30 psf - varies by elevation
    seismicDesignCategory: 'A', // Most of Colorado is low seismic
    windSpeed: 90, // Default 90 mph - varies by region
    ...overrides
  };
}

/**
 * Check if location is in Wildfire Interface Zone (placeholder)
 */
export function isWildfireInterfaceZone(latitude: number, longitude: number): boolean {
  // TODO: Implement actual WUI zone lookup
  // For now, assume areas outside urban centers may be WUI
  return false; // Placeholder
}

/**
 * Get snow load for Colorado location (placeholder)
 */
export function getColoradoSnowLoad(elevation: number): number {
  // Simplified calculation - actual requirements vary by county
  if (elevation > 8000) return 50; // psf
  if (elevation > 6000) return 40;
  if (elevation > 4000) return 30;
  return 25;
}

export default coloradoAmendments;
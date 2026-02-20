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
 * Colorado SB 25-002: Regional Building Codes for Factory-Built Structures
 * 
 * Effective 2025. Establishes statewide regional building codes for factory-built
 * residential/nonresidential structures and tiny homes. Key provisions:
 * - State Housing Board adopts regional codes accounting for climatic zones (4,5,6,7)
 * - Local governments CANNOT impose more restrictive standards on factory-built
 *   structures than on site-built homes in the same zone
 * - Local governments CANNOT exclude factory-built structures from their jurisdiction
 * - Division of Housing oversees inspections, with third-party review allowed
 * - Plumbing/electrical connections to external utilities require licensed contractors
 * - Advisory committee expanded to 19 members for regional code development
 * - Rules to be adopted by July 1, 2026; supersede conflicting local ordinances
 */
const sb25002FactoryBuiltCompliance: ColoradoAmendment = {
  ruleId: 'colorado-sb25-002-factory-built',
  description: 'Colorado SB 25-002: Statewide factory-built structure standards',
  version: '1.0-SB25-002',

  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const params = context.jurisdictionParams || {};
    const isFactoryBuilt = params.factoryBuilt === true;
    const climateZone: number | undefined = params.climateZone;

    if (!isFactoryBuilt) {
      return {
        ruleId: 'colorado-sb25-002-factory-built',
        passed: true,
        violations: [],
        metadata: { coloradoAmendment: true, factoryBuilt: false }
      };
    }

    // Climate zone validation — SB 25-002 requires regional codes for zones 4-7
    if (climateZone && (climateZone >= 4 && climateZone <= 7)) {
      violations.push({
        id: 'sb25-002-climate-zone-regional-code',
        description: `Factory-built structure in Climate Zone ${climateZone}: must comply with SB 25-002 regional building code standards`,
        severity: 'info',
        codeSection: 'SB 25-002 §24-32-3311',
        remediation: [
          `Verify compliance with State Housing Board regional codes for Climate Zone ${climateZone}`,
          'Regional codes account for local climatic, geographic, and fire suppression requirements',
          'Contact Division of Housing for current zone-specific standards',
          'Factory-built certification must be obtained through the Division of Housing'
        ]
      });
    }

    // WUI zone + factory-built: enhanced fire protection per SB 25-002
    if (context.wildfireInterfaceZone) {
      violations.push({
        id: 'sb25-002-wui-factory-built',
        description: 'Factory-built structure in Wildfire Interface Zone requires SB 25-002 fire suppression compliance',
        severity: 'warning',
        codeSection: 'SB 25-002 §24-32-3311 (fire suppression)',
        remediation: [
          'Regional codes include fire suppression activity requirements for WUI zones',
          'Pre-certified structures must still meet local wildfire risk provisions',
          'Verify fire-resistant materials and defensible space per regional standards',
          'Structures certified before regional code adoption are subject to existing WUI rules'
        ]
      });
    }

    // Local government parity rule — cannot impose stricter standards than site-built
    violations.push({
      id: 'sb25-002-local-parity',
      description: 'SB 25-002 prohibits local governments from imposing stricter standards on factory-built structures than site-built homes',
      severity: 'info',
      codeSection: 'SB 25-002 §31-23-303',
      remediation: [
        'Local land use regulations apply only if also applicable to site-built housing',
        'Municipality cannot exclude factory-built structures from any zone',
        'Installation site requirements must not exceed those for conventional construction',
        'Above-grade site-built components may still be locally regulated'
      ]
    });

    // Installation & utility connection requirements
    violations.push({
      id: 'sb25-002-installation-requirements',
      description: 'Factory-built structure installation requires registered installer; utility connections require licensed contractors',
      severity: 'info',
      codeSection: 'SB 25-002 §24-32-3315',
      remediation: [
        'Installation must be completed by a Division of Housing registered installer',
        'Plumbing connections to external utilities require a licensed plumber under a registered contractor',
        'Electrical connections to external utilities require a licensed electrician under a registered contractor',
        'Inspections must be performed by Division-authorized or licensed inspectors',
        'Third-party plan review may be used if approved by the Division'
      ]
    });

    return {
      ruleId: 'colorado-sb25-002-factory-built',
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      metadata: {
        coloradoAmendment: true,
        factoryBuilt: true,
        climateZone,
        sb25002: true
      }
    };
  }
};

/**
 * Colorado Proposition 123: Affordable Housing Funding & Compliance
 * 
 * Prop 123 (passed 2022) directs state TABOR refunds to affordable housing.
 * Compliance implications for design:
 * - Participating jurisdictions must increase affordable housing units by 3% (small) 
 *   or 9% (large) over 3-year cycles
 * - Expedited ("Fast Track") review process required for affordable housing projects
 * - Factory-built/prefab homes count toward affordable housing unit targets, making
 *   them a strategic option for Prop 123 compliance
 * - No direct building code requirements, but designs targeting Prop 123 funding
 *   should meet affordability and expedited review criteria
 */
const prop123AffordableHousing: ColoradoAmendment = {
  ruleId: 'colorado-prop-123-affordable',
  description: 'Colorado Proposition 123: Affordable housing design considerations',
  version: '1.0-Prop123',

  override: (plan: FloorPlan, context: ComplianceContext): RuleResult => {
    const violations: Violation[] = [];
    const params = context.jurisdictionParams || {};
    const isProp123Target = params.prop123Target === true;
    const isFactoryBuilt = params.factoryBuilt === true;

    if (!isProp123Target) {
      return {
        ruleId: 'colorado-prop-123-affordable',
        passed: true,
        violations: [],
        metadata: { coloradoAmendment: true, prop123: false }
      };
    }

    // Expedited review eligibility
    violations.push({
      id: 'prop-123-expedited-review',
      description: 'Prop 123 affordable housing project eligible for expedited development review',
      severity: 'info',
      codeSection: 'C.R.S. 29-32-105 §2 (Prop 123)',
      remediation: [
        'Submit project under jurisdiction\'s Fast Track review process',
        'Verify jurisdiction has filed Prop 123 commitment with DOLA',
        'Ensure project meets affordability criteria (income-restricted or NOAH)',
        'New construction units require an Affordability Mechanism on record'
      ]
    });

    // Factory-built advantage for Prop 123 compliance
    if (isFactoryBuilt) {
      violations.push({
        id: 'prop-123-factory-built-advantage',
        description: 'Factory-built design supports Prop 123 unit count targets with faster delivery',
        severity: 'info',
        codeSection: 'Prop 123 / SB 25-002 Synergy',
        remediation: [
          'Factory-built homes count toward jurisdiction affordable housing unit targets',
          'SB 25-002 prevents local barriers to factory-built placement',
          'Combined with expedited review, prefab accelerates Prop 123 compliance',
          'Coordinate with DOLA Division of Housing for unit count tracking'
        ]
      });
    }

    return {
      ruleId: 'colorado-prop-123-affordable',
      passed: true,
      violations,
      metadata: {
        coloradoAmendment: true,
        prop123: true,
        factoryBuilt: isFactoryBuilt
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
  seismicDesignConsiderations,
  sb25002FactoryBuiltCompliance,
  prop123AffordableHousing
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
    jurisdictionParams: {
      factoryBuilt: false, // Set true for factory-built/prefab structures (SB 25-002)
      climateZone: undefined, // IECC climate zone 4-7 for Colorado (SB 25-002 regional codes)
      prop123Target: false, // Set true if targeting Prop 123 affordable housing funding
    },
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
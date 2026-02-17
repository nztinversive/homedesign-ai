/**
 * Compliance Engine - Type Definitions
 * All interfaces for the plan review compliance system.
 * Compatible with existing constraint-engine types.
 */

import type { PlacedPlan, GeneratedPlan, PlacedRoom, Door, WindowPlacement } from '../constraint-engine/types';

// Rule categories matching IRC structure
export type RuleCategory = 
  | 'room-minimums' 
  | 'egress' 
  | 'bathrooms' 
  | 'kitchens' 
  | 'hallways' 
  | 'accessibility'
  | 'structural'
  | 'energy';

// Severity levels for violations
export type ViolationSeverity = 'error' | 'warning' | 'info';

// Jurisdiction types for rule variations
export type Jurisdiction = 'colorado' | 'irc-base' | 'california' | 'texas' | 'florida';

/**
 * Represents a single code violation found during compliance checking
 */
export interface Violation {
  /** Unique identifier for this violation */
  id: string;
  
  /** Human-readable description of the violation */
  description: string;
  
  /** Severity level of the violation */
  severity: ViolationSeverity;
  
  /** Specific IRC code section violated */
  codeSection: string;
  
  /** Room ID where violation occurs (if applicable) */
  roomId?: string;
  
  /** Element ID where violation occurs (door, window, etc.) */
  elementId?: string;
  
  /** Current value that violates the code */
  currentValue?: number | string;
  
  /** Required value per code */
  requiredValue?: number | string;
  
  /** Unit of measurement for values */
  unit?: string;
  
  /** Suggested remediation actions */
  remediation?: string[];
  
  /** Additional context or notes */
  notes?: string;
}

/**
 * Result of running a single compliance rule
 */
export interface RuleResult {
  /** Rule ID that was executed */
  ruleId: string;
  
  /** Whether the rule passed (no violations) */
  passed: boolean;
  
  /** All violations found by this rule */
  violations: Violation[];
  
  /** Optional recommendations for improvement */
  recommendations?: string[];
  
  /** Execution time in milliseconds */
  executionTime?: number;
  
  /** Rule-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Configuration for a compliance rule
 */
export interface ComplianceRule {
  /** Unique rule identifier */
  id: string;
  
  /** IRC code section (e.g., "R304.1", "R310.2.1") */
  code: string;
  
  /** Rule category for organization */
  category: RuleCategory;
  
  /** Human-readable rule description */
  description: string;
  
  /** Whether this rule is enabled */
  enabled: boolean;
  
  /** Jurisdictions this rule applies to */
  applicableJurisdictions: Jurisdiction[];
  
  /** Rule execution function */
  check: (plan: FloorPlan, context: ComplianceContext) => RuleResult;
  
  /** Rule-specific configuration parameters */
  config?: Record<string, any>;
  
  /** Dependencies on other rules */
  dependencies?: string[];
  
  /** Rule version for tracking changes */
  version: string;
}

/**
 * Context provided to rules during execution
 */
export interface ComplianceContext {
  /** Target jurisdiction for rule variations */
  jurisdiction: Jurisdiction;
  
  /** Building type (residential, commercial, etc.) */
  buildingType: 'residential' | 'commercial' | 'mixed-use';
  
  /** Construction type for specific code requirements */
  constructionType?: 'wood' | 'steel' | 'concrete' | 'masonry';
  
  /** Number of occupants (affects egress calculations) */
  occupantLoad?: number;
  
  /** Whether building is in wildfire interface zone */
  wildfireInterfaceZone?: boolean;
  
  /** Seismic design category */
  seismicDesignCategory?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  
  /** Wind speed for structural requirements */
  windSpeed?: number;
  
  /** Snow load for structural calculations */
  snowLoad?: number;
  
  /** Additional jurisdiction-specific parameters */
  jurisdictionParams?: Record<string, any>;
}

/**
 * Summary statistics for a compliance report
 */
export interface ComplianceSummary {
  /** Total number of rules checked */
  totalRules: number;
  
  /** Number of rules that passed */
  passed: number;
  
  /** Number of rules that failed */
  failed: number;
  
  /** Number of warnings generated */
  warnings: number;
  
  /** Number of informational notes */
  info: number;
  
  /** Overall compliance percentage */
  compliancePercentage: number;
  
  /** Critical violations that must be fixed */
  criticalViolations: number;
  
  /** Rules that were skipped */
  skipped: number;
  
  /** Total execution time in milliseconds */
  totalExecutionTime: number;
}

/**
 * Complete compliance report for a floor plan
 */
export interface ComplianceReport {
  /** Unique report identifier */
  id: string;
  
  /** Plan identifier that was checked */
  planId: string;
  
  /** Jurisdiction used for compliance checking */
  jurisdiction: Jurisdiction;
  
  /** Timestamp when report was generated */
  timestamp: Date;
  
  /** Overall compliance status */
  overallCompliance: boolean;
  
  /** Results from all rules executed */
  results: RuleResult[];
  
  /** Summary statistics */
  summary: ComplianceSummary;
  
  /** Context used for rule execution */
  context: ComplianceContext;
  
  /** Report generation metadata */
  metadata: {
    /** Version of compliance engine used */
    engineVersion: string;
    
    /** Ruleset version used */
    rulesetVersion: string;
    
    /** Generation time in milliseconds */
    generationTime: number;
    
    /** Any warnings during report generation */
    warnings?: string[];
  };
}

/**
 * Floor plan type alias for compliance checking
 * Can work with either constraint engine output format
 */
export type FloorPlan = PlacedPlan | GeneratedPlan;

/**
 * Room type alias for compliance checking
 */
export type Room = PlacedRoom;

/**
 * Extended room interface with compliance-specific properties
 */
export interface ComplianceRoom extends PlacedRoom {
  /** Calculated floor area in square feet */
  floorArea: number;
  
  /** Minimum horizontal dimension */
  minHorizontalDimension: number;
  
  /** Ceiling height (default 8 feet if not specified) */
  ceilingHeight: number;
  
  /** Whether room is habitable space */
  isHabitable: boolean;
  
  /** Whether room is a bedroom requiring egress */
  requiresEgress: boolean;
  
  /** Doors associated with this room */
  doors: Door[];
  
  /** Windows associated with this room */
  windows: WindowPlacement[];
  
  /** Adjacent rooms for circulation analysis */
  adjacentRooms: string[];
}

/**
 * Extended window interface with egress properties
 */
export interface EgressWindow extends WindowPlacement {
  /** Clear opening width in inches */
  clearWidth: number;
  
  /** Clear opening height in inches */
  clearHeight: number;
  
  /** Clear opening area in square feet */
  clearArea: number;
  
  /** Sill height above floor in inches */
  sillHeightInches: number;
  
  /** Whether window meets egress requirements */
  meetsEgressRequirements: boolean;
}

/**
 * Extended door interface with compliance properties
 */
export interface ComplianceDoor extends Door {
  /** Door clear width in inches */
  clearWidth: number;
  
  /** Door clear height in inches */
  clearHeight: number;
  
  /** Whether door swings into required clearance */
  swinksIntoRequiredClearance: boolean;
  
  /** Landing dimensions at door */
  landingWidth?: number;
  landingDepth?: number;
}

/**
 * Bathroom fixture clearance measurements
 */
export interface FixtureClearances {
  /** Fixture type */
  type: 'toilet' | 'lavatory' | 'shower' | 'bathtub';
  
  /** Fixture center point */
  centerX: number;
  centerY: number;
  
  /** Fixture dimensions */
  width: number;
  depth: number;
  
  /** Required clearances */
  frontClearance: number;
  sideClearance: number;
  
  /** Actual measured clearances */
  actualFrontClearance?: number;
  actualSideClearance?: number;
}

/**
 * Kitchen work triangle analysis
 */
export interface WorkTriangle {
  /** Sink location */
  sink: { x: number; y: number };
  
  /** Refrigerator location */
  refrigerator: { x: number; y: number };
  
  /** Cooktop/range location */
  cooktop: { x: number; y: number };
  
  /** Triangle perimeter in feet */
  perimeter: number;
  
  /** Whether triangle meets efficiency standards */
  meetsEfficiencyStandards: boolean;
  
  /** Individual leg lengths */
  legs: {
    sinkToRefrigerator: number;
    refrigeratorToCooktop: number;
    cooktopToSink: number;
  };
}

/**
 * Rule execution options
 */
export interface RuleExecutionOptions {
  /** Rules to include (if not specified, all enabled rules run) */
  includeRules?: string[];
  
  /** Rules to exclude */
  excludeRules?: string[];
  
  /** Categories to include */
  includeCategories?: RuleCategory[];
  
  /** Categories to exclude */
  excludeCategories?: RuleCategory[];
  
  /** Stop on first critical violation */
  stopOnCritical?: boolean;
  
  /** Maximum execution time per rule in milliseconds */
  maxExecutionTime?: number;
  
  /** Include detailed metadata in results */
  includeMetadata?: boolean;
}

/**
 * Rule registration interface for modular rule loading
 */
export interface RuleRegistry {
  /** Register a new rule */
  register: (rule: ComplianceRule) => void;
  
  /** Get rule by ID */
  getRule: (id: string) => ComplianceRule | undefined;
  
  /** Get all rules in category */
  getRulesByCategory: (category: RuleCategory) => ComplianceRule[];
  
  /** Get all enabled rules */
  getEnabledRules: () => ComplianceRule[];
  
  /** Update rule configuration */
  updateRuleConfig: (id: string, config: Record<string, any>) => void;
  
  /** Enable/disable rule */
  setRuleEnabled: (id: string, enabled: boolean) => void;
}

/**
 * Main compliance engine interface
 */
export interface ComplianceEngine {
  /** Run compliance check on a floor plan */
  check: (plan: FloorPlan, context: ComplianceContext, options?: RuleExecutionOptions) => Promise<ComplianceReport>;
  
  /** Get available jurisdictions */
  getAvailableJurisdictions: () => Jurisdiction[];
  
  /** Get rule registry for dynamic rule management */
  getRuleRegistry: () => RuleRegistry;
  
  /** Validate a floor plan format */
  validatePlan: (plan: any) => plan is FloorPlan;
}
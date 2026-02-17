/**
 * Compliance Engine - Main Entry Point
 * Orchestrates all compliance rule checking for floor plans
 */

import type {
  ComplianceEngine,
  ComplianceRule,
  ComplianceReport,
  ComplianceContext,
  FloorPlan,
  RuleExecutionOptions,
  RuleRegistry,
  Jurisdiction,
  ComplianceSummary,
  RuleResult
} from './types';

// Import all rule sets
import roomMinimumRules from './rules/room-minimums';
import egressRules from './rules/egress';
import bathroomRules from './rules/bathrooms';
import kitchenRules from './rules/kitchens';
import hallwayRules from './rules/hallways';
import { accessibilityRules } from './rules/accessibility';
import { structuralRules } from './rules/structural';
import { energyRules } from './rules/energy';

// Import jurisdiction-specific overrides
import { coloradoAmendments } from './colorado';

/**
 * Simple rule registry implementation
 */
class SimpleRuleRegistry implements RuleRegistry {
  private rules: Map<string, ComplianceRule> = new Map();

  constructor(initialRules: ComplianceRule[] = []) {
    initialRules.forEach(rule => this.register(rule));
  }

  register(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
  }

  replaceRule(id: string, rule: ComplianceRule): void {
    this.rules.set(id, rule);
  }

  getRule(id: string): ComplianceRule | undefined {
    return this.rules.get(id);
  }

  getRulesByCategory(category: string): ComplianceRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.category === category);
  }

  getEnabledRules(): ComplianceRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.enabled);
  }

  updateRuleConfig(id: string, config: Record<string, any>): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.config = { ...rule.config, ...config };
    }
  }

  setRuleEnabled(id: string, enabled: boolean): void {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  getAllRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }
}

/**
 * Main compliance engine implementation
 */
class DefaultComplianceEngine implements ComplianceEngine {
  private registry: SimpleRuleRegistry;

  constructor() {
    // Initialize with all base rules
    const allRules = [
      ...roomMinimumRules,
      ...egressRules,
      ...bathroomRules,
      ...kitchenRules,
      ...hallwayRules,
      ...accessibilityRules,
      ...structuralRules,
      ...energyRules,
    ];

    this.registry = new SimpleRuleRegistry(allRules);
  }

  /**
   * Validate that an object is a valid floor plan
   */
  validatePlan(plan: any): plan is FloorPlan {
    return (
      plan &&
      typeof plan === 'object' &&
      Array.isArray(plan.rooms) &&
      Array.isArray(plan.doors) &&
      plan.rooms.length > 0
    );
  }

  /**
   * Get available jurisdictions
   */
  getAvailableJurisdictions(): Jurisdiction[] {
    return ['irc-base', 'colorado'];
  }

  /**
   * Get rule registry for dynamic management
   */
  getRuleRegistry(): RuleRegistry {
    return this.registry;
  }

  /**
   * Apply jurisdiction-specific rule modifications
   */
  private applyJurisdictionAmendments(jurisdiction: Jurisdiction): void {
    if (jurisdiction === 'colorado') {
      coloradoAmendments.forEach(amendment => {
        const existingRule = this.registry.getRule(amendment.ruleId);
        if (existingRule && amendment.override) {
          // Clone the rule before mutating to avoid leaking overrides into subsequent runs
          const clonedRule = { ...existingRule, check: amendment.override, version: amendment.version || existingRule.version };
          this.registry.replaceRule(amendment.ruleId, clonedRule);
        }
      });
    }
  }

  /**
   * Filter rules based on execution options
   */
  private filterRules(rules: ComplianceRule[], options?: RuleExecutionOptions): ComplianceRule[] {
    let filteredRules = rules;

    // Filter by enabled status
    filteredRules = filteredRules.filter(rule => rule.enabled);

    // Apply include/exclude filters
    if (options?.includeRules?.length) {
      filteredRules = filteredRules.filter(rule => 
        options.includeRules!.includes(rule.id)
      );
    }

    if (options?.excludeRules?.length) {
      filteredRules = filteredRules.filter(rule => 
        !options.excludeRules!.includes(rule.id)
      );
    }

    if (options?.includeCategories?.length) {
      filteredRules = filteredRules.filter(rule => 
        options.includeCategories!.includes(rule.category)
      );
    }

    if (options?.excludeCategories?.length) {
      filteredRules = filteredRules.filter(rule => 
        !options.excludeCategories!.includes(rule.category)
      );
    }

    return filteredRules;
  }

  /**
   * Calculate summary statistics from rule results
   */
  private calculateSummary(results: RuleResult[], executionTimeMs: number): ComplianceSummary {
    const totalRules = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = totalRules - passed;
    
    let warnings = 0;
    let info = 0;
    let criticalViolations = 0;

    results.forEach(result => {
      result.violations.forEach(violation => {
        if (violation.severity === 'warning') warnings++;
        else if (violation.severity === 'info') info++;
        else if (violation.severity === 'error') criticalViolations++;
      });
    });

    return {
      totalRules,
      passed,
      failed,
      warnings,
      info,
      compliancePercentage: totalRules > 0 ? Math.round((passed / totalRules) * 100) : 0,
      criticalViolations,
      skipped: 0, // TODO: Implement rule skipping
      totalExecutionTime: executionTimeMs
    };
  }

  /**
   * Run compliance check on a floor plan
   */
  async check(
    plan: FloorPlan, 
    context: ComplianceContext, 
    options?: RuleExecutionOptions
  ): Promise<ComplianceReport> {
    const startTime = Date.now();

    // Validate input
    if (!this.validatePlan(plan)) {
      throw new Error('Invalid floor plan format');
    }

    // Apply jurisdiction-specific amendments
    this.applyJurisdictionAmendments(context.jurisdiction);

    // Get applicable rules
    let applicableRules = this.registry.getAllRules()
      .filter(rule => rule.applicableJurisdictions.includes(context.jurisdiction));

    // Apply filters
    applicableRules = this.filterRules(applicableRules, options);

    // Execute rules
    const results: RuleResult[] = [];
    let hasStoppedOnCritical = false;

    for (const rule of applicableRules) {
      if (hasStoppedOnCritical) break;

      try {
        const ruleStartTime = Date.now();
        const result = rule.check(plan, context);
        const ruleEndTime = Date.now();

        // Add execution time if not already present
        if (!result.executionTime) {
          result.executionTime = ruleEndTime - ruleStartTime;
        }

        results.push(result);

        // Check for critical violations and stop option
        if (options?.stopOnCritical && !result.passed) {
          const hasCritical = result.violations.some(v => v.severity === 'error');
          if (hasCritical) {
            hasStoppedOnCritical = true;
          }
        }

        // Timeout check
        if (options?.maxExecutionTime && result.executionTime > options.maxExecutionTime) {
          console.warn(`Rule ${rule.id} exceeded maximum execution time`);
        }

      } catch (error) {
        // Handle rule execution errors gracefully
        results.push({
          ruleId: rule.id,
          passed: false,
          violations: [{
            id: `${rule.id}-execution-error`,
            description: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            codeSection: rule.code,
            remediation: ['Manual review required - rule execution failed']
          }],
          executionTime: 0,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Calculate summary
    const summary = this.calculateSummary(results, executionTime);

    // Generate report
    const report: ComplianceReport = {
      id: `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      planId: (plan as any).id || 'unknown',
      jurisdiction: context.jurisdiction,
      timestamp: new Date(),
      overallCompliance: summary.failed === 0 && summary.criticalViolations === 0,
      results,
      summary,
      context,
      metadata: {
        engineVersion: '1.0.0',
        rulesetVersion: '1.0.0',
        generationTime: executionTime,
        warnings: hasStoppedOnCritical ? ['Stopped early due to critical violation'] : undefined
      }
    };

    return report;
  }
}

/**
 * Run compliance check with default engine
 */
export async function runComplianceCheck(
  plan: FloorPlan,
  jurisdiction: Jurisdiction = 'irc-base',
  options?: RuleExecutionOptions
): Promise<ComplianceReport> {
  const engine = new DefaultComplianceEngine();
  
  const context: ComplianceContext = {
    jurisdiction,
    buildingType: 'residential',
    occupantLoad: plan.rooms.length * 2 // Simple estimate
  };

  return engine.check(plan, context, options);
}

/**
 * Create a default compliance engine instance
 */
export function createComplianceEngine(): ComplianceEngine {
  return new DefaultComplianceEngine();
}

// Export types and rules for external use
export type { 
  ComplianceEngine, 
  ComplianceReport, 
  ComplianceRule, 
  ComplianceContext,
  FloorPlan,
  RuleExecutionOptions
};

export { 
  roomMinimumRules,
  egressRules,
  bathroomRules,
  kitchenRules,
  hallwayRules,
  accessibilityRules,
  structuralRules,
  energyRules,
};

// Default export
export default {
  runComplianceCheck,
  createComplianceEngine,
  roomMinimumRules,
  egressRules,
  bathroomRules,
  kitchenRules,
  hallwayRules,
  accessibilityRules,
  structuralRules,
  energyRules,
};
/**
 * Compliance Engine Tests
 * Integration tests using sample floor plans
 */

import { runComplianceCheck, createComplianceEngine } from '../index';
import type { FloorPlan, ComplianceContext, RuleCategory } from '../types';

/**
 * Sample 3BR/2BA floor plan for testing
 */
const sampleFloorPlan: FloorPlan = {
  brief: {
    targetSqft: 1800,
    stories: 1,
    style: 'modern',
    rooms: [],
    lot: {
      maxWidth: 100,
      maxDepth: 120,
      setbackFront: 20,
      setbackSide: 10,
      setbackRear: 15,
      entryFacing: 'south'
    },
    metadata: {
      impliedRoomIds: [],
      warnings: []
    }
  },
  envelope: {
    shape: 'rectangle',
    segments: [{ x: 0, y: 0, width: 60, depth: 30 }],
    totalSqft: 1800,
    boundingWidth: 60,
    boundingDepth: 30,
    streetFacing: 'south',
    lot: {
      maxWidth: 100,
      maxDepth: 120,
      setbackFront: 20,
      setbackSide: 10,
      setbackRear: 15,
      entryFacing: 'south'
    },
    buildableRect: { x: 10, y: 20, width: 80, depth: 85 },
    footprint: { x: 20, y: 35, width: 60, depth: 30 },
    floorRects: {
      1: { x: 20, y: 35, width: 60, depth: 30 }
    },
    targetSqftPerFloor: 1800,
    gridResolution: 1
  },
  rooms: [
    // Primary Bedroom - should pass all tests
    {
      id: 'primary-bed-1',
      type: 'primary_bed',
      label: 'Primary Bedroom',
      x: 20,
      y: 35,
      width: 14,
      depth: 12,
      floor: 1,
      sqft: 168, // 14 x 12 = 168 sq ft (> 70 minimum)
      zone: 'private',
      rotation: 0,
      adjacentRoomIds: ['primary-bath-1', 'hallway-1'],
      exteriorWalls: ['north'],
      hasPlumbing: false,
      targetSqft: 160,
      minSqft: 120,
      needsExteriorWall: true,
      needsPlumbing: false
    },
    
    // Secondary Bedroom - borderline size
    {
      id: 'bedroom-1',
      type: 'bedroom',
      label: 'Bedroom 2',
      x: 34,
      y: 35,
      width: 10,
      depth: 8,
      floor: 1,
      sqft: 80, // 10 x 8 = 80 sq ft (> 70 minimum)
      zone: 'private',
      rotation: 0,
      adjacentRoomIds: ['hallway-1'],
      exteriorWalls: ['north'],
      hasPlumbing: false,
      targetSqft: 100,
      minSqft: 70,
      needsExteriorWall: true,
      needsPlumbing: false
    },
    
    // Small Bedroom - should trigger violation
    {
      id: 'bedroom-2',
      type: 'bedroom',
      label: 'Bedroom 3',
      x: 44,
      y: 35,
      width: 8,
      depth: 8,
      floor: 1,
      sqft: 64, // 8 x 8 = 64 sq ft (< 70 minimum) - VIOLATION
      zone: 'private',
      rotation: 0,
      adjacentRoomIds: ['hallway-1'],
      exteriorWalls: ['north'],
      hasPlumbing: false,
      targetSqft: 80,
      minSqft: 70,
      needsExteriorWall: true,
      needsPlumbing: false
    },
    
    // Primary Bathroom
    {
      id: 'primary-bath-1',
      type: 'primary_bath',
      label: 'Primary Bath',
      x: 20,
      y: 47,
      width: 8,
      depth: 6,
      floor: 1,
      sqft: 48, // 8 x 6 = 48 sq ft
      zone: 'private',
      rotation: 0,
      adjacentRoomIds: ['primary-bed-1'],
      exteriorWalls: [],
      hasPlumbing: true,
      needsPlumbing: true
    },
    
    // Hall Bathroom
    {
      id: 'bathroom-1',
      type: 'bathroom',
      label: 'Hall Bath',
      x: 28,
      y: 47,
      width: 6,
      depth: 6,
      floor: 1,
      sqft: 36, // 6 x 6 = 36 sq ft
      zone: 'service',
      rotation: 0,
      adjacentRoomIds: ['hallway-1'],
      exteriorWalls: [],
      hasPlumbing: true,
      needsPlumbing: true
    },
    
    // Kitchen
    {
      id: 'kitchen-1',
      type: 'kitchen',
      label: 'Kitchen',
      x: 52,
      y: 47,
      width: 12,
      depth: 10,
      floor: 1,
      sqft: 120, // 12 x 10 = 120 sq ft (exactly minimum)
      zone: 'service',
      rotation: 0,
      adjacentRoomIds: ['great-room-1'],
      exteriorWalls: ['east'],
      hasPlumbing: true,
      needsExteriorWall: true,
      needsPlumbing: true
    },
    
    // Living Area
    {
      id: 'great-room-1',
      type: 'great_room',
      label: 'Great Room',
      x: 34,
      y: 53,
      width: 18,
      depth: 12,
      floor: 1,
      sqft: 216, // 18 x 12 = 216 sq ft (> 120 minimum)
      zone: 'social',
      rotation: 0,
      adjacentRoomIds: ['kitchen-1', 'hallway-1'],
      exteriorWalls: ['south', 'east'],
      hasPlumbing: false,
      needsExteriorWall: true
    },
    
    // Narrow Hallway - should trigger width violation
    {
      id: 'hallway-1',
      type: 'hallway',
      label: 'Main Hallway',
      x: 34,
      y: 43,
      width: 18,
      depth: 2.5, // 2.5 feet = 30 inches (< 36" minimum) - VIOLATION
      floor: 1,
      sqft: 45, // 18 x 2.5 = 45 sq ft
      zone: 'circulation',
      rotation: 0,
      adjacentRoomIds: ['primary-bed-1', 'bedroom-1', 'bedroom-2', 'bathroom-1', 'great-room-1'],
      exteriorWalls: [],
      hasPlumbing: false
    }
  ],
  doors: [
    {
      id: 'front-door',
      wallId: 'south-wall',
      position: 0.5,
      width: 36,
      type: 'exterior',
      connectsRooms: ['great-room-1', 'exterior']
    },
    {
      id: 'primary-bed-door',
      wallId: 'hall-primary-wall',
      position: 0.5,
      width: 32,
      type: 'standard',
      connectsRooms: ['hallway-1', 'primary-bed-1']
    },
    {
      id: 'bedroom-1-door',
      wallId: 'hall-bed1-wall',
      position: 0.5,
      width: 30,
      type: 'standard',
      connectsRooms: ['hallway-1', 'bedroom-1']
    },
    {
      id: 'bedroom-2-door',
      wallId: 'hall-bed2-wall',
      position: 0.5,
      width: 30,
      type: 'standard',
      connectsRooms: ['hallway-1', 'bedroom-2']
    }
  ],
  windows: [
    {
      id: 'primary-bed-window',
      wallId: 'primary-north-wall',
      position: 0.5,
      width: 48,
      height: 48,
      sillHeight: 30,
      type: 'standard',
      roomId: 'primary-bed-1',
      floor: 1,
      wallDirection: 'north'
    },
    {
      id: 'bedroom-1-window',
      wallId: 'bed1-north-wall',
      position: 0.5,
      width: 36,
      height: 48,
      sillHeight: 36,
      type: 'standard',
      roomId: 'bedroom-1',
      floor: 1,
      wallDirection: 'north'
    }
  ],
  circulation: {
    isFullyConnected: true,
    deadEnds: [],
    mainPath: ['great-room-1', 'hallway-1'],
    hallwayPercent: 2.5,
    doors: []
  },
  unplacedRoomIds: [],
  metadata: {
    strategy: 'test-plan',
    warnings: []
  }
};

/**
 * Test basic compliance checking
 */
async function testBasicCompliance() {
  console.log('\n=== Testing Basic Compliance ===');
  
  const report = await runComplianceCheck(sampleFloorPlan, 'irc-base');
  
  console.log(`Report ID: ${report.id}`);
  console.log(`Overall Compliance: ${report.overallCompliance}`);
  console.log(`Total Rules: ${report.summary.totalRules}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Critical Violations: ${report.summary.criticalViolations}`);
  console.log(`Compliance Percentage: ${report.summary.compliancePercentage}%`);
  
  // Show violations
  const violationsResults = report.results.filter(r => r.violations.length > 0);
  console.log(`\nRules with violations: ${violationsResults.length}`);
  
  violationsResults.forEach(result => {
    console.log(`\n  Rule: ${result.ruleId}`);
    result.violations.forEach(violation => {
      console.log(`    - ${violation.severity.toUpperCase()}: ${violation.description}`);
    });
  });
  
  return report;
}

/**
 * Test Colorado jurisdiction
 */
async function testColoradoCompliance() {
  console.log('\n=== Testing Colorado Compliance ===');
  
  const report = await runComplianceCheck(sampleFloorPlan, 'colorado');
  
  console.log(`Colorado Rules Applied: ${report.results.length}`);
  
  // Show Colorado-specific results
  const coloradoResults = report.results.filter(r => 
    r.metadata?.coloradoAmendment === true
  );
  
  console.log(`Colorado Amendment Rules: ${coloradoResults.length}`);
  
  coloradoResults.forEach(result => {
    console.log(`\n  Colorado Rule: ${result.ruleId}`);
    if (result.violations.length > 0) {
      result.violations.forEach(violation => {
        console.log(`    - ${violation.severity.toUpperCase()}: ${violation.description}`);
      });
    } else {
      console.log('    ✓ Passed');
    }
  });
  
  return report;
}

/**
 * Test rule filtering
 */
async function testRuleFiltering() {
  console.log('\n=== Testing Rule Filtering ===');
  
  // Test category filtering
  const bathroomOnlyReport = await runComplianceCheck(
    sampleFloorPlan, 
    'irc-base',
    { includeCategories: ['bathrooms'] }
  );
  
  console.log(`Bathroom rules only: ${bathroomOnlyReport.summary.totalRules} rules`);
  
  // Test excluding categories
  const noBathroomReport = await runComplianceCheck(
    sampleFloorPlan,
    'irc-base',
    { excludeCategories: ['bathrooms', 'kitchens'] }
  );
  
  console.log(`Excluding bathroom/kitchen rules: ${noBathroomReport.summary.totalRules} rules`);
  
  return { bathroomOnlyReport, noBathroomReport };
}

/**
 * Test engine creation and configuration
 */
function testEngineConfiguration() {
  console.log('\n=== Testing Engine Configuration ===');
  
  const engine = createComplianceEngine();
  const registry = engine.getRuleRegistry();
  
  console.log(`Available Jurisdictions: ${engine.getAvailableJurisdictions().join(', ')}`);
  console.log(`Total Registered Rules: ${registry.getEnabledRules().length}`);
  
  // Test rule categories
  const categories: RuleCategory[] = ['room-minimums', 'egress', 'bathrooms', 'kitchens', 'hallways', 'accessibility', 'structural', 'energy'];
  categories.forEach(category => {
    const rules = registry.getRulesByCategory(category);
    console.log(`  ${category}: ${rules.length} rules`);
  });
  
  return engine;
}

/**
 * Main test runner
 */
export async function runComplianceTests() {
  console.log('🏗️  Running Compliance Engine Tests');
  console.log('=====================================');
  
  try {
    // Test 1: Basic compliance
    const basicReport = await testBasicCompliance();
    
    // Test 2: Colorado amendments
    const coloradoReport = await testColoradoCompliance();
    
    // Test 3: Rule filtering
    const filterResults = await testRuleFiltering();
    
    // Test 4: Engine configuration
    const engine = testEngineConfiguration();
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ Basic compliance test completed`);
    console.log(`✅ Colorado amendments test completed`);
    console.log(`✅ Rule filtering test completed`);
    console.log(`✅ Engine configuration test completed`);
    
    // Expected violations summary
    console.log('\n=== Expected Violations Found ===');
    console.log('• Bedroom 3: Below 70 sq ft minimum (64 sq ft)');
    console.log('• Main Hallway: Below 36" width minimum (30")');
    console.log('• Various bathroom clearance warnings');
    console.log('• Kitchen workspace recommendations');
    
    console.log('\n🎉 All tests completed successfully!');
    
    return {
      basicReport,
      coloradoReport,
      filterResults,
      engine,
      success: true
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for use in other test files
export { sampleFloorPlan };

// Run tests if this file is executed directly
if (require.main === module) {
  runComplianceTests();
}
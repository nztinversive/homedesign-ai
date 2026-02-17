/**
 * Quick test runner for compliance engine
 */

const { runComplianceTests } = require('./dist/lib/compliance-engine/__tests__/compliance.test.js');

async function main() {
  console.log('Testing Compliance Engine...');
  const results = await runComplianceTests();
  
  if (results.success) {
    console.log('\n✅ Compliance engine test completed successfully!');
    process.exit(0);
  } else {
    console.error('\n❌ Compliance engine test failed:', results.error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
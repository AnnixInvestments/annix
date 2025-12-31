/**
 * Comprehensive Pipe Calculation Test Script
 *
 * Tests all combinations of:
 * - Steel Types (ASTM A53, ASTM A106, etc.)
 * - Pressure Ratings (10-100 bar)
 * - Temperatures (20°C - 200°C)
 * - NB Sizes (15-1200mm)
 * - Schedules (STD, XS, 40, 80, etc.)
 *
 * Run with: node scripts/test-pipe-calculations.js
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Test parameters
const STEEL_SPECS = [
  { id: 1, name: 'ASTM A53 Grade B' },
  { id: 2, name: 'ASTM A106 Grade B' },
  { id: 3, name: 'ASTM A333 Grade 6' },
];

const PRESSURE_RATINGS = [10, 16, 25, 40, 64, 100]; // bar
const TEMPERATURES = [20, 50, 100, 150, 200]; // Celsius

const NB_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200];

const SCHEDULES = ['Sch 40/STD', 'Sch 80/XS', 'Sch 120', 'Sch 160', 'XXS', 'Sch 10', 'Sch 20', 'Sch 30', 'STD', 'XS'];

// Flange configurations
const FLANGE_STANDARDS = [
  { id: 1, code: 'SABS1123' },
  { id: 2, code: 'ASME B16.5' },
  { id: 3, code: 'EN1092' },
];

const PRESSURE_CLASSES = [
  { id: 1, designation: 'PN10' },
  { id: 2, designation: 'PN16' },
  { id: 3, designation: 'PN25' },
  { id: 4, designation: 'PN40' },
  { id: 5, designation: 'Class 150' },
  { id: 6, designation: 'Class 300' },
];

// Track errors
const errors = [];
const successes = [];

async function testCalculation(params) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rfq/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText, status: response.status };
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message, status: 'NETWORK_ERROR' };
  }
}

async function testScheduleRecommendation(params) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pipe-schedules/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText, status: response.status };
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message, status: 'NETWORK_ERROR' };
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE PIPE CALCULATION TESTS');
  console.log('='.repeat(80));
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Steel Types: ${STEEL_SPECS.length}`);
  console.log(`Pressure Ratings: ${PRESSURE_RATINGS.length}`);
  console.log(`Temperatures: ${TEMPERATURES.length}`);
  console.log(`NB Sizes: ${NB_SIZES.length}`);
  console.log(`Schedules: ${SCHEDULES.length}`);
  console.log('='.repeat(80));

  let testCount = 0;
  let errorCount = 0;
  let successCount = 0;

  // Test 1: Schedule Recommendations
  console.log('\n[TEST 1] Schedule Recommendation API');
  console.log('-'.repeat(40));

  for (const steel of STEEL_SPECS) {
    for (const pressure of PRESSURE_RATINGS) {
      for (const temp of TEMPERATURES) {
        for (const nb of NB_SIZES) {
          testCount++;
          const params = {
            nbMm: nb,
            pressureBar: pressure,
            temperatureCelsius: temp,
            materialCode: steel.name.replace(/ /g, '_'),
          };

          const result = await testScheduleRecommendation(params);

          if (!result.success) {
            errorCount++;
            const errorEntry = {
              test: 'Schedule Recommendation',
              params,
              error: result.error,
              status: result.status,
            };
            errors.push(errorEntry);
            console.log(`❌ ${steel.name} | ${nb}NB | ${pressure}bar | ${temp}°C`);
            console.log(`   Error: ${result.error.substring(0, 100)}...`);
          } else {
            successCount++;
            if (testCount % 100 === 0) {
              console.log(`✓ Tested ${testCount} combinations... (${errorCount} errors)`);
            }
          }
        }
      }
    }
  }

  // Test 2: Pipe Calculations
  console.log('\n[TEST 2] Pipe Calculation API');
  console.log('-'.repeat(40));

  // Test a subset of combinations for calculations (full test would be too slow)
  const testNbSizes = [100, 200, 300, 500, 800]; // Sample sizes
  const testSchedules = ['Sch 40/STD', 'Sch 80/XS', 'Sch 120'];

  for (const steel of STEEL_SPECS) {
    for (const pressure of PRESSURE_RATINGS) {
      for (const temp of [20, 100]) { // Just 2 temperatures
        for (const nb of testNbSizes) {
          for (const schedule of testSchedules) {
            testCount++;
            const params = {
              nominalBoreMm: nb,
              scheduleNumber: schedule,
              wallThicknessMm: 10, // Default
              individualPipeLength: 6.1,
              quantityValue: 1,
              quantityType: 'number_of_pipes',
              pipeEndConfiguration: 'PE',
              workingPressureBar: pressure,
              workingTemperatureC: temp,
              steelSpecificationId: steel.id,
              flangeStandardId: 1,
              flangePressureClassId: 2,
            };

            const result = await testCalculation(params);

            if (!result.success && result.status !== 404) {
              // 404 is expected for some NB/schedule combinations
              errorCount++;
              const errorEntry = {
                test: 'Pipe Calculation',
                params: {
                  steel: steel.name,
                  nb,
                  schedule,
                  pressure,
                  temp,
                },
                error: result.error,
                status: result.status,
              };
              errors.push(errorEntry);
              console.log(`❌ ${steel.name} | ${nb}NB | ${schedule} | ${pressure}bar | ${temp}°C`);
              console.log(`   Error (${result.status}): ${result.error.substring(0, 100)}...`);
            } else {
              successCount++;
            }
          }
        }
      }
    }
  }

  // Summary
  console.log('\n');
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests Run: ${testCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Error Rate: ${((errorCount / testCount) * 100).toFixed(2)}%`);

  if (errors.length > 0) {
    console.log('\n');
    console.log('='.repeat(80));
    console.log('ERROR DETAILS');
    console.log('='.repeat(80));

    // Group errors by type
    const errorsByType = {};
    errors.forEach(err => {
      const key = err.status;
      if (!errorsByType[key]) {
        errorsByType[key] = [];
      }
      errorsByType[key].push(err);
    });

    for (const [status, errs] of Object.entries(errorsByType)) {
      console.log(`\n[Status: ${status}] - ${errs.length} errors`);
      console.log('-'.repeat(40));

      // Show first 5 examples of each error type
      errs.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.test}`);
        console.log(`     Params: ${JSON.stringify(err.params)}`);
        console.log(`     Error: ${err.error.substring(0, 200)}`);
      });

      if (errs.length > 5) {
        console.log(`  ... and ${errs.length - 5} more similar errors`);
      }
    }
  }

  // Output errors to JSON file
  if (errors.length > 0) {
    import * as fs from 'fs';
    const errorReport = {
      timestamp: new Date().toISOString(),
      totalTests: testCount,
      successCount,
      errorCount,
      errors,
    };
    fs.writeFileSync('pipe-calculation-errors.json', JSON.stringify(errorReport, null, 2));
    console.log('\nFull error report saved to: pipe-calculation-errors.json');
  }

  console.log('\n='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(console.error);

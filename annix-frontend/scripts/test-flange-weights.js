/**
 * Comprehensive Flange Weight Test Script
 *
 * Tests all combinations of:
 * - Pressure class designations (PN, SABS, ASME formats)
 * - NB sizes (15-1200mm)
 *
 * Run with: node scripts/test-flange-weights.js
 */

// Copy of the flange weight lookup table from the component
const FLANGE_WEIGHT_BY_PRESSURE_CLASS = {
  // PN10 / Class 150 (lightest)
  'PN10': {
    15: 0.6, 20: 0.8, 25: 1.0, 32: 1.3, 40: 1.6, 50: 2.0, 65: 2.8, 80: 3.6,
    100: 4.8, 125: 6.8, 150: 8.8, 200: 12.8, 250: 19.2, 300: 28.0, 350: 36.0,
    400: 44.0, 450: 56.0, 500: 72.0, 600: 96.0, 700: 120.0, 750: 136.0,
    800: 152.0, 900: 192.0, 1000: 240.0, 1050: 280.0, 1200: 400.0
  },
  // PN16 / 1600kPa (standard - default)
  'PN16': {
    15: 0.8, 20: 1.0, 25: 1.2, 32: 1.6, 40: 2.0, 50: 2.5, 65: 3.5, 80: 4.5,
    100: 6.0, 125: 8.5, 150: 11.0, 200: 16.0, 250: 24.0, 300: 35.0, 350: 45.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 120.0, 700: 150.0, 750: 170.0,
    800: 190.0, 900: 240.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  // PN25 / 2500kPa
  'PN25': {
    15: 1.0, 20: 1.3, 25: 1.5, 32: 2.0, 40: 2.5, 50: 3.2, 65: 4.4, 80: 5.6,
    100: 7.5, 125: 10.6, 150: 13.8, 200: 20.0, 250: 30.0, 300: 43.8, 350: 56.3,
    400: 68.8, 450: 87.5, 500: 112.5, 600: 150.0, 700: 187.5, 750: 212.5,
    800: 237.5, 900: 300.0, 1000: 375.0, 1050: 437.5, 1200: 625.0
  },
  // PN40 / 4000kPa / Class 300
  'PN40': {
    15: 1.2, 20: 1.5, 25: 1.8, 32: 2.4, 40: 3.0, 50: 3.8, 65: 5.3, 80: 6.8,
    100: 9.0, 125: 12.8, 150: 16.5, 200: 24.0, 250: 36.0, 300: 52.5, 350: 67.5,
    400: 82.5, 450: 105.0, 500: 135.0, 600: 180.0, 700: 225.0, 750: 255.0,
    800: 285.0, 900: 360.0, 1000: 450.0, 1050: 525.0, 1200: 750.0
  },
  // PN64 / 6400kPa (heavy duty)
  'PN64': {
    15: 1.6, 20: 2.0, 25: 2.4, 32: 3.2, 40: 4.0, 50: 5.0, 65: 7.0, 80: 9.0,
    100: 12.0, 125: 17.0, 150: 22.0, 200: 32.0, 250: 48.0, 300: 70.0, 350: 90.0,
    400: 110.0, 450: 140.0, 500: 180.0, 600: 240.0, 700: 300.0, 750: 340.0,
    800: 380.0, 900: 480.0, 1000: 600.0, 1050: 700.0, 1200: 1000.0
  },
  // Class 150 (ASME) - similar to PN16
  'Class 150': {
    15: 0.8, 20: 1.0, 25: 1.2, 32: 1.6, 40: 2.0, 50: 2.5, 65: 3.5, 80: 4.5,
    100: 6.0, 125: 8.5, 150: 11.0, 200: 16.0, 250: 24.0, 300: 35.0, 350: 45.0,
    400: 55.0, 450: 70.0, 500: 90.0, 600: 120.0, 700: 150.0, 750: 170.0,
    800: 190.0, 900: 240.0, 1000: 300.0, 1050: 350.0, 1200: 500.0
  },
  // Class 300 (ASME) - similar to PN40
  'Class 300': {
    15: 1.2, 20: 1.5, 25: 1.8, 32: 2.4, 40: 3.0, 50: 3.8, 65: 5.3, 80: 6.8,
    100: 9.0, 125: 12.8, 150: 16.5, 200: 24.0, 250: 36.0, 300: 52.5, 350: 67.5,
    400: 82.5, 450: 105.0, 500: 135.0, 600: 180.0, 700: 225.0, 750: 255.0,
    800: 285.0, 900: 360.0, 1000: 450.0, 1050: 525.0, 1200: 750.0
  },
  // Class 600 (ASME) - heavy
  'Class 600': {
    15: 2.0, 20: 2.5, 25: 3.0, 32: 4.0, 40: 5.0, 50: 6.3, 65: 8.8, 80: 11.3,
    100: 15.0, 125: 21.3, 150: 27.5, 200: 40.0, 250: 60.0, 300: 87.5, 350: 112.5,
    400: 137.5, 450: 175.0, 500: 225.0, 600: 300.0, 700: 375.0, 750: 425.0,
    800: 475.0, 900: 600.0, 1000: 750.0, 1050: 875.0, 1200: 1250.0
  },
};

const NB_TO_FLANGE_WEIGHT_LOOKUP = FLANGE_WEIGHT_BY_PRESSURE_CLASS['PN16'];

// Copy of the normalize function
const normalizePressureClass = (designation) => {
  if (!designation) return 'PN16';

  const trimmed = designation.trim().toUpperCase();

  // Handle SABS format like "1600/3", "4000/3" - extract the kPa value
  const sabsMatch = trimmed.match(/^(\d+)\/\d+$/);
  if (sabsMatch) {
    const kpa = parseInt(sabsMatch[1]);
    if (kpa <= 1000) return 'PN10';
    if (kpa <= 1600) return 'PN16';
    if (kpa <= 2500) return 'PN25';
    if (kpa <= 4000) return 'PN40';
    if (kpa <= 6400) return 'PN64';
    return 'PN64';
  }

  // Handle "PN 16" -> "PN16" (remove space)
  const pnMatch = trimmed.match(/^PN\s*(\d+)/i);
  if (pnMatch) {
    const pnValue = parseInt(pnMatch[1]);
    if (pnValue <= 10) return 'PN10';
    if (pnValue <= 16) return 'PN16';
    if (pnValue <= 25) return 'PN25';
    if (pnValue <= 40) return 'PN40';
    if (pnValue <= 64 || pnValue === 63) return 'PN64';
    return 'PN64';
  }

  // Handle "Class 150", etc.
  const classMatch = trimmed.match(/^CLASS\s*(\d+)/i);
  if (classMatch) {
    const classValue = parseInt(classMatch[1]);
    if (classValue <= 150) return 'Class 150';
    if (classValue <= 300) return 'Class 300';
    return 'Class 600';
  }

  // Handle numeric-only designations
  const numericMatch = trimmed.match(/^(\d+)$/);
  if (numericMatch) {
    const value = parseInt(numericMatch[1]);
    if (value >= 1000) {
      if (value <= 1000) return 'PN10';
      if (value <= 1600) return 'PN16';
      if (value <= 2500) return 'PN25';
      if (value <= 4000) return 'PN40';
      if (value <= 6400) return 'PN64';
      return 'PN64';
    } else {
      if (value <= 150) return 'Class 150';
      if (value <= 300) return 'Class 300';
      return 'Class 600';
    }
  }

  return designation;
};

// Copy of getFlangeWeight function
const getFlangeWeight = (nominalBoreMm, pressureClassDesignation) => {
  const pressureClass = normalizePressureClass(pressureClassDesignation || 'PN16');

  if (FLANGE_WEIGHT_BY_PRESSURE_CLASS[pressureClass]) {
    const weight = FLANGE_WEIGHT_BY_PRESSURE_CLASS[pressureClass][nominalBoreMm];
    if (weight) return { weight, normalized: pressureClass, found: true };
  }

  const defaultWeight = NB_TO_FLANGE_WEIGHT_LOOKUP[nominalBoreMm];
  if (defaultWeight) return { weight: defaultWeight, normalized: pressureClass, found: false, fallback: 'PN16' };

  const estimate = nominalBoreMm < 100 ? 5 : nominalBoreMm < 200 ? 12 : nominalBoreMm < 400 ? 40 : nominalBoreMm < 600 ? 80 : 150;
  return { weight: estimate, normalized: pressureClass, found: false, fallback: 'estimate' };
};

// Test data
const TEST_DESIGNATIONS = [
  // Standard PN format (no space)
  { input: 'PN10', expected: 'PN10' },
  { input: 'PN16', expected: 'PN16' },
  { input: 'PN25', expected: 'PN25' },
  { input: 'PN40', expected: 'PN40' },
  { input: 'PN64', expected: 'PN64' },
  { input: 'PN63', expected: 'PN64' }, // PN63 should map to PN64

  // PN format with space
  { input: 'PN 10', expected: 'PN10' },
  { input: 'PN 16', expected: 'PN16' },
  { input: 'PN 25', expected: 'PN25' },
  { input: 'PN 40', expected: 'PN40' },
  { input: 'PN 63', expected: 'PN64' },
  { input: 'PN 100', expected: 'PN64' }, // Higher values map to max
  { input: 'PN 160', expected: 'PN64' },

  // SABS format (kPa/table)
  { input: '1000/3', expected: 'PN10' },
  { input: '1600/3', expected: 'PN16' },
  { input: '2500/3', expected: 'PN25' },
  { input: '4000/3', expected: 'PN40' },
  { input: '6400/3', expected: 'PN64' },
  { input: '1000/1', expected: 'PN10' },
  { input: '1600/1', expected: 'PN16' },

  // ASME Class format
  { input: 'Class 150', expected: 'Class 150' },
  { input: 'Class 300', expected: 'Class 300' },
  { input: 'Class 600', expected: 'Class 600' },
  { input: 'CLASS 150', expected: 'Class 150' },
  { input: 'class 300', expected: 'Class 300' },

  // Numeric only
  { input: '1000', expected: 'PN10' },
  { input: '1600', expected: 'PN16' },
  { input: '2500', expected: 'PN25' },
  { input: '4000', expected: 'PN40' },
  { input: '150', expected: 'Class 150' },
  { input: '300', expected: 'Class 300' },

  // Edge cases
  { input: '', expected: 'PN16' },
  { input: null, expected: 'PN16' },
  { input: undefined, expected: 'PN16' },
];

const NB_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200];

console.log('='.repeat(80));
console.log('COMPREHENSIVE FLANGE WEIGHT TEST');
console.log('='.repeat(80));

// Test 1: Normalization
console.log('\n[TEST 1] Pressure Class Normalization');
console.log('-'.repeat(60));

let normErrors = 0;
for (const test of TEST_DESIGNATIONS) {
  const result = normalizePressureClass(test.input);
  const passed = result === test.expected;
  if (!passed) {
    normErrors++;
    console.log(`❌ "${test.input}" -> "${result}" (expected: "${test.expected}")`);
  } else {
    console.log(`✓ "${test.input}" -> "${result}"`);
  }
}
console.log(`\nNormalization: ${TEST_DESIGNATIONS.length - normErrors}/${TEST_DESIGNATIONS.length} passed`);

// Test 2: Weight Lookup
console.log('\n[TEST 2] Weight Lookup for All NB Sizes');
console.log('-'.repeat(60));

const PRESSURE_CLASSES = ['PN10', 'PN16', 'PN25', 'PN40', 'PN64', 'Class 150', 'Class 300', 'Class 600'];
let lookupErrors = 0;
let lookupTotal = 0;

for (const pc of PRESSURE_CLASSES) {
  console.log(`\n${pc}:`);
  const weights = [];
  for (const nb of NB_SIZES) {
    lookupTotal++;
    const result = getFlangeWeight(nb, pc);
    if (!result.found) {
      lookupErrors++;
      console.log(`  ❌ ${nb}NB: ${result.weight}kg (FALLBACK: ${result.fallback})`);
    } else {
      weights.push(`${nb}=${result.weight}`);
    }
  }
  console.log(`  ✓ ${weights.join(', ')}`);
}

console.log(`\nWeight Lookup: ${lookupTotal - lookupErrors}/${lookupTotal} found directly`);

// Test 3: SABS Format Weight Lookup
console.log('\n[TEST 3] SABS Format (1600/3, 4000/3, etc.) Weight Lookup');
console.log('-'.repeat(60));

const SABS_FORMATS = ['1000/3', '1600/3', '2500/3', '4000/3', '6400/3'];
const TEST_NB_SIZES = [100, 200, 300, 500, 800];

for (const sabs of SABS_FORMATS) {
  const normalized = normalizePressureClass(sabs);
  console.log(`\n${sabs} (-> ${normalized}):`);
  for (const nb of TEST_NB_SIZES) {
    const result = getFlangeWeight(nb, sabs);
    const directResult = getFlangeWeight(nb, normalized);
    const match = result.weight === directResult.weight;
    console.log(`  ${nb}NB: ${result.weight}kg ${match ? '✓' : '❌ MISMATCH'}`);
  }
}

// Test 4: Override Scenario Test
console.log('\n[TEST 4] Override Scenario Test');
console.log('-'.repeat(60));
console.log('Simulating: User selects 4000/3 instead of recommended 1600/3');

const globalPressureClass = '1600/3';
const overridePressureClass = '4000/3';
const testNb = 500;

const globalResult = getFlangeWeight(testNb, globalPressureClass);
const overrideResult = getFlangeWeight(testNb, overridePressureClass);

console.log(`\n${testNb}NB Pipe with FBE (2 flanges):`);
console.log(`  Global (${globalPressureClass}): ${globalResult.weight}kg × 2 = ${globalResult.weight * 2}kg total`);
console.log(`  Override (${overridePressureClass}): ${overrideResult.weight}kg × 2 = ${overrideResult.weight * 2}kg total`);
console.log(`  Difference: ${(overrideResult.weight - globalResult.weight) * 2}kg`);

if (overrideResult.weight > globalResult.weight) {
  console.log('  ✓ Override correctly shows HIGHER weight for higher pressure class');
} else {
  console.log('  ❌ ERROR: Override weight should be higher!');
}

// Test 5: Summary Table
console.log('\n[TEST 5] Summary Table - Weight per Flange (kg)');
console.log('-'.repeat(60));

const summaryNb = [100, 200, 300, 400, 500, 600, 800, 1000];
console.log('\nNB      | PN10   | PN16   | PN25   | PN40   | PN64   | Cl.150 | Cl.300 | Cl.600');
console.log('-'.repeat(90));

for (const nb of summaryNb) {
  const row = [nb.toString().padEnd(7)];
  for (const pc of PRESSURE_CLASSES) {
    const result = getFlangeWeight(nb, pc);
    row.push(result.weight.toFixed(1).padStart(6));
  }
  console.log(row.join(' | '));
}

// Final Summary
console.log('\n');
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Normalization Tests: ${TEST_DESIGNATIONS.length - normErrors}/${TEST_DESIGNATIONS.length} passed`);
console.log(`Weight Lookup Tests: ${lookupTotal - lookupErrors}/${lookupTotal} found directly`);
console.log(`Total Errors: ${normErrors + lookupErrors}`);
console.log('='.repeat(80));

if (normErrors + lookupErrors === 0) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log(`\n❌ ${normErrors + lookupErrors} ERRORS FOUND`);
  process.exit(1);
}

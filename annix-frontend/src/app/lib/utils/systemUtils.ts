'use client';

/**
 * System number generation utilities
 */

/**
 * Generate unique RFQ reference number
 * Format: RFQ-YYYY-NNN (e.g., RFQ-2025-001)
 * @returns Generated RFQ number
 */
export function generateSystemReferenceNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  const sequence = String(timestamp % 1000 + randomNum).padStart(3, '0');
  
  return `RFQ-${year}-${sequence}`;
}

/**
 * Generate unique item number
 * Format: ITM-NNN (e.g., ITM-001)
 * @returns Generated item number
 */
export function generateItemNumber(): string {
  const timestamp = Date.now();
  const sequence = String(timestamp % 1000).padStart(3, '0');
  
  return `ITM-${sequence}`;
}

/**
 * Generate client item number based on customer name
 * Format: ABC-0001 where ABC is 3 letters from customer name
 * @param customerName - Customer/company name
 * @param itemIndex - Sequential item number (1-based)
 * @returns Generated client item number
 */
export function generateClientItemNumber(customerName: string, itemIndex: number): string {
  if (!customerName) {
    return `CLI-${String(itemIndex).padStart(4, '0')}`;
  }

  // Extract 3 letters from customer name
  // Priority: 1) First letter of each word, 2) First 3 consonants, 3) First 3 letters
  const words = customerName.toUpperCase().split(/\s+/).filter(word => word.length > 0);
  
  let prefix = '';
  
  if (words.length >= 3) {
    // Take first letter of first 3 words
    prefix = words.slice(0, 3).map(word => word[0]).join('');
  } else if (words.length === 2) {
    // Take first letter of each word + first consonant of first word
    const firstWord = words[0];
    const consonants = firstWord.split('').filter(char => 
      /[BCDFGHJKLMNPQRSTVWXYZ]/.test(char) && char !== firstWord[0]
    );
    prefix = words[0][0] + words[1][0] + (consonants[0] || firstWord[1] || 'X');
  } else {
    // Single word - take first 3 consonants, fallback to first 3 letters
    const word = words[0] || customerName.toUpperCase();
    const consonants = word.split('').filter(char => /[BCDFGHJKLMNPQRSTVWXYZ]/.test(char));
    if (consonants.length >= 3) {
      prefix = consonants.slice(0, 3).join('');
    } else {
      prefix = word.substring(0, 3).padEnd(3, 'X');
    }
  }

  // Ensure we have exactly 3 characters
  prefix = prefix.substring(0, 3).padEnd(3, 'X');
  
  const sequentialNumber = String(itemIndex).padStart(4, '0');
  return `${prefix}-${sequentialNumber}`;
}

/**
 * Auto-generate pipe description
 * @param nominalBore - Nominal bore in mm
 * @param schedule - Schedule number or wall thickness
 * @param wallThickness - Wall thickness in mm (if no schedule)
 * @param steelSpec - Steel specification name
 * @param workingPressure - Working pressure in bar
 * @returns Generated description
 */
export function generatePipeDescription(
  nominalBore?: number,
  schedule?: string,
  wallThickness?: number,
  steelSpec?: string,
  workingPressure?: number
): string {
  const nb = nominalBore || 'XX';
  const scheduleWT = schedule || (wallThickness ? `${wallThickness}WT` : 'XX');
  const pressure = workingPressure || 'XX';
  
  let description = `${nb}NB ${scheduleWT} Straight Pipe for ${pressure} Bar Pipeline`;
  
  if (steelSpec) {
    description += ` (${steelSpec})`;
  }
  
  return description;
}

/**
 * Calculate Schedule based on pressure and nominal bore using backend data
 * @param workingPressure - Working pressure in bar
 * @param nominalBore - Nominal bore in mm
 * @param steelSpecId - Steel specification ID (optional)
 * @returns Promise with recommended schedule
 */
export async function calculateScheduleFromPressureAndNB(
  workingPressure: number,
  nominalBore: number,
  steelSpecId?: number
): Promise<string> {
  try {
    // Validate inputs before making API call
    if (!nominalBore || nominalBore <= 0) {
      console.warn('Invalid nominal bore for API call:', nominalBore);
      throw new Error(`Invalid nominal bore: ${nominalBore}`);
    }
    
    if (!workingPressure || workingPressure <= 0) {
      console.warn('Invalid working pressure for API call:', workingPressure);
      throw new Error(`Invalid working pressure: ${workingPressure}`);
    }
    
    console.log('Calling pipe recommendation API with:', { 
      nominalBore, 
      workingPressure, 
      steelSpecId 
    });
    
    // Import API client dynamically to avoid circular dependencies
    const { masterDataApi } = await import('../api/client');
    
    // Convert bar to MPa (1 bar = 0.1 MPa)
    const pressureMpa = workingPressure * 0.1;
    
    const result = await masterDataApi.getRecommendedSpecs(
      nominalBore,
      pressureMpa,
      20, // Standard temperature
      steelSpecId
    );
    
    return result.schedule || `${result.wallThickness}mm WT`;
  } catch (error) {
    console.error('Error calculating schedule from API:', error);
    // Fallback to simplified logic
    if (workingPressure <= 10) return 'Sch10';
    if (workingPressure <= 25) return 'Sch20';
    if (workingPressure <= 40) return 'Sch40';
    if (workingPressure <= 100) return 'Sch80';
    return 'Sch160';
  }
}

/**
 * Calculate Wall Thickness based on pressure and nominal bore using backend data
 * @param workingPressure - Working pressure in bar
 * @param nominalBore - Nominal bore in mm
 * @param steelSpecId - Steel specification ID (optional)
 * @returns Promise with recommended wall thickness in mm
 */
export async function calculateWallThicknessFromPressureAndNB(
  workingPressure: number,
  nominalBore: number,
  steelSpecId?: number
): Promise<number> {
  try {
    // Import API client dynamically to avoid circular dependencies
    const { masterDataApi } = await import('../api/client');
    
    // Convert bar to MPa (1 bar = 0.1 MPa)
    const pressureMpa = workingPressure * 0.1;
    
    const result = await masterDataApi.getRecommendedSpecs(
      nominalBore,
      pressureMpa,
      20, // Standard temperature
      steelSpecId
    );
    
    return result.wallThickness;
  } catch (error) {
    console.error('Error calculating wall thickness from API:', error);
    // Fallback to simplified logic
    const baseFactor = nominalBore / 1000;
    
    if (workingPressure <= 10) return Math.max(3, Math.round(baseFactor * 5));
    if (workingPressure <= 25) return Math.max(5, Math.round(baseFactor * 8));
    if (workingPressure <= 40) return Math.max(6, Math.round(baseFactor * 12));
    if (workingPressure <= 100) return Math.max(8, Math.round(baseFactor * 16));
    return Math.max(12, Math.round(baseFactor * 24));
  }
}

/**
 * Calculate Quantity from Total Length
 * @param totalLengthMeters - Total length in meters
 * @param pipeLengthMm - Individual pipe length in mm
 * @returns Number of pipes required
 */
export function calculateQuantityFromTotalLength(
  totalLengthMeters: number,
  pipeLengthMm: number
): number {
  const pipeLengthMeters = pipeLengthMm / 1000;
  return Math.ceil(totalLengthMeters / pipeLengthMeters);
}

/**
 * Calculate Total Length from Quantity
 * @param quantity - Number of pipes
 * @param pipeLengthMm - Individual pipe length in mm
 * @returns Total length in meters
 */
export function calculateTotalLengthFromQuantity(
  quantity: number,
  pipeLengthMm: number
): number {
  const pipeLengthMeters = pipeLengthMm / 1000;
  return quantity * pipeLengthMeters;
}

/**
 * Handle bi-directional Quantity/Total Length updates
 * @param changedField - Which field was changed ('quantity' or 'totalLength')
 * @param value - New value
 * @param pipeLengthMm - Individual pipe length in mm
 * @returns Object with updated quantity and total length
 */
export function updateQuantityOrTotalLength(
  changedField: 'quantity' | 'totalLength',
  value: number,
  pipeLengthMm: number
): { quantity: number; totalLength: number } {
  if (changedField === 'quantity') {
    return {
      quantity: value,
      totalLength: calculateTotalLengthFromQuantity(value, pipeLengthMm)
    };
  } else {
    return {
      quantity: calculateQuantityFromTotalLength(value, pipeLengthMm),
      totalLength: value
    };
  }
}

/**
 * Get steel specification based on working conditions using backend data
 * @param workingPressure - Working pressure in bar
 * @param workingTemp - Working temperature in Celsius
 * @param nominalBore - Nominal bore in mm (optional)
 * @returns Promise with steel specification object
 */
export async function getSteelSpecFromConditions(
  workingPressure: number,
  workingTemp: number,
  nominalBore?: number
): Promise<{ id: number; name: string }> {
  try {
    // Import API client dynamically to avoid circular dependencies
    const { masterDataApi } = await import('../api/client');
    
    // Convert bar to MPa (1 bar = 0.1 MPa)
    const pressureMpa = workingPressure * 0.1;
    
    const result = await masterDataApi.getRecommendedSpecs(
      nominalBore || 100, // Default NB if not provided
      pressureMpa,
      workingTemp
    );
    
    return {
      id: result.pipeDimension.steelSpecification.id,
      name: result.pipeDimension.steelSpecification.steelSpecName
    };
  } catch (error) {
    console.error('Error getting steel spec from API:', error);
    // Fallback logic
    let specName = 'ASTM A53 Gr B';
    if (workingTemp > 400) {
      specName = 'ASTM A335 P11';
    } else if (workingTemp > 250) {
      specName = 'ASTM A335 P5';
    } else if (workingPressure > 100) {
      specName = 'ASTM A106 Gr B';
    }
    
    return { id: 1, name: specName };
  }
}

/**
 * Get available flange classes for selected standard using backend data
 * @param flangeStandardId - Flange standard ID
 * @returns Promise with available flange classes
 */
export async function getAvailableFlangeClasses(flangeStandardId: number): Promise<Array<{ id: number; designation: string }>> {
  try {
    // Import API client dynamically to avoid circular dependencies
    const { masterDataApi } = await import('../api/client');
    
    const classes = await masterDataApi.getFlangePressureClasses();
    
    // Filter classes by standard if needed (check if standard property exists and matches)
    return classes.filter(cls => !cls.standard || cls.standard.id === flangeStandardId);
  } catch (error) {
    console.error('Error getting flange classes from API:', error);
    // Fallback mapping
    const flangeClassMap: Record<number, Array<{ id: number; designation: string }>> = {
      1: [ // SABS 1123
        { id: 4, designation: 'PN 10' },
        { id: 5, designation: 'PN 16' },
        { id: 6, designation: 'PN 25' }
      ],
      2: [ // ANSI B16.5
        { id: 1, designation: 'Class 150' },
        { id: 2, designation: 'Class 300' },
        { id: 3, designation: 'Class 600' }
      ],
      3: [ // DIN EN 1092
        { id: 4, designation: 'PN 10' },
        { id: 5, designation: 'PN 16' },
        { id: 6, designation: 'PN 25' }
      ]
    };

    return flangeClassMap[flangeStandardId] || [];
  }
}

/**
 * Get wall thickness for a given nominal bore and schedule
 * @param nominalBoreMm - Nominal bore in mm
 * @param scheduleNumber - Schedule designation
 * @returns Promise with wall thickness in mm
 */
export async function getWallThicknessForSchedule(nominalBoreMm: number, scheduleNumber: string): Promise<number | null> {
  try {
    // Import API client dynamically to avoid circular dependencies
    const { masterDataApi } = await import('../api/client');
    
    const pipeDimensions = await masterDataApi.getPipeDimensions(nominalBoreMm);
    
    // Find the dimension with matching schedule
    const dimension = pipeDimensions.find(d => 
      d.scheduleDesignation === scheduleNumber || 
      d.scheduleNumber?.toString() === scheduleNumber
    );
    
    return dimension?.wallThicknessMm || null;
  } catch (error) {
    console.error('Error getting wall thickness from API:', error);
    return null;
  }
}

/**
 * Get pipe end configuration details including weld count
 * @param configCode - Pipe end configuration code (PE, FOE, FBE, etc.)
 * @returns Promise with configuration details and weld count
 */
export async function getPipeEndConfigurationDetails(configCode: string): Promise<{ weldCount: number; description: string } | null> {
  try {
    // Import API client dynamically
    const { masterDataApi } = await import('../api/client');
    
    const response = await masterDataApi.getPipeEndConfigurationByCode(configCode);
    
    return {
      weldCount: response.weldCount || 0,
      description: response.description || ''
    };
  } catch (error) {
    console.error('Error getting pipe end configuration:', error);
    
    // Fallback mapping based on requirements
    const configMap: Record<string, { weldCount: number; description: string }> = {
      'PE': { weldCount: 0, description: 'Plain ended - no welds' },
      'FOE': { weldCount: 0, description: 'Flanged one end - no welds' },
      'FBE': { weldCount: 2, description: 'Flanged both ends - 2 flange welds' },
      'FOE_LF': { weldCount: 1, description: 'FOE + loose flange - 1 flange weld' },
      'FOE_RF': { weldCount: 2, description: 'FOE + rotating flange - 2 flange welds' },
      '2X_RF': { weldCount: 2, description: '2x rotating flanges - 2 flange welds' }
    };
    
    return configMap[configCode] || null;
  }
}
'use client';

import React, { useState, useEffect } from 'react';
import { 
  generateClientItemNumber, 
  generateSystemReferenceNumber 
} from '@/app/lib/utils/systemUtils';
import { masterDataApi, bendRfqApi } from '@/app/lib/api/client';

// Types
interface BendEntry {
  id: string;
  description?: string;
  clientItemNumber?: string;
  specs: {
    nominalBoreMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    bendType?: string; // '1.5D', '2D', '3D', '5D'
    bendDegrees?: number; // 45, 90, etc.
    numberOfTangents?: number;
    tangentLengths?: number[]; // Array for multiple tangents
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    quantityValue: number;
    quantityType: 'number_of_items';
    workingPressureBar?: number;
    workingTemperatureC?: number;
    useGlobalFlangeSpecs?: boolean;
  };
  calculation?: any;
}

interface BendRfqFormData {
  projectName: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  requiredDate: string;
  notes: string;
  globalSpecs: {
    workingPressureBar?: number;
    workingTemperatureC?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
  };
  bendEntries: BendEntry[];
}

interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
}

const bendTypes = ['1D', '1.5D', '2D', '3D', '5D'];

export default function MultiStepBendRfqForm({ onSuccess, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [masterData, setMasterData] = useState<any>({
    steelSpecs: [],
    flangeStandards: [],
    pressureClasses: [],
  });
  const [bendOptionsCache, setBendOptionsCache] = useState<Record<string, { nominalBores: number[]; degrees: number[] }>>({});

  const [formData, setFormData] = useState<BendRfqFormData>({
    projectName: 'Bend Pipeline Project',
    description: 'Pipeline bends and elbows for system installation',
    customerName: 'Acme Industrial Solutions',
    customerEmail: 'procurement@acme-industrial.co.za',
    customerPhone: '+27 11 555 0123',
    requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'All bends to be fabricated according to ASME B16.49',
    globalSpecs: {
      workingPressureBar: 16,
      workingTemperatureC: 120,
      steelSpecificationId: 2,
    },
    bendEntries: [],
  });

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        // You'll need to implement these API calls or use existing ones
        setMasterData({
          steelSpecs: [
            { id: 1, steelSpecName: 'ASTM A106 Grade A' },
            { id: 2, steelSpecName: 'ASTM A106 Grade B' },
            { id: 3, steelSpecName: 'ASTM A53 Grade B' },
          ],
          flangeStandards: [
            { id: 1, code: 'ASME B16.5' },
            { id: 2, code: 'EN 1092-1' },
          ],
          pressureClasses: [
            { id: 1, designation: 'Class 150' },
            { id: 2, designation: 'Class 300' },
            { id: 3, designation: 'Class 600' },
          ],
        });
      } catch (error) {
        console.error('Failed to load master data:', error);
      }
    };

    loadMasterData();
  }, []);

  // Fetch bend options (nominal bores and degrees) for a bend type
  const fetchBendOptions = async (bendType: string) => {
    // Return cached data if available
    if (bendOptionsCache[bendType]) {
      return bendOptionsCache[bendType];
    }

    try {
      const options = await masterDataApi.getBendOptions(bendType);
      
      // Cache the result
      setBendOptionsCache(prev => ({
        ...prev,
        [bendType]: options
      }));
      
      return options;
    } catch (error) {
      console.error(`Error fetching bend options for ${bendType}:`, error);
      return { nominalBores: [], degrees: [] };
    }
  };

  // Helper function to recommend pressure class based on working pressure (in bar)
  const getRecommendedPressureClass = (workingPressureBar: number, pressureClasses: any[]) => {
    if (!workingPressureBar || !pressureClasses.length) return null;

    // Extract numeric value from designation
    const classesWithRating = pressureClasses.map(pc => {
      const match = pc.designation?.match(/^(\d+)/);
      const rating = match ? parseInt(match[1]) : 0;
      return { ...pc, rating };
    }).filter(pc => pc.rating > 0);

    if (classesWithRating.length === 0) return null;

    // Sort by rating ascending
    classesWithRating.sort((a, b) => a.rating - b.rating);

    // Find the lowest rating that meets or exceeds the working pressure
    // Simplified: rating / 14.5 ≈ bar (rough approximation)
    const recommended = classesWithRating.find(pc => (pc.rating / 14.5) >= workingPressureBar);
    
    return recommended || classesWithRating[classesWithRating.length - 1]; // Return highest if none match
  };

  // Auto-select flange specifications based on item-level operating conditions
  const autoSelectFlangeSpecs = async (entryId: string, workingPressureBar: number, flangeStandardId?: number) => {
    if (!workingPressureBar || !flangeStandardId) return;

    try {
      // Fetch pressure classes for the standard and get recommendation
      const classes = await masterDataApi.getFlangePressureClassesByStandard(flangeStandardId);
      
      if (classes.length > 0) {
        const recommended = getRecommendedPressureClass(workingPressureBar, classes);
        
        if (recommended) {
          // Update the entry with recommended pressure class
          setFormData(prev => ({
            ...prev,
            bendEntries: prev.bendEntries.map(entry =>
              entry.id === entryId
                ? {
                    ...entry,
                    specs: {
                      ...entry.specs,
                      flangePressureClassId: recommended.id,
                      autoSelectedPressureClass: true
                    }
                  }
                : entry
            )
          }));

          console.log(`Auto-selected pressure class ${recommended.designation} for ${workingPressureBar} bar`);
        }
      }
    } catch (error) {
      console.error('Error auto-selecting flange specs:', error);
    }
  };

  const updateField = (field: keyof BendRfqFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addBendEntry = () => {
    const newEntry: BendEntry = {
      id: Date.now().toString(),
      description: '40NB 90° Bend',
      clientItemNumber: generateClientItemNumber(formData.customerName, formData.bendEntries.length + 1),
      specs: {
        nominalBoreMm: 40,
        scheduleNumber: '40',
        bendType: '1.5D',
        bendDegrees: 90,
        numberOfTangents: 2,
        tangentLengths: [150, 150],
        quantityValue: 1,
        quantityType: 'number_of_items',
        workingPressureBar: formData.globalSpecs.workingPressureBar,
        workingTemperatureC: formData.globalSpecs.workingTemperatureC,
        steelSpecificationId: formData.globalSpecs.steelSpecificationId,
        useGlobalFlangeSpecs: true,
      },
    };

    setFormData(prev => ({
      ...prev,
      bendEntries: [...prev.bendEntries, newEntry],
    }));

    return newEntry.id;
  };

  const updateBendEntry = (id: string, updates: Partial<BendEntry>) => {
    setFormData(prev => ({
      ...prev,
      bendEntries: prev.bendEntries.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }));
  };

  const removeBendEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      bendEntries: prev.bendEntries.filter(entry => entry.id !== id),
    }));
  };

  const calculateBend = async (entryId: string) => {
    setLoading(true);
    try {
      const entry = formData.bendEntries.find(e => e.id === entryId);
      if (!entry) return;

      const calculationData = {
        nominalBoreMm: entry.specs.nominalBoreMm || 100,
        scheduleNumber: entry.specs.scheduleNumber || '40',
        bendDegrees: entry.specs.bendDegrees || 90,
        bendType: entry.specs.bendType || '1.5D',
        quantityValue: entry.specs.quantityValue || 1,
        quantityType: 'number_of_items' as const,
        numberOfTangents: entry.specs.numberOfTangents || 1,
        tangentLengths: entry.specs.tangentLengths || [400],
        workingPressureBar: entry.specs.workingPressureBar || 10,
        workingTemperatureC: entry.specs.workingTemperatureC || 20,
        steelSpecificationId: entry.specs.steelSpecificationId || 2,
        useGlobalFlangeSpecs: true,
      };

      const result = await bendRfqApi.calculate(calculationData);

      updateBendEntry(entryId, {
        calculation: result,
      });

    } catch (error) {
      console.error('Bend calculation failed:', error);
      alert('Bend calculation failed. Please check your specifications.');
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = () => {
    let stepErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1:
        if (!formData.projectName.trim()) {
          stepErrors.projectName = 'Project name is required';
        }
        if (!formData.customerName.trim()) {
          stepErrors.customerName = 'Customer name is required';
        }
        if (!formData.customerEmail.trim()) {
          stepErrors.customerEmail = 'Customer email is required';
        }
        break;
      case 2:
        // Global specs validation (optional for bends)
        break;
      case 3:
        if (formData.bendEntries.length === 0) {
          stepErrors.bendEntries = 'Please add at least one bend item';
        }
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { bendRfqApi } = await import('@/app/lib/api/client');
      
      // Transform form data to API format
      const firstBendEntry = formData.bendEntries[0];
      if (!firstBendEntry) {
        throw new Error('No bend entries found');
      }

      const rfqData = {
        rfq: {
          projectName: formData.projectName,
          description: formData.description,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          requiredDate: formData.requiredDate,
          status: 'draft' as const,
          notes: formData.notes,
        },
        bend: {
          nominalBoreMm: firstBendEntry.specs.nominalBoreMm || 40,
          scheduleNumber: firstBendEntry.specs.scheduleNumber || 'Sch40',
          bendType: firstBendEntry.specs.bendType || '1.5D',
          bendDegrees: firstBendEntry.specs.bendDegrees || 90,
          numberOfTangents: firstBendEntry.specs.numberOfTangents || 0,
          tangentLengths: firstBendEntry.specs.tangentLengths || [],
          quantityValue: firstBendEntry.specs.quantityValue || 1,
          quantityType: 'number_of_items' as const,
          workingPressureBar: firstBendEntry.specs.workingPressureBar || formData.globalSpecs.workingPressureBar || 10,
          workingTemperatureC: firstBendEntry.specs.workingTemperatureC || formData.globalSpecs.workingTemperatureC || 20,
          steelSpecificationId: firstBendEntry.specs.steelSpecificationId || formData.globalSpecs.steelSpecificationId || 2,
          useGlobalFlangeSpecs: firstBendEntry.specs.useGlobalFlangeSpecs ?? true,
          ...(firstBendEntry.specs.flangeStandardId && { flangeStandardId: firstBendEntry.specs.flangeStandardId }),
          ...(firstBendEntry.specs.flangePressureClassId && { flangePressureClassId: firstBendEntry.specs.flangePressureClassId }),
        },
        itemDescription: firstBendEntry.description || 'Bend RFQ Item',
        itemNotes: undefined, // BendEntry doesn't have notes field
      };

      const response = await bendRfqApi.create(rfqData);
      onSuccess(response.rfq.rfqNumber);
      
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit bend RFQ. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Project Details', description: 'Basic project information', completed: currentStep > 1 },
    { number: 2, title: 'Global Specs', description: 'Working conditions', completed: currentStep > 2 },
    { number: 3, title: 'Bend Items', description: 'Bend specifications', completed: currentStep > 3 },
    { number: 4, title: 'Review & Submit', description: 'Final review', completed: false },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        {/* Vertical Side Navigation */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-bold text-gray-900">
                Create Bend RFQ
              </h1>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Vertical Progress Steps */}
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            <nav className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`relative flex items-start p-3 rounded-lg transition-all ${
                    step.number === currentStep
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : step.completed
                      ? 'bg-green-50 border-2 border-green-500'
                      : 'bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  {/* Step Number/Checkmark */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.number === currentStep
                        ? 'bg-blue-600 text-white'
                        : step.completed
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {step.completed ? '✓' : step.number}
                  </div>

                  {/* Step Content */}
                  <div className="ml-4 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        step.number === currentStep
                          ? 'text-blue-900'
                          : step.completed
                          ? 'text-green-900'
                          : 'text-gray-600'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${
                        step.number === currentStep
                          ? 'text-blue-700'
                          : step.completed
                          ? 'text-green-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Active Indicator */}
                  {step.number === currentStep && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Navigation Buttons */}
          <div className="px-4 py-3 border-t border-gray-200 space-y-2">
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit RFQ'}
              </button>
            )}
            <button
              onClick={prevStep}
              disabled={currentStep === 1 || loading}
              className="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
            >
              ← Previous Step
            </button>
          </div>
        </div>

        {/* Main Content Area - FULL WIDTH */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-5">
        {/* Step 1: Project Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Details</h2>
              <p className="text-gray-600 mb-6">
                Provide basic information about your bend RFQ project.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => updateField('projectName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errors.projectName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Pipeline Bend Fabrication"
                />
                {errors.projectName && (
                  <p className="mt-1 text-sm text-red-600">{errors.projectName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errors.customerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Acme Industrial Solutions"
                />
                {errors.customerName && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => updateField('customerEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    errors.customerEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="procurement@company.com"
                />
                {errors.customerEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="+27 11 555 0123"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Describe the bend requirements, location, special specifications..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Delivery Date
              </label>
              <input
                type="date"
                value={formData.requiredDate}
                onChange={(e) => updateField('requiredDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Any special requirements, fabrication standards, testing requirements..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Global Specifications */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Global Specifications
                <span className="ml-2 text-base font-normal text-gray-600">(Optional - Can be specified per item)</span>
              </h2>
              <p className="text-gray-600 mb-6">
                Set default specifications that will apply to all bend items. Item-level values take priority.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Pressure (bar)
                </label>
                <input
                  type="number"
                  value={formData.globalSpecs.workingPressureBar || ''}
                  onChange={(e) => updateField('globalSpecs', {
                    ...formData.globalSpecs,
                    workingPressureBar: parseFloat(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., 16"
                  min="0"
                  step="0.1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to specify per item. Item-level values take priority.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Temperature (°C)
                </label>
                <input
                  type="number"
                  value={formData.globalSpecs.workingTemperatureC || ''}
                  onChange={(e) => updateField('globalSpecs', {
                    ...formData.globalSpecs,
                    workingTemperatureC: parseFloat(e.target.value) || 20
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., 120"
                  step="1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to specify per item. Item-level values take priority.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Steel Specification
                </label>
                <select
                  value={formData.globalSpecs.steelSpecificationId || ''}
                  onChange={(e) => updateField('globalSpecs', {
                    ...formData.globalSpecs,
                    steelSpecificationId: parseInt(e.target.value) || undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select steel specification</option>
                  {masterData.steelSpecs?.map((spec: any) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.steelSpecName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flange Standard
                </label>
                <select
                  value={formData.globalSpecs.flangeStandardId || ''}
                  onChange={(e) => updateField('globalSpecs', {
                    ...formData.globalSpecs,
                    flangeStandardId: parseInt(e.target.value) || undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select flange standard</option>
                  {masterData.flangeStandards?.map((standard: any) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Bend Items */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Bend Items</h2>
                <p className="text-gray-600 mt-2">
                  Add the specific bend items you need for your project.
                </p>
              </div>
              <button
                onClick={addBendEntry}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Bend Item
              </button>
            </div>

            {errors.bendEntries && (
              <p className="text-red-600 text-sm">{errors.bendEntries}</p>
            )}

            <div className="space-y-4">
              {formData.bendEntries.map((entry, index) => (
                <div key={entry.id} className="border border-gray-300 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Bend Item {index + 1}
                    </h3>
                    <button
                      onClick={() => removeBendEntry(entry.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nominal Bore (mm)
                      </label>
                      <select
                        value={entry.specs.nominalBoreMm || ''}
                        onChange={(e) => updateBendEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            nominalBoreMm: parseInt(e.target.value) || undefined
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select NB</option>
                        {entry.specs.bendType && bendOptionsCache[entry.specs.bendType]?.nominalBores?.length > 0 ? (
                          // Use dynamic options from API
                          bendOptionsCache[entry.specs.bendType].nominalBores.map((nb: number) => (
                            <option key={nb} value={nb}>{nb}NB</option>
                          ))
                        ) : (
                          // Fallback options
                          [40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 900, 1000, 1050, 1100, 1150, 1200].map((nb: number) => (
                            <option key={nb} value={nb}>{nb}NB</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Schedule
                      </label>
                      <select
                        value={entry.specs.scheduleNumber || ''}
                        onChange={(e) => updateBendEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            scheduleNumber: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select Schedule</option>
                        <option value="10">Sch 10</option>
                        <option value="40">Sch 40</option>
                        <option value="80">Sch 80</option>
                        <option value="160">Sch 160</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bend Type
                      </label>
                      <select
                        value={entry.specs.bendType || ''}
                        onChange={async (e) => {
                          const bendType = e.target.value;
                          updateBendEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              bendType: bendType
                            }
                          });
                          
                          // Fetch options for this bend type
                          if (bendType) {
                            await fetchBendOptions(bendType);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select Bend Type</option>
                        {bendTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bend Angle (degrees)
                      </label>
                      <select
                        value={entry.specs.bendDegrees || ''}
                        onChange={(e) => updateBendEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            bendDegrees: parseFloat(e.target.value) || undefined
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="">Select Angle</option>
                        {entry.specs.bendType && bendOptionsCache[entry.specs.bendType]?.degrees?.length > 0 ? (
                          // Use dynamic options from API
                          bendOptionsCache[entry.specs.bendType].degrees.map((deg: number) => (
                            <option key={deg} value={deg}>{deg}°</option>
                          ))
                        ) : (
                          // Fallback options
                          [15, 22.5, 30, 45, 60, 90].map((angle: number) => (
                            <option key={angle} value={angle}>{angle}°</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={entry.specs.quantityValue || ''}
                        onChange={(e) => updateBendEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            quantityValue: parseInt(e.target.value) || 1
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        min="1"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {/* Operating Conditions - Item Level */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-semibold text-amber-900 mb-3">Operating Conditions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Working Pressure (bar) *
                        </label>
                        <input
                          type="number"
                          value={entry.specs.workingPressureBar || ''}
                          onChange={async (e) => {
                            const pressure = parseFloat(e.target.value) || 10;
                            updateBendEntry(entry.id, {
                              specs: { ...entry.specs, workingPressureBar: pressure }
                            });
                            
                            // Auto-select flange specifications based on pressure
                            const flangeStandardId = entry.specs.flangeStandardId || formData.globalSpecs.flangeStandardId;
                            if (pressure > 0 && flangeStandardId) {
                              setTimeout(() => {
                                autoSelectFlangeSpecs(entry.id, pressure, flangeStandardId);
                              }, 300);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                          min="0"
                          step="0.1"
                          placeholder="10"
                        />
                        <p className="mt-0.5 text-xs text-gray-500">
                          Auto-selects recommended flange pressure class
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Working Temperature (°C) *
                        </label>
                        <input
                          type="number"
                          value={entry.specs.workingTemperatureC || ''}
                          onChange={(e) => {
                            const temperature = parseFloat(e.target.value) || 20;
                            updateBendEntry(entry.id, {
                              specs: { ...entry.specs, workingTemperatureC: temperature }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900"
                          min="-200"
                          max="1000"
                          step="1"
                          placeholder="20"
                        />
                        <p className="mt-0.5 text-xs text-gray-500">
                          Operating temperature for specification selection
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end mt-4">
                    <button
                      onClick={() => calculateBend(entry.id)}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {loading ? 'Calculating...' : 'Calculate'}
                    </button>
                  </div>

                  {entry.calculation && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Calculation Results:</h4>
                      
                      {/* Main metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Weight</div>
                          <div className="text-2xl font-bold text-gray-900 mt-1">{entry.calculation.totalWeight?.toFixed(1)} kg</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Center-to-Face</div>
                          <div className="text-2xl font-bold text-gray-900 mt-1">{entry.calculation.centerToFaceDimension?.toFixed(1)} mm</div>
                        </div>
                      </div>

                      {/* Weight breakdown */}
                      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Weight Breakdown:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Bend:</span>
                            <span className="font-medium text-gray-900">{entry.calculation.bendWeight?.toFixed(1) || '0'} kg</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Tangent:</span>
                            <span className="font-medium text-gray-900">{entry.calculation.tangentWeight?.toFixed(1) || '0'} kg</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-600">Flange:</span>
                            <span className="font-medium text-gray-900">{entry.calculation.flangeWeight?.toFixed(1) || '0'} kg</span>
                          </div>
                        </div>
                      </div>

                      {/* Technical details */}
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Technical Details:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Outside Diameter</span>
                            <span className="font-medium text-gray-900">{entry.calculation.outsideDiameterMm?.toFixed(1) || '0'} mm</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Wall Thickness</span>
                            <span className="font-medium text-gray-900">{entry.calculation.wallThicknessMm?.toFixed(2) || '0'} mm</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Flanges</span>
                            <span className="font-medium text-gray-900">{entry.calculation.numberOfFlanges || 0}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase tracking-wide">Weld Length</span>
                            <span className="font-medium text-gray-900">{((entry.calculation.totalFlangeWeldLength || 0) + (entry.calculation.totalButtWeldLength || 0)).toFixed(2)} m</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {formData.bendEntries.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p>No bend items added yet.</p>
                  <p className="text-sm">Click "Add Bend Item" to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Submit</h2>
              <p className="text-gray-600 mb-6">
                Please review your bend RFQ details before submitting.
              </p>
            </div>

            {/* Project Summary */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Project Name</p>
                  <p className="font-medium text-gray-900">{formData.projectName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium text-gray-900">{formData.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact Email</p>
                  <p className="font-medium text-gray-900">{formData.customerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Required Date</p>
                  <p className="font-medium text-gray-900">{formData.requiredDate || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Bend Items Summary */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bend Items Summary</h3>
              <div className="space-y-4">
                {formData.bendEntries.map((entry, index) => (
                  <div key={entry.id} className="p-4 bg-white rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-lg">
                          {entry.specs.nominalBoreMm}NB {entry.specs.bendDegrees}° {entry.specs.bendType} Bend
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {entry.description}
                        </p>
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">Total Weight: </span>
                          <span className="font-medium text-gray-900">{entry.calculation?.totalWeight?.toFixed(1) || '0'} kg</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Item specifications */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Quantity</span>
                        <p className="font-medium text-gray-900">{entry.specs.quantityValue}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Schedule</span>
                        <p className="font-medium text-gray-900">{entry.specs.scheduleNumber}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Tangents</span>
                        <p className="font-medium text-gray-900">{entry.specs.numberOfTangents}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Pressure</span>
                        <p className="font-medium text-gray-900">{entry.specs.workingPressureBar} bar</p>
                      </div>
                    </div>

                    {/* Calculation results if available */}
                    {entry.calculation && (
                      <div className="border-t pt-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Calculation Summary:</h5>
                        
                        {/* Key metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="text-lg font-bold text-blue-600">{entry.calculation.totalWeight?.toFixed(1)} kg</div>
                            <div className="text-xs text-gray-600">Total Weight</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">{entry.calculation.centerToFaceDimension?.toFixed(1)} mm</div>
                            <div className="text-xs text-gray-600">Center-to-Face</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <div className="text-lg font-bold text-purple-600">{entry.calculation.numberOfFlanges || 0}</div>
                            <div className="text-xs text-gray-600">Flanges</div>
                          </div>
                        </div>

                        {/* Weight breakdown */}
                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-600">Bend:</span>
                            <span className="ml-2 font-medium text-gray-900">{entry.calculation.bendWeight?.toFixed(1) || '0'} kg</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Tangents:</span>
                            <span className="ml-2 font-medium text-gray-900">{entry.calculation.tangentWeight?.toFixed(1) || '0'} kg</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Flanges:</span>
                            <span className="ml-2 font-medium text-gray-900">{entry.calculation.flangeWeight?.toFixed(1) || '0'} kg</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show if no calculation yet */}
                    {!entry.calculation && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                          ⚠️ Calculation not performed yet. Go back to step 3 to calculate this bend.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {formData.bendEntries.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No bend items added</p>
                )}
              </div>
            </div>

            {/* Project Totals */}
            {formData.bendEntries.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Totals</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formData.bendEntries.reduce((total, entry) => 
                        total + (entry.calculation?.totalWeight || 0), 0).toFixed(1)} kg
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Weight</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formData.bendEntries.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.max(...formData.bendEntries.map(entry => entry.calculation?.leadTimeDays || 0), 0)} days
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Max Lead Time</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {formData.notes && (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
              </div>
            )}
          </div>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
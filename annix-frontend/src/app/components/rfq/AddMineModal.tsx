'use client';

import React, { useState, useEffect } from 'react';
import { minesApi, Commodity, CreateSaMineDto, SaMine } from '@/app/lib/api/client';
import GoogleMapLocationPicker from '@/app/components/GoogleMapLocationPicker';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// South African provinces
const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

interface AddMineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMineCreated: (mine: SaMine) => void;
}

export default function AddMineModal({ isOpen, onClose, onMineCreated }: AddMineModalProps) {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoadingCommodities, setIsLoadingCommodities] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateSaMineDto>({
    mineName: '',
    operatingCompany: '',
    commodityId: 0,
    province: '',
    district: '',
    physicalAddress: '',
    mineType: 'Underground',
    operationalStatus: 'Active',
    latitude: undefined,
    longitude: undefined,
  });

  // Track which fields were auto-filled from map
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Fetch commodities on mount
  useEffect(() => {
    if (isOpen) {
      fetchCommodities();
    }
  }, [isOpen]);

  const fetchCommodities = async () => {
    setIsLoadingCommodities(true);
    try {
      const data = await minesApi.getCommodities();
      setCommodities(data);
    } catch (err) {
      console.error('Failed to fetch commodities:', err);
      setError('Failed to load commodity options');
    } finally {
      setIsLoadingCommodities(false);
    }
  };

  const handleInputChange = (field: keyof CreateSaMineDto, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove from auto-filled when manually edited
    setAutoFilledFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(field);
      return newSet;
    });
  };

  const handleLocationSelect = (locationData: {
    lat: number;
    lng: number;
    address?: string;
    region?: string;
    country?: string;
  }) => {
    const updates: Partial<CreateSaMineDto> = {
      latitude: locationData.lat,
      longitude: locationData.lng,
    };
    const newAutoFilled = new Set<string>(['latitude', 'longitude']);

    if (locationData.address) {
      updates.physicalAddress = locationData.address;
      newAutoFilled.add('physicalAddress');
    }

    // Try to match region to SA province
    if (locationData.region) {
      const matchedProvince = SA_PROVINCES.find(
        p => p.toLowerCase() === locationData.region?.toLowerCase() ||
             locationData.region?.toLowerCase().includes(p.toLowerCase())
      );
      if (matchedProvince) {
        updates.province = matchedProvince;
        newAutoFilled.add('province');
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
    setAutoFilledFields(prev => new Set([...prev, ...newAutoFilled]));
    setShowMapPicker(false);
  };

  const validateForm = (): string | null => {
    if (!formData.mineName.trim()) return 'Mine name is required';
    if (!formData.operatingCompany.trim()) return 'Operating company is required';
    if (!formData.commodityId) return 'Please select a commodity';
    if (!formData.province) return 'Province is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const newMine = await minesApi.createMine(formData);
      onMineCreated(newMine);
      // Reset form
      setFormData({
        mineName: '',
        operatingCompany: '',
        commodityId: 0,
        province: '',
        district: '',
        physicalAddress: '',
        mineType: 'Underground',
        operationalStatus: 'Active',
        latitude: undefined,
        longitude: undefined,
      });
      setAutoFilledFields(new Set());
    } catch (err) {
      console.error('Failed to create mine:', err);
      setError('Failed to create mine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Mine</h2>
              <p className="text-sm text-gray-500">Enter mine details or use map to locate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Quick Location Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Use Google Maps to Locate Mine
            </button>
            <p className="mt-1 text-xs text-gray-500 text-center">
              Click to open map and select the mine location - fields will auto-fill
            </p>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-gray-500">or enter details manually</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Mine Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Mine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.mineName}
                onChange={(e) => handleInputChange('mineName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 ${
                  autoFilledFields.has('mineName') ? 'bg-amber-50 border-amber-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Sishen Mine"
              />
            </div>

            {/* Operating Company */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Operating Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.operatingCompany}
                onChange={(e) => handleInputChange('operatingCompany', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
                placeholder="e.g., Anglo American"
              />
            </div>

            {/* Commodity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Commodity <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.commodityId || ''}
                onChange={(e) => handleInputChange('commodityId', e.target.value ? Number(e.target.value) : 0)}
                disabled={isLoadingCommodities}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
              >
                <option value="">Select a commodity...</option>
                {commodities.map((commodity) => (
                  <option key={commodity.id} value={commodity.id}>
                    {commodity.commodityName}
                  </option>
                ))}
              </select>
            </div>

            {/* Province */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.province}
                onChange={(e) => handleInputChange('province', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 ${
                  autoFilledFields.has('province') ? 'bg-amber-50 border-amber-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a province...</option>
                {SA_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              {autoFilledFields.has('province') && (
                <p className="mt-1 text-xs text-amber-600">Auto-filled from map location</p>
              )}
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                District
              </label>
              <input
                type="text"
                value={formData.district || ''}
                onChange={(e) => handleInputChange('district', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
                placeholder="e.g., John Taolo Gaetsewe"
              />
            </div>

            {/* Physical Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Physical Address
              </label>
              <textarea
                value={formData.physicalAddress || ''}
                onChange={(e) => handleInputChange('physicalAddress', e.target.value)}
                rows={2}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 ${
                  autoFilledFields.has('physicalAddress') ? 'bg-amber-50 border-amber-300' : 'border-gray-300'
                }`}
                placeholder="Full address of the mine"
              />
              {autoFilledFields.has('physicalAddress') && (
                <p className="mt-1 text-xs text-amber-600">Auto-filled from map location</p>
              )}
            </div>

            {/* Mine Type & Operational Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Mine Type
                </label>
                <select
                  value={formData.mineType}
                  onChange={(e) => handleInputChange('mineType', e.target.value as CreateSaMineDto['mineType'])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
                >
                  <option value="Underground">Underground</option>
                  <option value="Open Cast">Open Cast</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Operational Status
                </label>
                <select
                  value={formData.operationalStatus}
                  onChange={(e) => handleInputChange('operationalStatus', e.target.value as CreateSaMineDto['operationalStatus'])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
                >
                  <option value="Active">Active</option>
                  <option value="Care and Maintenance">Care and Maintenance</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0000001"
                  value={formData.latitude ?? ''}
                  onChange={(e) => handleInputChange('latitude', e.target.value ? Number(e.target.value) : undefined)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 ${
                    autoFilledFields.has('latitude') ? 'bg-amber-50 border-amber-300' : 'border-gray-300'
                  }`}
                  placeholder="-26.20227"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0000001"
                  value={formData.longitude ?? ''}
                  onChange={(e) => handleInputChange('longitude', e.target.value ? Number(e.target.value) : undefined)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 ${
                    autoFilledFields.has('longitude') ? 'bg-amber-50 border-amber-300' : 'border-gray-300'
                  }`}
                  placeholder="28.04363"
                />
              </div>
            </div>
            {(autoFilledFields.has('latitude') || autoFilledFields.has('longitude')) && (
              <p className="text-xs text-amber-600">Coordinates auto-filled from map location</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Mine
                </>
              )}
            </button>
          </div>
        </form>

        {/* Google Maps Modal */}
        {showMapPicker && (
          <GoogleMapLocationPicker
            apiKey={GOOGLE_MAPS_API_KEY}
            config="responsive"
            initialLocation={
              formData.latitude && formData.longitude
                ? { lat: formData.latitude, lng: formData.longitude }
                : { lat: -28.4793, lng: 24.6727 } // Center of South Africa
            }
            onLocationSelect={handleLocationSelect}
            onClose={() => setShowMapPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

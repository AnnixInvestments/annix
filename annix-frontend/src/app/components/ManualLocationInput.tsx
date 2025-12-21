"use client";

import React, { useState } from "react";

interface Location {
  lat: number;
  lng: number;
}

interface AddressComponents {
  address: string;
  region: string;
  country: string;
}

interface ManualLocationInputProps {
  onLocationSelect: (location: Location, addressComponents?: AddressComponents) => void;
  onClose: () => void;
}

export default function ManualLocationInput({ onLocationSelect, onClose }: ManualLocationInputProps) {
  const [manualAddress, setManualAddress] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      const location: Location = { lat, lng };
      const addressComponents: AddressComponents = {
        address: manualAddress,
        region: "",
        country: ""
      };
      onLocationSelect(location, addressComponents);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border-2 border-blue-200">
      <h3 className="text-lg font-semibold text-blue-700 mb-4">Manual Location Entry</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address (optional)
          </label>
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="Enter project address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude *
            </label>
            <input
              type="number"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="-26.20227"
              step="any"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude *
            </label>
            <input
              type="number"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="28.04363"
              step="any"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded mb-4">
          <p className="text-blue-700 text-sm">
            <strong>Example:</strong> Johannesburg, South Africa<br />
            Latitude: -26.20227, Longitude: 28.04363
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Use Location
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

interface Location {
  lat: number;
  lng: number;
}

interface AddressComponents {
  address: string;
  region: string;
  country: string;
}

interface GoogleMapLocationPickerProps {
  initialLocation?: Location;
  onLocationSelect: (location: Location, addressComponents?: AddressComponents) => void;
  onClose: () => void;
  apiKey: string;
}

const containerStyle = {
  width: "100%",
  height: "400px"
};

const defaultCenter: Location = {
  lat: -26.20227,
  lng: 28.04363
};

const libraries: ("places" | "geocoding")[] = ["places", "geocoding"];

export default function GoogleMapLocationPicker({
  initialLocation,
  onLocationSelect,
  onClose,
  apiKey
}: GoogleMapLocationPickerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    initialLocation || null
  );
  const [addressInfo, setAddressInfo] = useState<AddressComponents | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const reverseGeocode = useCallback(async (location: Location) => {
    if (!window.google) return;

    setIsGeocoding(true);
    const geocoder = new google.maps.Geocoder();

    try {
      const response = await geocoder.geocode({ location });

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        let address = result.formatted_address || "";
        let region = "";
        let country = "";

        for (const component of result.address_components) {
          if (component.types.includes("administrative_area_level_1")) {
            region = component.long_name;
          }
          if (component.types.includes("country")) {
            country = component.long_name;
          }
        }

        setAddressInfo({ address, region, country });
      }
    } catch {
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const location: Location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setSelectedLocation(location);
      reverseGeocode(location);
    }
  }, [reverseGeocode]);

  const handleConfirmLocation = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation, addressInfo || undefined);
    }
  }, [selectedLocation, addressInfo, onLocationSelect]);

  const handleUseCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedLocation(location);
          reverseGeocode(location);
          if (mapRef.current) {
            mapRef.current.panTo(location);
            mapRef.current.setZoom(14);
          }
        },
        () => {
          alert("Unable to get your current location. Please enable location services or select a location on the map.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, [reverseGeocode]);

  useEffect(() => {
    if (initialLocation && isLoaded) {
      reverseGeocode(initialLocation);
    }
  }, [initialLocation, isLoaded, reverseGeocode]);

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Map Loading Error</h3>
          <p className="text-gray-600 mb-4">Unable to load Google Maps. Please check your API key configuration.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading Google Maps...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Project Location</h3>
            <p className="text-sm text-gray-600">Click on the map to pin your project location</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={initialLocation || defaultCenter}
            zoom={initialLocation ? 14 : 6}
            onClick={handleMapClick}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: false
            }}
          >
            {selectedLocation && (
              <Marker
                position={selectedLocation}
                animation={google.maps.Animation.DROP}
              />
            )}
          </GoogleMap>

          <button
            onClick={handleUseCurrentLocation}
            className="absolute top-3 right-3 bg-white px-3 py-2 rounded-lg shadow-md hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200"
            title="Use my current location"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Use My Location
          </button>
        </div>

        {selectedLocation && (
          <div className="p-4 border-t bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-xs font-medium text-gray-500 mb-1">Coordinates</div>
                <div className="text-sm font-semibold text-gray-900">
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-xs font-medium text-gray-500 mb-1">Address</div>
                <div className="text-sm text-gray-900">
                  {isGeocoding ? (
                    <span className="flex items-center gap-2 text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Looking up address...
                    </span>
                  ) : addressInfo?.address || "Click to get address"}
                </div>
              </div>
            </div>

            {addressInfo && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs font-medium text-gray-500 mb-1">Region</div>
                  <div className="text-sm text-gray-900">{addressInfo.region || "—"}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs font-medium text-gray-500 mb-1">Country</div>
                  <div className="text-sm text-gray-900">{addressInfo.country || "—"}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation}
            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
              selectedLocation
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

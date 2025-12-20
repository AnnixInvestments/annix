"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import { GoogleMapDisplayConfig, GOOGLE_MAP_PRESETS, GoogleMapPreset } from "@/app/config/googleMapsConfig";

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
  config?: GoogleMapPreset | GoogleMapDisplayConfig;
}

const defaultCenter: Location = {
  lat: -26.20227,
  lng: 28.04363
};

const libraries: ("places" | "geocoding")[] = ["places", "geocoding"];

function resolveConfig(config?: GoogleMapPreset | GoogleMapDisplayConfig): GoogleMapDisplayConfig {
  if (!config) {
    return GOOGLE_MAP_PRESETS.default;
  }

  if (typeof config === 'string') {
    return GOOGLE_MAP_PRESETS[config];
  }

  return config;
}

export default function GoogleMapLocationPicker({
  initialLocation,
  onLocationSelect,
  onClose,
  apiKey,
  config
}: GoogleMapLocationPickerProps) {
  const displayConfig = resolveConfig(config);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    initialLocation || null
  );
  const [addressInfo, setAddressInfo] = useState<AddressComponents | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const containerStyle = {
    width: "100%",
    height: `${displayConfig.mapHeight || 400}px`,
    minHeight: displayConfig.layout === 'responsive' ? `${displayConfig.mapHeight || 250}px` : undefined
  };

const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (!place.geometry || !place.geometry.location) {
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }

      const location: Location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };

      setSelectedLocation(location);

      if (place.geometry.viewport) {
        mapRef.current?.fitBounds(place.geometry.viewport);
      } else {
        mapRef.current?.setCenter(location);
        mapRef.current?.setZoom(17);
      }

      let address = place.formatted_address || "";
      let region = "";
      let country = "";

      if (place.address_components) {
        for (const component of place.address_components) {
          if (component.types.includes("administrative_area_level_1")) {
            region = component.long_name;
          }
          if (component.types.includes("country")) {
            country = component.long_name;
          }
        }
      }

      setAddressInfo({ address, region, country });
    }
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
      setIsGettingLocation(true);
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
          setIsGettingLocation(false);
        },
        () => {
          setIsGettingLocation(false);
          alert("Unable to get your current location. Please enable location services or select a location on the map.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  const outerContainerClass = displayConfig.layout === 'responsive'
    ? "bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] md:max-h-[95vh] flex flex-col md:h-auto"
    : "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden";

  const addressInfoClass = displayConfig.layout === 'responsive'
    ? `p-4 border-t bg-gray-50 overflow-y-auto max-h-[${displayConfig.addressInfoMaxHeight || 200}px]`
    : "p-4 border-t bg-gray-50";

  const mapContainerClass = displayConfig.layout === 'responsive'
    ? "flex-1 overflow-hidden flex flex-col min-h-0 relative"
    : "relative";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={displayConfig.containerClassName || outerContainerClass}>
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Project Location</h3>
            <p className="text-sm text-gray-600">
              {displayConfig.layout === 'responsive'
                ? "Search for an address or click on the map to pin your project location"
                : "Click on the map to pin your project location"}
            </p>
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

        <div className={mapContainerClass}>
          <div className="absolute top-3 left-3 right-3 z-10">
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
                options={{
                  fields: ["formatted_address", "geometry", "name", "address_components"],
                  types: ["address"]
                }}
              >
                <input
                  type="text"
                  placeholder="Search for a location..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: "100%" }}
                />
              </Autocomplete>
            </div>
          </div>

          <GoogleMap
            mapContainerStyle={containerStyle}
            center={initialLocation || defaultCenter}
            zoom={initialLocation ? 14 : 6}
            onClick={handleMapClick}
            onLoad={onMapLoad}
options={{
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: false,
              clickableIcons: false
            }}
          >
            {selectedLocation && (
              <Marker
                position={selectedLocation}
                animation={google.maps.Animation.DROP}
              />
            )}
          </GoogleMap>

          {/* Geolocation Button */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className={`absolute top-16 right-3 z-10 px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium border transition-colors ${
              isGettingLocation
                ? "bg-blue-100 text-blue-600 border-blue-300 cursor-wait"
                : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
            }`}
            title="Use my current location"
          >
            {isGettingLocation ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Getting location...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                  <circle cx="12" cy="12" r="8" strokeWidth={2} />
                </svg>
                My Location
              </>
            )}
          </button>
        </div>

        {selectedLocation && (
          <div className={addressInfoClass}>
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
                  {displayConfig.showGeocodingLoader !== false && isGeocoding ? (
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

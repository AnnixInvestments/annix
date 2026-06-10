"use client";

import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { isString, keys } from "es-toolkit/compat";
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer } from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GOOGLE_MAP_PRESETS,
  GoogleMapDisplayConfig,
  GoogleMapPreset,
} from "@/app/config/googleMapsConfig";
import { useAlert } from "@/app/lib/hooks/useAlert";
import ManualLocationInput from "./ManualLocationInput";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

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
  lng: 28.04363,
};

const libraries: "places"[] = ["places"];

const osmTileLayers = {
  streets: {
    label: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  terrain: {
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    maxZoom: 17,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  detailed: {
    label: "Detailed",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
} as const;

type OsmTileLayerKey = keyof typeof osmTileLayers;

interface OsmSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    state?: string;
    province?: string;
    region?: string;
    country?: string;
  };
}

function resolveConfig(config?: GoogleMapPreset | GoogleMapDisplayConfig): GoogleMapDisplayConfig {
  if (!config) {
    return GOOGLE_MAP_PRESETS.default;
  }

  if (isString(config)) {
    return GOOGLE_MAP_PRESETS[config];
  }

  return config;
}

function OpenStreetMapLocationPicker(props: {
  initialLocation?: Location;
  onLocationSelect: (location: Location, addressComponents?: AddressComponents) => void;
  onClose: () => void;
  displayConfig: GoogleMapDisplayConfig;
}) {
  const { initialLocation, onLocationSelect, onClose, displayConfig } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    initialLocation || null,
  );
  const [addressInfo, setAddressInfo] = useState<AddressComponents | null>(null);
  const [mapStyle, setMapStyle] = useState<OsmTileLayerKey>("streets");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OsmSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const updateAddressFromResult = (result: OsmSearchResult) => {
    const address = result.address;
    const state = address ? address.state : undefined;
    const province = address ? address.province : undefined;
    const region = address ? address.region : undefined;
    const country = address ? address.country : undefined;
    setAddressInfo({
      address: result.display_name,
      region: state || province || region || "",
      country: country || "",
    });
  };

  const reverseLookupAddress = async (location: Location) => {
    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        lat: String(location.lat),
        lon: String(location.lng),
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      if (!response.ok) return;
      const result = (await response.json()) as OsmSearchResult;
      if (result.display_name) {
        updateAddressFromResult(result);
      }
    } catch {}
  };

  const updateMarker = async (location: Location, zoom?: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng]);
    } else {
      const L = await import("leaflet");
      markerRef.current = L.marker([location.lat, location.lng]).addTo(map);
    }
    if (zoom) {
      map.setView([location.lat, location.lng], zoom);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;

    const initMap = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const startLocation = selectedLocation || defaultCenter;
      const map = L.map(mapContainerRef.current, {
        center: [startLocation.lat, startLocation.lng],
        zoom: selectedLocation ? 14 : 6,
      });

      const currentLayer = osmTileLayers.streets;
      tileLayerRef.current = L.tileLayer(currentLayer.url, {
        attribution: currentLayer.attribution,
        maxZoom: currentLayer.maxZoom,
      }).addTo(map);

      const placeMarker = (location: Location) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([location.lat, location.lng]);
          return;
        }
        markerRef.current = L.marker([location.lat, location.lng]).addTo(map);
      };

      if (selectedLocation) {
        placeMarker(selectedLocation);
      }

      map.on("click", (event) => {
        const location = {
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        };
        setSelectedLocation(location);
        placeMarker(location);
        void reverseLookupAddress(location);
      });

      mapInstanceRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 150);
    };

    void initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    let cancelled = false;
    const setLayer = async () => {
      const L = await import("leaflet");
      if (cancelled || !mapInstanceRef.current) return;
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }
      const nextLayer = osmTileLayers[mapStyle];
      tileLayerRef.current = L.tileLayer(nextLayer.url, {
        attribution: nextLayer.attribution,
        maxZoom: nextLayer.maxZoom,
      }).addTo(mapInstanceRef.current);
    };
    void setLayer();
    return () => {
      cancelled = true;
    };
  }, [mapStyle]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          limit: "6",
          q: query,
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setSearchResults([]);
          return;
        }
        const results = (await response.json()) as OsmSearchResult[];
        setSearchResults(results);
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearchResultSelect = (result: OsmSearchResult) => {
    const location = {
      lat: Number(result.lat),
      lng: Number(result.lon),
    };
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return;
    setSelectedLocation(location);
    updateAddressFromResult(result);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    void updateMarker(location, 16);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedLocation(location);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([location.lat, location.lng], 14);
        }
        void updateMarker(location);
        void reverseLookupAddress(location);
        setIsGettingLocation(false);
      },
      () => setIsGettingLocation(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const rawContainerClassName = displayConfig.containerClassName;
  const outerContainerClass =
    displayConfig.layout === "responsive"
      ? "bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] md:max-h-[95vh] flex flex-col md:h-auto"
      : "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden";
  const rawMapHeight = displayConfig.mapHeight;

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className={rawContainerClassName || outerContainerClass}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Select Location</h3>
            <p className="text-sm text-slate-700">
              Search for your address or click on the map to pin your location.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="relative">
          <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 sm:right-40">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search address, suburb, city, or area..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-950 shadow-lg placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(isSearching || searchResults.length > 0) && (
                <div className="absolute left-0 right-0 top-full mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-slate-600">Searching...</div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={result.place_id}
                        type="button"
                        onClick={() => handleSearchResultSelect(result)}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-800 last:border-b-0 hover:bg-blue-50"
                      >
                        {result.display_name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(keys(osmTileLayers) as OsmTileLayerKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMapStyle(key)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold shadow ${
                    mapStyle === key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {osmTileLayers[key].label}
                </button>
              ))}
            </div>
          </div>
          <div
            ref={mapContainerRef}
            className="w-full"
            style={{
              height: `${rawMapHeight || 400}px`,
              minHeight: displayConfig.layout === "responsive" ? "260px" : undefined,
            }}
          />
          <button
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="absolute bottom-3 right-3 z-[1000] px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium border bg-white text-slate-800 border-slate-200 hover:bg-blue-50 disabled:opacity-60"
          >
            {isGettingLocation ? "Getting location..." : "My Location"}
          </button>
        </div>
        {selectedLocation ? (
          <div className="p-4 border-t border-slate-300 bg-slate-100">
            <div className="bg-white p-3 rounded-lg border border-slate-300">
              <div className="text-xs font-medium text-slate-600 mb-1">Coordinates</div>
              <div className="text-sm font-semibold text-slate-950">
                {Number(selectedLocation.lat).toFixed(5)}, {Number(selectedLocation.lng).toFixed(5)}
              </div>
              {addressInfo?.address ? (
                <div className="mt-2 text-sm text-slate-700">{addressInfo.address}</div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-300 bg-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white border border-slate-600 rounded-lg hover:bg-slate-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              selectedLocation && onLocationSelect(selectedLocation, addressInfo || undefined)
            }
            disabled={!selectedLocation}
            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
              selectedLocation
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoogleMapLocationPicker(props: GoogleMapLocationPickerProps) {
  const { initialLocation, onLocationSelect, onClose, apiKey, config } = props;
  const { alert, AlertDialog } = useAlert();
  const displayConfig = resolveConfig(config);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualLat, setManualLat] = useState(initialLocation?.lat?.toString() || "");
  const [manualLng, setManualLng] = useState(initialLocation?.lng?.toString() || "");
  const [latError, setLatError] = useState<string | null>(null);
  const [lngError, setLngError] = useState<string | null>(null);
  const [hasGoogleMapsAuthError, setHasGoogleMapsAuthError] = useState(false);

  // Check if API key is missing or empty
  const isApiKeyMissing = !apiKey || apiKey.trim() === "";

  const [showManualInput, setShowManualInput] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    // Prevent hook error with placeholder
    googleMapsApiKey: apiKey || "placeholder",
    libraries,
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    initialLocation || null,
  );
  const [addressInfo, setAddressInfo] = useState<AddressComponents | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const invalidApiKey =
    !apiKey ||
    apiKey === "your_google_maps_api_key_here" ||
    apiKey === "test_key_replacement_needed";

  const rawMapHeight = displayConfig.mapHeight;
  const rawMapHeight2 = displayConfig.mapHeight;

  const containerStyle = {
    width: "100%",
    height: `${rawMapHeight || 400}px`,
    minHeight: displayConfig.layout === "responsive" ? `${rawMapHeight2 || 250}px` : undefined,
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

      if (!place.geometry?.location) {
        alert({ message: `No details available for input: '${place.name}'`, variant: "error" });
        return;
      }

      const location: Location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      setSelectedLocation(location);

      if (place.geometry.viewport) {
        mapRef.current?.fitBounds(place.geometry.viewport);
      } else {
        mapRef.current?.setCenter(location);
        mapRef.current?.setZoom(17);
      }

      const rawFormatted_address = place.formatted_address;

      const address = rawFormatted_address || "";
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
        const rawFormatted_address2 = result.formatted_address;
        const address = rawFormatted_address2 || "";
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

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const location: Location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        setSelectedLocation(location);
        reverseGeocode(location);
      }
    },
    [reverseGeocode],
  );

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
            lng: position.coords.longitude,
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
          alert({
            message:
              "Unable to get your current location. Please enable location services or select a location on the map.",
            variant: "error",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      alert({ message: "Geolocation is not supported by your browser.", variant: "error" });
    }
  }, [reverseGeocode]);

  useEffect(() => {
    if (initialLocation && isLoaded) {
      reverseGeocode(initialLocation);
    }
  }, [initialLocation, isLoaded, reverseGeocode]);

  useEffect(() => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      setHasGoogleMapsAuthError(true);
      previousAuthFailure?.();
    };
    return () => {
      window.gm_authFailure = previousAuthFailure;
    };
  }, []);

  const handleManualLocationSubmit = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    let hasError = false;
    setLatError(null);
    setLngError(null);

    if (Number.isNaN(lat)) {
      setLatError("Please enter a valid latitude value.");
      hasError = true;
    } else if (lat < -90 || lat > 90) {
      setLatError("Latitude must be between -90 and 90.");
      hasError = true;
    }

    if (Number.isNaN(lng)) {
      setLngError("Please enter a valid longitude value.");
      hasError = true;
    } else if (lng < -180 || lng > 180) {
      setLngError("Longitude must be between -180 and 180.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const location: Location = { lat, lng };
    onLocationSelect(location, undefined);
  }, [manualLat, manualLng, onLocationSelect]);

  if (invalidApiKey) {
    return (
      <OpenStreetMapLocationPicker
        initialLocation={initialLocation}
        onLocationSelect={onLocationSelect}
        onClose={onClose}
        displayConfig={displayConfig}
      />
    );
  }

  if (showManualInput) {
    return <ManualLocationInput onLocationSelect={onLocationSelect} onClose={onClose} />;
  }

  // Show manual entry form when requested or when API key is missing
  if (showManualEntry || isApiKeyMissing) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-semibold text-gray-900">
              {isApiKeyMissing ? "Google Maps Configuration Required" : "Enter Location Manually"}
            </h3>
            {isApiKeyMissing && (
              <p className="text-sm text-red-600 mt-1">
                A valid Google Maps API key is required to use the map feature. Please configure{" "}
                <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in
                your environment variables.
              </p>
            )}
          </div>

          <div className="p-5">
            <p className="text-sm text-gray-600 mb-4">
              Enter the latitude and longitude coordinates for your project location.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
                <input
                  type="number"
                  step="0.00001"
                  value={manualLat}
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    setLatError(null);
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    latError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="-26.20227"
                />
                {latError ? (
                  <p className="text-xs text-red-600 mt-1">{latError}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Range: -90 to 90</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
                <input
                  type="number"
                  step="0.00001"
                  value={manualLng}
                  onChange={(e) => {
                    setManualLng(e.target.value);
                    setLngError(null);
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    lngError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="28.04363"
                />
                {lngError ? (
                  <p className="text-xs text-red-600 mt-1">{lngError}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Range: -180 to 180</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mt-4 border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> You can find coordinates by searching for your location on{" "}
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  Google Maps
                </a>{" "}
                and right-clicking on the map to copy the coordinates.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleManualLocationSubmit}
              disabled={!manualLat || !manualLng}
              className={`px-5 py-2 rounded-lg font-medium flex items-center gap-2 ${
                manualLat && manualLng
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || hasGoogleMapsAuthError) {
    return (
      <OpenStreetMapLocationPicker
        initialLocation={initialLocation}
        onLocationSelect={onLocationSelect}
        onClose={onClose}
        displayConfig={displayConfig}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading Google Maps...</span>
          </div>
        </div>
      </div>
    );
  }

  const outerContainerClass =
    displayConfig.layout === "responsive"
      ? "bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] md:max-h-[95vh] flex flex-col md:h-auto"
      : "bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden";

  const rawAddressInfoMaxHeight = displayConfig.addressInfoMaxHeight;

  const addressInfoClass =
    displayConfig.layout === "responsive"
      ? `p-4 border-t bg-gray-50 overflow-y-auto max-h-[${rawAddressInfoMaxHeight || 200}px]`
      : "p-4 border-t bg-gray-50";

  const mapContainerClass =
    displayConfig.layout === "responsive"
      ? "flex-1 overflow-hidden flex flex-col min-h-0 relative"
      : "relative";

  const rawContainerClassName = displayConfig.containerClassName;
  const rawAddress = addressInfo?.address;
  const rawRegion = addressInfo?.region;
  const rawCountry = addressInfo?.country;

  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {AlertDialog}
      <div className={rawContainerClassName || outerContainerClass}>
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select Project Location</h3>
            <p className="text-sm text-gray-600 mb-2">
              {displayConfig.layout === "responsive"
                ? "Search for an address or click on the map to pin your project location"
                : "Click on the map to pin your project location"}
            </p>
            <button
              onClick={() => setShowManualInput(true)}
              className="text-blue-600 text-sm hover:text-blue-700 underline"
            >
              Or enter coordinates manually
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
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
                  types: ["address"],
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
              mapTypeControlOptions: {
                mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
                position: google.maps.ControlPosition.TOP_RIGHT,
                style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
              },
              fullscreenControl: false,
              clickableIcons: false,
            }}
          >
            {selectedLocation && (
              <Marker position={selectedLocation} animation={google.maps.Animation.DROP} />
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
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 2v4m0 12v4m10-10h-4M6 12H2"
                  />
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
                  {Number(selectedLocation.lat).toFixed(5)},{" "}
                  {Number(selectedLocation.lng).toFixed(5)}
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
                  ) : (
                    rawAddress || "Click to get address"
                  )}
                </div>
              </div>
            </div>

            {addressInfo && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs font-medium text-gray-500 mb-1">Region</div>
                  <div className="text-sm text-gray-900">{rawRegion || "—"}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="text-xs font-medium text-gray-500 mb-1">Country</div>
                  <div className="text-sm text-gray-900">{rawCountry || "—"}</div>
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}

import { isNumber } from "es-toolkit/compat";
import { memo } from "react";
import GoogleMapLocationPicker from "@/app/components/GoogleMapLocationPicker";
import { AutoFilledInput } from "@/app/components/rfq/shared/AutoFilledField";
import EnvironmentalIntelligenceSection from "@/app/components/rfq/steps/EnvironmentalIntelligenceSection";
import { GOOGLE_MAPS_API_KEY } from "./constants";
import type { ProjectDetailsLogic } from "./useProjectDetailsLogic";

interface ProjectLocationSectionProps {
  logic: ProjectDetailsLogic;
}

const ProjectLocationSectionInner = (props: ProjectLocationSectionProps) => {
  const {
    environmentalConfirmed,
    environmentalErrors,
    getMapConfig,
    handleConfirmEnvironmental,
    handleConfirmLocation,
    handleEditEnvironmental,
    handleEditLocation,
    handleLocationSelect,
    handleLocationUnavailableToggle,
    handleMineDropdownChange,
    hasRequiredEnvironmentalData,
    hasRequiredLocationData,
    hideRestrictionTooltip,
    isEditingEnvironmental,
    isEditingLocation,
    isEnvironmentalLocked,
    isLoadingEnvironmental,
    isLoadingMines,
    isLocationLocked,
    isUnregisteredCustomer,
    locationAutoFilled,
    locationConfirmed,
    locationSkipped,
    locationSummary,
    markAsOverridden,
    mineDataLoading,
    mines,
    onUpdate,
    rfqData,
    selectedMineId,
    setLocationAutoFilled,
    setShowMapPicker,
    showMapPicker,
    showRestrictionTooltip,
    skipEnvSuggestions,
    updateEnvironmentalField,
    useNix,
    wasAutoFilled,
    globalSpecs,
    onUpdateGlobalSpecs,
  } = props.logic;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Project Location
        </h4>
        <button
          type="button"
          onClick={() => setShowMapPicker(true)}
          disabled={isLocationLocked || locationSkipped}
          className={`flex items-center gap-2 px-4 py-2 text-white transition-colors text-sm font-medium shadow-sm rounded-lg ${
            isLocationLocked ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          Pick on Map
        </button>
      </div>

      {/* Location-not-available toggles */}
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(rfqData.locationNotKnown)}
            onChange={(e) => handleLocationUnavailableToggle("locationNotKnown", e.target.checked)}
            disabled={isLocationLocked}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          Location not known
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(rfqData.collectionOnly)}
            onChange={(e) => handleLocationUnavailableToggle("collectionOnly", e.target.checked)}
            disabled={isLocationLocked}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          Collection only (no delivery site)
        </label>
      </div>
      {locationSkipped && (
        <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            No project location — address fields are disabled and location-based surface-protection
            suggestions are switched off for this RFQ. Capture any required coating / lining on the
            Specifications step.
          </span>
        </div>
      )}

      {!isLocationLocked && (
        <>
          {/* SA Mines Dropdown - Compact */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Quick Select: SA Mine (auto-fills location & slurry)
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedMineId || ""}
                onChange={(e) => handleMineDropdownChange(e.target.value)}
                disabled={isLoadingMines || mineDataLoading || isLocationLocked || locationSkipped}
                style={{ colorScheme: "light", color: "#000000", backgroundColor: "#fef3c7" }}
                className="w-full px-2 py-1.5 border border-amber-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="" style={{ color: "#000000", backgroundColor: "#fef3c7" }}>
                  -- Select a mine (optional) --
                </option>
                <option
                  value="add-new"
                  style={{ color: "#b45309", backgroundColor: "#fef3c7" }}
                  className="font-medium"
                >
                  + Add a mine not listed
                </option>
                {mines.map((mine) => {
                  const rawCommodityName = mine.commodityName;

                  return (
                    <option
                      key={mine.id}
                      value={mine.id}
                      style={{ color: "#000000", backgroundColor: "#fef3c7" }}
                    >
                      {mine.mineName}- {mine.operatingCompany}({rawCommodityName || "Unknown"}) -{" "}
                      {mine.province}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {isLoadingMines || mineDataLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
            </div>
            {selectedMineId && (
              <div className="mt-1 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Location & slurry auto-filled
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 ml-6">
                  Environmental intelligence will be populated based on commodity type
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Latitude
              </label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.latitude}
                onChange={(val) => onUpdate("latitude", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, latitude: false }))}
                isAutoFilled={locationAutoFilled.latitude}
                placeholder="-26.20227 (≥5 decimal places)"
                readOnly={isLocationLocked}
                disabled={locationSkipped}
              />
              {!locationAutoFilled.latitude && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Precision required for environmental analysis
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Longitude
              </label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.longitude}
                onChange={(val) => onUpdate("longitude", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, longitude: false }))}
                isAutoFilled={locationAutoFilled.longitude}
                placeholder="28.04363 (≥5 decimal places)"
                readOnly={isLocationLocked}
                disabled={locationSkipped}
              />
            </div>
          </div>

          <div className="mb-4" data-nix-target="siteAddress">
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Site Address / Location Description
            </label>
            <AutoFilledInput
              type="text"
              value={rfqData.siteAddress}
              onChange={(val) => onUpdate("siteAddress", val)}
              onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, siteAddress: false }))}
              isAutoFilled={locationAutoFilled.siteAddress}
              placeholder="e.g., Secunda Refinery, Mpumalanga, South Africa"
              readOnly={isLocationLocked}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Region / Province
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.region}
                onChange={(val) => onUpdate("region", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, region: false }))}
                isAutoFilled={locationAutoFilled.region}
                placeholder="e.g., Gauteng, Western Cape"
                readOnly={isLocationLocked}
                disabled={locationSkipped}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Country
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.country}
                onChange={(val) => onUpdate("country", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, country: false }))}
                isAutoFilled={locationAutoFilled.country}
                placeholder="e.g., South Africa"
                readOnly={isLocationLocked}
                disabled={locationSkipped}
              />
            </div>
          </div>
        </>
      )}

      {/* Location Confirmation Button */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {!locationConfirmed ? (
          <button
            type="button"
            onClick={handleConfirmLocation}
            disabled={!hasRequiredLocationData()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Confirm Location Data
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Location Confirmed
            </div>
            {locationSummary && (
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-md">
                {locationSummary}
              </span>
            )}
            {!isEditingLocation ? (
              <button
                type="button"
                onClick={handleEditLocation}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium underline"
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmLocation}
                disabled={!hasRequiredLocationData()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-semibold"
              >
                Re-confirm Changes
              </button>
            )}
          </div>
        )}
        {!hasRequiredLocationData() && !locationConfirmed && (
          <p className="mt-2 text-sm text-amber-600">
            Please fill in all location fields to confirm this section.
          </p>
        )}
      </div>

      {showMapPicker && (
        <GoogleMapLocationPicker
          apiKey={GOOGLE_MAPS_API_KEY}
          config={getMapConfig()}
          initialLocation={
            isNumber(rfqData.latitude) &&
            isNumber(rfqData.longitude) &&
            Number.isFinite(rfqData.latitude) &&
            Number.isFinite(rfqData.longitude)
              ? { lat: rfqData.latitude, lng: rfqData.longitude }
              : undefined
          }
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {!useNix &&
        rfqData.requiredProducts?.includes("surface_protection") &&
        skipEnvSuggestions && (
          <div className="mt-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span>
              Surface-protection suggestions are switched off for this RFQ (no project location).
              Specify any required coating / lining manually on the Specifications step.
            </span>
          </div>
        )}

      {!useNix &&
        rfqData.requiredProducts?.includes("surface_protection") &&
        !skipEnvSuggestions && (
          <EnvironmentalIntelligenceSection
            globalSpecs={globalSpecs}
            rfqData={rfqData}
            isUnregisteredCustomer={isUnregisteredCustomer}
            isLoadingEnvironmental={isLoadingEnvironmental}
            environmentalErrors={environmentalErrors}
            environmentalConfirmed={environmentalConfirmed}
            isEditingEnvironmental={isEditingEnvironmental}
            isEnvironmentalLocked={isEnvironmentalLocked}
            wasAutoFilled={wasAutoFilled}
            markAsOverridden={markAsOverridden}
            updateEnvironmentalField={updateEnvironmentalField}
            onUpdateGlobalSpecs={onUpdateGlobalSpecs}
            onUpdate={onUpdate}
            handleConfirmEnvironmental={handleConfirmEnvironmental}
            handleEditEnvironmental={handleEditEnvironmental}
            hasRequiredEnvironmentalData={hasRequiredEnvironmentalData}
            showRestrictionTooltip={showRestrictionTooltip}
            hideRestrictionTooltip={hideRestrictionTooltip}
          />
        )}
    </div>
  );
};

export const ProjectLocationSection = memo(ProjectLocationSectionInner);

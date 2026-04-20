"use client";

import { isNumber, keys } from "es-toolkit/compat";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import GoogleMapLocationPicker from "@/app/components/GoogleMapLocationPicker";
import AddMineModal from "@/app/components/rfq/modals/AddMineModal";
import { AutoFilledInput } from "@/app/components/rfq/shared/AutoFilledField";
import EnvironmentalIntelligenceSection from "@/app/components/rfq/steps/EnvironmentalIntelligenceSection";
import RfqDocumentUpload from "@/app/components/rfq/uploads/RfqDocumentUpload";
import { useToast } from "@/app/components/Toast";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { minesApi, SaMine } from "@/app/lib/api/client";
import {
  isProductAvailableForUnregistered,
  isProductComingSoon,
  isProjectTypeAvailableForUnregistered,
  PRODUCTS_AND_SERVICES,
  PROJECT_TYPES,
} from "@/app/lib/config/productsServices";
import { generateUniqueId } from "@/app/lib/datetime";
import { useEnvironmentalIntelligence } from "@/app/lib/hooks/useEnvironmentalIntelligence";
import { log } from "@/app/lib/logger";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { generateSystemReferenceNumber } from "@/app/lib/utils/systemUtils";
import {
  buildFallbackEnvironmentalSpecs,
  FALLBACK_ENVIRONMENTAL_AUTO_FILLED_FIELDS,
  fallbackMines,
} from "./projectDetailsFallbackData";

interface RestrictionPopupPosition {
  x: number;
  y: number;
}

function RestrictionTooltip({ position }: { position: RestrictionPopupPosition }) {
  return (
    <div
      className="fixed z-50 bg-gray-900 dark:bg-gray-800 text-white rounded-md shadow-lg px-3 py-2 max-w-xs pointer-events-none"
      style={{
        left: Math.min(position.x, window.innerWidth - 280),
        top: position.y + 10,
      }}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-xs">
          Restricted feature.{" "}
          <Link href="/pricing" className="text-blue-400 hover:text-blue-300 underline">
            View pricing tiers
          </Link>
        </span>
      </div>
      <div
        className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"
        style={{ transform: "translateY(-50%) rotate(45deg)" }}
      />
    </div>
  );
}

const rawNEXT_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const GOOGLE_MAPS_API_KEY = rawNEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export type { PendingDocument } from "@/app/lib/store/rfqWizardStore";

export default function ProjectDetailsStep() {
  const nixStopUsing = useRfqWizardStore((s) => s.nixStopUsing);
  const nixProcessDocuments = useRfqWizardStore((s) => s.nixProcessDocuments);
  const isNixProcessing = useRfqWizardStore((s) => s.isNixProcessing);
  const rfqData = useRfqWizardStore((s) => s.rfqData) as any;
  const errors = useRfqWizardStore((s) => s.validationErrors);
  const pendingDocuments = useRfqWizardStore((s) => s.pendingDocuments);
  const pendingTenderDocuments = useRfqWizardStore((s) => s.pendingTenderDocuments);
  const onUpdate = useRfqWizardStore((s) => s.updateRfqField) as (
    field: string,
    value: any,
  ) => void;
  const onSetValidationError = useRfqWizardStore((s) => s.setValidationError);
  const onUpdateGlobalSpecs = useRfqWizardStore((s) => s.updateGlobalSpecs) as (specs: any) => void;
  const storeAddDocument = useRfqWizardStore((s) => s.addDocument);
  const onRemoveDocument = useRfqWizardStore((s) => s.removeDocument);
  const storeAddTenderDocument = useRfqWizardStore((s) => s.addTenderDocument);
  const { flags: featureFlags } = useFeatureFlags();
  const onRemoveTenderDocument = useRfqWizardStore((s) => s.removeTenderDocument);
  const globalSpecs = rfqData.globalSpecs;
  const useNix = rfqData.useNix;

  const onAddDocument = useCallback(
    (file: File) => {
      storeAddDocument({
        file,
        id: `doc-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    },
    [storeAddDocument],
  );

  const onAddTenderDocument = useCallback(
    (file: File) => {
      storeAddTenderDocument({
        file,
        id: `tender-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    },
    [storeAddTenderDocument],
  );
  const { showToast } = useToast();
  const [additionalNotes, setAdditionalNotes] = useState<string[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const hasProjectTypeError = Boolean(errors.projectType);

  const getMapConfig = () =>
    // eslint-disable-next-line no-restricted-syntax -- SSR guard
    typeof window !== "undefined" && window.innerWidth < 768 ? "responsive" : "default";

  // Document upload confirmation state
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [tenderDocumentsConfirmed, setTenderDocumentsConfirmed] = useState(false);
  const [showNoDocumentsPopup, setShowNoDocumentsPopup] = useState(false);
  const [showNoTenderDocumentsPopup, setShowNoTenderDocumentsPopup] = useState(false);

  // SA Mines state
  const [mines, setMines] = useState<SaMine[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<number | null>(null);
  const [isLoadingMines, setIsLoadingMines] = useState(false);
  const [mineDataLoading, setMineDataLoading] = useState(false);
  const [showAddMineModal, setShowAddMineModal] = useState(false);

  // Track which location fields were auto-filled from the map picker
  const [locationAutoFilled, setLocationAutoFilled] = useState<{
    latitude: boolean;
    longitude: boolean;
    siteAddress: boolean;
    region: boolean;
    country: boolean;
  }>({
    latitude: false,
    longitude: false,
    siteAddress: false,
    region: false,
    country: false,
  });

  // Section confirmation state - for locking data after user confirms
  const [projectTypeConfirmed, setProjectTypeConfirmed] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [environmentalConfirmed, setEnvironmentalConfirmed] = useState(false);

  // Edit mode state - for unlocking confirmed sections
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingEnvironmental, setIsEditingEnvironmental] = useState(false);

  // Environmental intelligence auto-fill
  const {
    isLoading: isLoadingEnvironmental,
    errors: environmentalErrors,
    autoFilledFields,
    metadata: environmentalMetadata,
    fetchAndApply: fetchEnvironmentalData,
    wasAutoFilled,
    markAsOverridden,
    markFieldsAsAutoFilled,
  } = useEnvironmentalIntelligence();

  const handleLocationSelect = async (
    location: { lat: number; lng: number },
    addressComponents?: { address: string; region: string; country: string },
  ) => {
    // Update location fields and mark as auto-filled
    onUpdate("latitude", location.lat);
    onUpdate("longitude", location.lng);

    // Track which fields are being auto-filled
    const newAutoFilled = {
      latitude: true,
      longitude: true,
      siteAddress: false,
      region: false,
      country: false,
    };

    if (addressComponents) {
      if (addressComponents.address) {
        onUpdate("siteAddress", addressComponents.address);
        newAutoFilled.siteAddress = true;
      }
      if (addressComponents.region) {
        onUpdate("region", addressComponents.region);
        newAutoFilled.region = true;
      }
      if (addressComponents.country) {
        onUpdate("country", addressComponents.country);
        newAutoFilled.country = true;
      }
    }

    setLocationAutoFilled(newAutoFilled);
    setShowMapPicker(false);

    // Fetch environmental data and auto-fill fields
    if (onUpdateGlobalSpecs) {
      try {
        log.debug("[Form] Fetching environmental data for:", location);
        const environmentalData = await fetchEnvironmentalData(
          location.lat,
          location.lng,
          addressComponents?.region,
          addressComponents?.country,
        );

        log.debug("[Form] Environmental data received:", environmentalData);
        log.debug("[Form] Current globalSpecs:", globalSpecs);

        // Update globalSpecs with environmental data
        const updatedSpecs = {
          ...globalSpecs,
          ...environmentalData,
        };
        log.debug("[Form] Updated globalSpecs:", updatedSpecs);
        onUpdateGlobalSpecs(updatedSpecs);
      } catch (error) {
        // Silently handle - user can still fill in manually
        if (error instanceof Error && error.message !== "Backend unavailable") {
          log.error("Failed to fetch environmental data:", error);
        }
      }
    }
  };

  const commonNotes = [
    "All pipes to be hydrostatically tested before delivery",
    "Material certificates required (EN 10204 3.1)",
    "Pipes to be supplied with protective end caps",
    "Delivery required to site in South Africa",
    "All flanges to be raised face (RF) unless specified",
    "Pipes to comply with SABS/SANS standards",
    "Mill test certificates required for all items",
    "Surface preparation: Shot blast to SA2.5 standard",
    "Urgent delivery required - please expedite",
    "Client inspection required before dispatch",
  ];

  // Handle mine selection
  const handleMineSelect = async (mineId: number | null) => {
    setSelectedMineId(mineId);

    if (!mineId) {
      return;
    }

    setMineDataLoading(true);
    try {
      // Fetch mine with environmental data (includes slurry profile and lining recommendation)
      const mineData = await minesApi.getMineWithEnvironmentalData(mineId);
      const { mine, slurryProfile, liningRecommendation } = mineData;

      // Auto-fill location fields
      if (mine.latitude && mine.longitude) {
        onUpdate("latitude", mine.latitude);
        onUpdate("longitude", mine.longitude);
      }
      if (mine.physicalAddress) {
        onUpdate("siteAddress", mine.physicalAddress);
      }
      if (mine.province) {
        onUpdate("region", mine.province);
      }
      onUpdate("country", "South Africa");

      // Mark location fields as auto-filled
      setLocationAutoFilled({
        latitude: !!mine.latitude,
        longitude: !!mine.longitude,
        siteAddress: !!mine.physicalAddress,
        region: !!mine.province,
        country: true,
      });

      // Auto-fill environmental intelligence from slurry profile
      if (slurryProfile && onUpdateGlobalSpecs) {
        const updatedSpecs = {
          ...globalSpecs,
          // Slurry characteristics from commodity profile
          mineSelected: mine.mineName,
          mineCommodity: slurryProfile.commodityName,
          slurryPHMin: slurryProfile.phMin,
          slurryPHMax: slurryProfile.phMax,
          slurrySGMin: slurryProfile.typicalSgMin,
          slurrySGMax: slurryProfile.typicalSgMax,
          slurrySolidsMin: slurryProfile.solidsConcentrationMin,
          slurrySolidsMax: slurryProfile.solidsConcentrationMax,
          slurryTempMin: slurryProfile.tempMin,
          slurryTempMax: slurryProfile.tempMax,
          abrasionRisk: slurryProfile.abrasionRisk,
          corrosionRisk: slurryProfile.corrosionRisk,
          primaryFailureMode: slurryProfile.primaryFailureMode,
        };

        // Add lining recommendation if available
        if (liningRecommendation) {
          updatedSpecs.recommendedLining = liningRecommendation.recommendedLining;
          updatedSpecs.recommendedCoating = liningRecommendation.recommendedCoating;
          updatedSpecs.liningApplicationNotes = liningRecommendation.applicationNotes;
        }

        // Also fetch environmental/weather data based on mine location
        if (mine.latitude && mine.longitude) {
          try {
            log.debug("[Mine Selection] Fetching environmental data for:", mine.mineName);
            const environmentalData = await fetchEnvironmentalData(
              mine.latitude,
              mine.longitude,
              mine.province,
              "South Africa",
            );
            log.debug("[Mine Selection] Environmental data received:", environmentalData);

            // Merge environmental data with slurry profile data
            Object.assign(updatedSpecs, environmentalData);
          } catch (error) {
            // Silently handle - user can still fill in manually
            if (error instanceof Error && error.message !== "Backend unavailable") {
              log.error("[Mine Selection] Failed to fetch environmental data:", error);
            }
          }
        }

        onUpdateGlobalSpecs(updatedSpecs);
      } else if (mine.latitude && mine.longitude && onUpdateGlobalSpecs) {
        // Even without slurry profile, fetch environmental data if we have coordinates
        try {
          log.debug(
            "[Mine Selection] Fetching environmental data (no slurry profile):",
            mine.mineName,
          );
          const environmentalData = await fetchEnvironmentalData(
            mine.latitude,
            mine.longitude,
            mine.province,
            "South Africa",
          );
          log.debug("[Mine Selection] Environmental data received:", environmentalData);
          onUpdateGlobalSpecs({
            ...globalSpecs,
            mineSelected: mine.mineName,
            ...environmentalData,
          });
        } catch (error) {
          // Silently handle - user can still fill in manually
          if (error instanceof Error && error.message !== "Backend unavailable") {
            log.error("[Mine Selection] Failed to fetch environmental data:", error);
          }
        }
      }

      log.debug("[Mine Selection] Auto-filled from mine:", mine.mineName);
    } catch (error) {
      // When backend is unavailable, use fallback mine data from local list
      const fallbackMine = fallbackMines.find((m) => m.id === mineId);
      if (fallbackMine) {
        log.debug("[Mine Selection] Using fallback data for:", fallbackMine.mineName);

        // Auto-fill location fields from fallback data
        if (fallbackMine.latitude && fallbackMine.longitude) {
          onUpdate("latitude", fallbackMine.latitude);
          onUpdate("longitude", fallbackMine.longitude);
        }
        if (fallbackMine.physicalAddress) {
          onUpdate("siteAddress", fallbackMine.physicalAddress);
        }
        if (fallbackMine.province) {
          onUpdate("region", fallbackMine.province);
        }
        onUpdate("country", "South Africa");

        // Mark location fields as auto-filled
        setLocationAutoFilled({
          latitude: !!fallbackMine.latitude,
          longitude: !!fallbackMine.longitude,
          siteAddress: !!fallbackMine.physicalAddress,
          region: !!fallbackMine.province,
          country: true,
        });

        if (onUpdateGlobalSpecs) {
          const updatedSpecs = buildFallbackEnvironmentalSpecs(fallbackMine, globalSpecs);
          onUpdateGlobalSpecs(updatedSpecs);
          markFieldsAsAutoFilled([...FALLBACK_ENVIRONMENTAL_AUTO_FILLED_FIELDS]);
          log.debug("[Mine Selection] Auto-filled with fallback data for:", fallbackMine.mineName);
        }
      } else if (error instanceof Error && error.message !== "Backend unavailable") {
        log.error("Failed to fetch mine environmental data:", error);
      }
    } finally {
      setMineDataLoading(false);
    }
  };

  // Handle new mine created from modal
  const handleMineCreated = (newMine: SaMine) => {
    // Add the new mine to the list
    setMines((prevMines) =>
      [...prevMines, newMine].sort((a, b) => a.mineName.localeCompare(b.mineName)),
    );
    // Select the newly created mine
    handleMineSelect(newMine.id);
    // Close the modal
    setShowAddMineModal(false);
  };

  // Handle mine dropdown change
  const handleMineDropdownChange = (value: string) => {
    if (value === "add-new") {
      setShowAddMineModal(true);
    } else {
      handleMineSelect(value ? Number(value) : null);
    }
  };

  useEffect(() => {
    const loadMines = async () => {
      setIsLoadingMines(true);
      try {
        const activeMines = await minesApi.getActiveMines();
        setMines(activeMines);
      } catch (error) {
        if (error instanceof Error && error.message !== "Backend unavailable") {
          log.error("Failed to fetch mines:", error);
        }
        setMines(fallbackMines);
      } finally {
        setIsLoadingMines(false);
      }
    };
    loadMines();
  }, []);

  // Auto-generate RFQ number if field is empty (but not when loading a draft)
  useEffect(() => {
    // Skip auto-generation if we're loading a draft - the draft will provide the projectName
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("draft") || urlParams.get("draftId") || urlParams.get("recover")) return;

    if (!rfqData.projectName || rfqData.projectName.trim() === "") {
      const autoGenNumber = generateSystemReferenceNumber();
      onUpdate("projectName", autoGenNumber);
    }
  }, []);

  const addNote = (note: string) => {
    if (note && !additionalNotes.includes(note)) {
      const newNotes = [...additionalNotes, note];
      setAdditionalNotes(newNotes);
      const rawNotes = rfqData.notes;
      const currentNotes = rawNotes || "";
      const updatedNotes = currentNotes ? `${currentNotes}\n• ${note}` : `• ${note}`;
      onUpdate("notes", updatedNotes);
    }
  };

  const removeNote = (noteToRemove: string) => {
    const newNotes = additionalNotes.filter((note) => note !== noteToRemove);
    setAdditionalNotes(newNotes);
    const updatedNotes = newNotes.length > 0 ? newNotes.map((note) => `• ${note}`).join("\n") : "";
    onUpdate("notes", updatedNotes);
  };

  // Helper to update environmental fields in globalSpecs (not rfqData)
  // This ensures they get saved properly since save function saves globalSpecs
  const updateEnvironmentalField = useCallback(
    (field: string, value: any) => {
      log.debug(`🌍 Environmental field updated: ${field} =`, value);
      if (onUpdateGlobalSpecs) {
        onUpdateGlobalSpecs({
          ...globalSpecs,
          [field]: value,
        });
      }
    },
    [globalSpecs, onUpdateGlobalSpecs],
  );

  // Validation helper functions
  const hasRequiredLocationData = () => {
    return !!(
      rfqData.latitude &&
      rfqData.longitude &&
      rfqData.siteAddress &&
      rfqData.region &&
      rfqData.country
    );
  };

  const hasRequiredEnvironmentalData = () => {
    const rawSoilTexture = globalSpecs?.soilTexture;
    const rawSoilMoistureClass = globalSpecs?.soilMoistureClass;
    const rawSoilDrainage = globalSpecs?.soilDrainage;
    // Soil Conditions - visible fields required
    const hasSoilData = !!(
      (rawSoilTexture || rfqData.soilTexture) &&
      (rawSoilMoistureClass || rfqData.soilMoistureClass) &&
      (rawSoilDrainage || rfqData.soilDrainage)
    );

    const rawAnnualRainfall = globalSpecs?.annualRainfall;

    // Atmospheric Conditions - only visible fields required
    const hasAtmosphericData = !!(
      (globalSpecs?.tempMin !== undefined || rfqData.tempMin !== undefined) &&
      (globalSpecs?.tempMax !== undefined || rfqData.tempMax !== undefined) &&
      globalSpecs?.humidityMean !== undefined &&
      (rawAnnualRainfall || rfqData.rainfall)
    );

    const rawDetailedMarineInfluence = globalSpecs?.detailedMarineInfluence;
    const rawFloodRisk = globalSpecs?.floodRisk;
    const rawEcpIndustrialPollution = globalSpecs?.ecpIndustrialPollution;

    // Marine & Special Conditions - visible dropdown fields required
    const hasMarineData = !!(
      (rawDetailedMarineInfluence || rfqData.marineInfluence) &&
      (rawFloodRisk || rfqData.floodingRisk) &&
      (rawEcpIndustrialPollution || rfqData.industrialPollution)
    );

    return hasSoilData && hasAtmosphericData && hasMarineData;
  };

  // Handlers for confirmation/edit
  const handleConfirmLocation = () => {
    if (hasRequiredLocationData()) {
      setLocationConfirmed(true);
      setIsEditingLocation(false);
    }
  };

  const handleConfirmEnvironmental = () => {
    if (hasRequiredEnvironmentalData()) {
      setEnvironmentalConfirmed(true);
      setIsEditingEnvironmental(false);
    }
  };

  const handleEditLocation = () => {
    setIsEditingLocation(true);
  };

  const handleEditEnvironmental = () => {
    setIsEditingEnvironmental(true);
  };

  // Customer auth for auto-filling customer fields (optional - may be used in admin context)
  const {
    isAuthenticated: isCustomerAuthenticated,
    isLoading: isCustomerAuthLoading,
    customer,
    profile,
  } = useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();

  // Unregistered customer restrictions - when not authenticated as customer or admin, limit available options
  // Don't apply restrictions while auth is still loading to prevent flash of restricted state
  const restrictUnregistered = !featureFlags || featureFlags["RFQ_RESTRICT_UNREGISTERED"] !== false;
  const isAuthLoading = isCustomerAuthLoading || isAdminAuthLoading;
  const isUnregisteredCustomer =
    !isAuthLoading && restrictUnregistered && !isCustomerAuthenticated && !isAdminAuthenticated;

  // Restriction popup state for unregistered customers
  const [restrictionPopup, setRestrictionPopup] = useState<RestrictionPopupPosition | null>(null);

  const showRestrictionTooltip = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRestrictionPopup({ x: e.clientX, y: e.clientY });
  }, []);

  const hideRestrictionTooltip = useCallback(() => {
    setRestrictionPopup(null);
  }, []);

  // Track which customer fields were auto-filled
  const [customerAutoFilled, setCustomerAutoFilled] = useState<{
    customerName: boolean;
    customerEmail: boolean;
    customerPhone: boolean;
  }>({
    customerName: false,
    customerEmail: false,
    customerPhone: false,
  });

  // Auto-fill customer fields when logged in (but not when loading a draft)
  useEffect(() => {
    // Skip auto-fill if we're loading a draft - the draft will provide customer info
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("draft") || urlParams.get("draftId")) return;

    if (isCustomerAuthenticated && profile) {
      const updates: { customerName?: boolean; customerEmail?: boolean; customerPhone?: boolean } =
        {};

      const rawFirstName = profile.firstName;

      // Auto-fill customer name if empty
      if (!rfqData.customerName && (rawFirstName || profile.lastName)) {
        const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
        onUpdate("customerName", fullName);
        updates.customerName = true;
      }

      // Auto-fill customer email if empty
      if (!rfqData.customerEmail && profile.email) {
        onUpdate("customerEmail", profile.email);
        updates.customerEmail = true;
      }

      const rawMobilePhone = profile.mobilePhone;

      // Auto-fill customer phone if empty (try mobilePhone, directPhone, or company primaryPhone)
      const phoneNumber = rawMobilePhone || profile.directPhone || profile.company?.primaryPhone;
      if (!rfqData.customerPhone && phoneNumber) {
        onUpdate("customerPhone", phoneNumber);
        updates.customerPhone = true;
      }

      if (keys(updates).length > 0) {
        setCustomerAutoFilled((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [
    isCustomerAuthenticated,
    profile,
    rfqData.customerName,
    rfqData.customerEmail,
    rfqData.customerPhone,
    onUpdate,
  ]);

  // Derived state for locked sections
  const isLocationLocked = locationConfirmed && !isEditingLocation;
  const isEnvironmentalLocked = environmentalConfirmed && !isEditingEnvironmental;

  const rawCustomerRfqReference = rfqData.customerRfqReference;
  const rawLength = pendingDocuments?.length;
  const rawLength2 = pendingDocuments?.length;
  const rawLength3 = pendingDocuments?.length;
  const rawLength4 = pendingDocuments?.length;
  const rawLength5 = pendingTenderDocuments?.length;
  const rawLength6 = pendingTenderDocuments?.length;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Project/RFQ Details</h2>
      {/* Nix AI Assistant Active Banner */}
      {useNix && (
        <div className="mb-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nix AI Assistant is Active</p>
                <p className="text-xs text-gray-600">
                  Nix will analyze your documents to auto-populate the RFQ form
                </p>
              </div>
            </div>
            {nixStopUsing && (
              <button
                type="button"
                onClick={nixStopUsing}
                className="text-sm text-orange-700 hover:text-orange-900 underline font-medium"
              >
                Stop using Nix
              </button>
            )}
          </div>
        </div>
      )}
      <div className="space-y-2">
        {/* Customer Information - Required fields */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Customer Information
            {isCustomerAuthenticated && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Logged in
              </span>
            )}
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div data-field="customerName" data-nix-target="customerName">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Name <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerName}
                onChange={(val) => onUpdate("customerName", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerName: false }))
                }
                isAutoFilled={customerAutoFilled.customerName}
                placeholder="Customer name"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div data-field="customerEmail" data-nix-target="customerEmail">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Email <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerEmail}
                onChange={(val) => onUpdate("customerEmail", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerEmail: false }))
                }
                isAutoFilled={customerAutoFilled.customerEmail}
                placeholder="email@example.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>
              )}
            </div>

            <div data-field="customerPhone" data-nix-target="customerPhone">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Customer Phone <span className="text-red-600">*</span>
              </label>
              <AutoFilledInput
                type="text"
                value={rfqData.customerPhone}
                onChange={(val) => onUpdate("customerPhone", val)}
                onOverride={() =>
                  setCustomerAutoFilled((prev) => ({ ...prev, customerPhone: false }))
                }
                isAutoFilled={customerAutoFilled.customerPhone}
                placeholder="+27 11 000 0123"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>
              )}
            </div>

            <div data-field="requiredDate" data-nix-target="requiredDate">
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Required Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={rfqData.requiredDate}
                onChange={(e) => onUpdate("requiredDate", e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                required
              />
              {errors.requiredDate && (
                <p className="mt-1 text-xs text-red-600">{errors.requiredDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Your RFQ Reference, Project Name, and Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div data-field="customerRfqReference">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Your RFQ Reference <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={rawCustomerRfqReference || ""}
              onChange={(e) => onUpdate("customerRfqReference", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="e.g., RFQ-2025-001"
            />
            {errors.customerRfqReference && (
              <p className="mt-1 text-xs text-red-600">{errors.customerRfqReference}</p>
            )}
          </div>
          <div data-field="projectName" data-nix-target="projectName">
            <label className="block text-xs font-semibold text-gray-900 mb-1">Project Name</label>
            <input
              type="text"
              value={rfqData.projectName}
              onChange={(e) => onUpdate("projectName", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Optional project name"
            />
          </div>
          <div data-field="description" data-nix-target="description">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              RFQ Description
            </label>
            <input
              type="text"
              value={rfqData.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Brief description of requirements"
            />
          </div>
        </div>

        {/* Project Type Selection - Compact */}
        <div
          data-field="projectType"
          data-nix-target="projectType"
          className={projectTypeConfirmed ? "opacity-75" : ""}
        >
          <label
            className={`block text-xs font-semibold mb-1 ${hasProjectTypeError ? "text-red-700" : "text-gray-900"}`}
          >
            Project Type <span className="text-red-600">*</span>
            {projectTypeConfirmed && (
              <span className="ml-2 text-green-600 text-xs font-normal">(Locked)</span>
            )}
          </label>
          <div
            className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? "pointer-events-none" : ""}`}
          >
            {PROJECT_TYPES.filter(
              (type) => !featureFlags || featureFlags[type.flagKey] !== false,
            ).map((type) => {
              const isDisabledForUnregistered =
                isUnregisteredCustomer && !isProjectTypeAvailableForUnregistered(type.value);
              const isDisabled = projectTypeConfirmed || isDisabledForUnregistered;

              return (
                <label
                  key={type.value}
                  title={
                    isDisabledForUnregistered
                      ? "Register or login to access this option"
                      : undefined
                  }
                  onMouseEnter={isDisabledForUnregistered ? showRestrictionTooltip : undefined}
                  onMouseLeave={isDisabledForUnregistered ? hideRestrictionTooltip : undefined}
                  className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-colors text-sm h-10 ${
                    isDisabledForUnregistered
                      ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                      : rfqData.projectType === type.value
                        ? "border-blue-600 bg-blue-50 cursor-pointer"
                        : hasProjectTypeError
                          ? "border-red-400 hover:border-red-500 cursor-pointer"
                          : "border-gray-200 hover:border-blue-300 cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="projectType"
                    value={type.value}
                    checked={rfqData.projectType === type.value}
                    onChange={(e) => {
                      if (isDisabledForUnregistered) return;
                      const selectedType = e.target.value;
                      log.debug("🔘 Project type selected:", selectedType);
                      onUpdate("projectType", selectedType);

                      const nixProjectTypes = ["phase1", "retender", "feasibility"];
                      if (nixProjectTypes.includes(selectedType)) {
                        log.debug("🤖 Enabling Nix for tender project type");
                        onUpdate("useNix", true);
                      } else if (useNix && nixStopUsing) {
                        log.debug("🤖 Disabling Nix - switched to non-Nix project type");
                        nixStopUsing();
                      }
                    }}
                    className="sr-only"
                    disabled={isDisabled}
                  />
                  <div
                    className={`w-3 h-3 border-2 rounded-full flex items-center justify-center ${
                      isDisabledForUnregistered
                        ? "border-gray-300 bg-gray-200"
                        : rfqData.projectType === type.value
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300"
                    }`}
                  >
                    {rfqData.projectType === type.value && !isDisabledForUnregistered && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span
                    className={`font-medium ${isDisabledForUnregistered ? "text-gray-400" : "text-gray-900"}`}
                  >
                    {type.label}
                  </span>
                  {isDisabledForUnregistered && (
                    <svg
                      className="w-3 h-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
          {errors.projectType && <p className="mt-1 text-xs text-red-600">{errors.projectType}</p>}
        </div>

        {/* Required Products/Services Selection - Hidden when using Nix */}
        {!useNix && (
          <div
            data-field="requiredProducts"
            data-nix-target="requiredProducts"
            className={projectTypeConfirmed ? "opacity-75" : ""}
          >
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Required Products & Services <span className="text-red-600">*</span>
              {projectTypeConfirmed && (
                <span className="ml-2 text-green-600 text-xs font-normal">(Locked)</span>
              )}
            </label>
            <div
              className={`grid grid-cols-4 gap-2 ${projectTypeConfirmed ? "pointer-events-none" : ""}`}
            >
              {PRODUCTS_AND_SERVICES.filter(
                (product) => !featureFlags || featureFlags[product.flagKey] !== false,
              ).map((product) => {
                const isSelected = rfqData.requiredProducts?.includes(product.value);
                const isDisabledForUnregistered =
                  isUnregisteredCustomer && !isProductAvailableForUnregistered(product.value);
                const isComingSoon = isProductComingSoon(product.value);
                const isDisabled =
                  projectTypeConfirmed || isDisabledForUnregistered || isComingSoon;

                return (
                  <label
                    key={product.value}
                    title={
                      isComingSoon
                        ? "Coming soon - this product/service is not yet available"
                        : isDisabledForUnregistered
                          ? "Register or login to access this product/service"
                          : product.description
                    }
                    onMouseEnter={
                      isDisabledForUnregistered && !isComingSoon
                        ? showRestrictionTooltip
                        : undefined
                    }
                    onMouseLeave={
                      isDisabledForUnregistered && !isComingSoon
                        ? hideRestrictionTooltip
                        : undefined
                    }
                    className={`flex items-center justify-center gap-2 px-2 py-2 border-2 rounded-lg transition-all text-xs h-10 ${
                      isComingSoon
                        ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                        : isDisabledForUnregistered
                          ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                          : isSelected
                            ? "border-blue-600 bg-blue-50 cursor-pointer"
                            : "border-gray-200 hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected && !isDisabledForUnregistered && !isComingSoon}
                      onChange={(e) => {
                        if (isDisabledForUnregistered || isComingSoon) return;
                        const rawRequiredProducts = rfqData.requiredProducts;
                        const currentProducts = rawRequiredProducts || [];
                        let newProducts: string[];
                        if (e.target.checked) {
                          newProducts = [...currentProducts, product.value];
                        } else {
                          newProducts = currentProducts.filter((p: string) => p !== product.value);
                        }
                        log.debug("☑️ Required products updated:", newProducts);
                        onUpdate("requiredProducts", newProducts);
                      }}
                      className="sr-only"
                      disabled={isDisabled}
                    />
                    <div
                      className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                        isComingSoon || isDisabledForUnregistered
                          ? "border-gray-300 bg-gray-200"
                          : isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                      }`}
                    >
                      {isSelected && !isDisabledForUnregistered && !isComingSoon && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <span className={isComingSoon || isDisabledForUnregistered ? "grayscale" : ""}>
                      {product.icon}
                    </span>
                    <span
                      className={`font-medium ${isComingSoon || isDisabledForUnregistered ? "text-gray-400" : "text-gray-900"}`}
                    >
                      {product.label}
                    </span>
                    {isComingSoon && (
                      <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0 italic">
                        Soon
                      </span>
                    )}
                    {isDisabledForUnregistered && !isComingSoon && (
                      <svg
                        className="w-3 h-3 text-gray-400 ml-auto flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>
            {errors.requiredProducts && (
              <p className="mt-1 text-xs text-red-600">{errors.requiredProducts}</p>
            )}
          </div>
        )}

        {/* Project Type & Products Confirmation Button - Hidden when using Nix */}
        {!useNix && (
          <div className="flex justify-end">
            {!projectTypeConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  if (!rfqData.projectType) {
                    onSetValidationError(
                      "projectType",
                      "Please select a Project Type before confirming.",
                    );
                    return;
                  }
                  if (!rfqData.requiredProducts || rfqData.requiredProducts.length === 0) {
                    onSetValidationError(
                      "requiredProducts",
                      "Please select at least one Required Product/Service before confirming.",
                    );
                    return;
                  }
                  onSetValidationError("projectType", null);
                  onSetValidationError("requiredProducts", null);
                  log.debug("✅ Project type & products confirmed:", {
                    projectType: rfqData.projectType,
                    requiredProducts: rfqData.requiredProducts,
                  });
                  setProjectTypeConfirmed(true);
                }}
                disabled={
                  !rfqData.projectType ||
                  !rfqData.requiredProducts ||
                  rfqData.requiredProducts.length === 0
                }
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
              >
                ✓ Confirm Project Type & Products
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Project Type & Products Confirmed
                </span>
                <button
                  type="button"
                  onClick={() => setProjectTypeConfirmed(false)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">Quick Notes</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addNote(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
            >
              <option value="">Add common note...</option>
              {commonNotes.map((note, index) => (
                <option key={index} value={note} disabled={additionalNotes.includes(note)}>
                  {note}
                </option>
              ))}
            </select>
            {additionalNotes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {additionalNotes.map((note, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs"
                  >
                    {note.substring(0, 20)}...
                    <button
                      type="button"
                      onClick={() => removeNote(note)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div data-nix-target="notes">
            <label className="block text-xs font-semibold text-gray-900 mb-1">Custom Notes</label>
            <textarea
              value={rfqData.notes}
              onChange={(e) => onUpdate("notes", e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
              placeholder="Additional requirements..."
            />
          </div>
        </div>

        {/* Document Upload - Moved above Project Location when Nix is enabled */}
        {useNix && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-600 rounded">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Upload Documents for Nix</h3>
                <p className="text-xs text-gray-600">
                  Tender documents and drawings for AI analysis
                </p>
              </div>
            </div>

            {!documentsConfirmed ? (
              <>
                <RfqDocumentUpload
                  documents={pendingDocuments || []}
                  onAddDocument={onAddDocument}
                  onRemoveDocument={onRemoveDocument}
                  maxDocuments={10}
                  maxFileSizeMB={50}
                />

                <div className="mt-3 pt-2 border-t border-purple-200">
                  <button
                    type="button"
                    disabled={isNixProcessing}
                    onClick={() => {
                      if (!pendingDocuments || pendingDocuments.length === 0) {
                        setShowNoDocumentsPopup(true);
                      } else {
                        setDocumentsConfirmed(true);
                        nixProcessDocuments(showToast);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isNixProcessing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Nix is reading...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Confirm & Let Nix Read
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-green-50 border border-green-400 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Confirmed ({rawLength || 0} file
                    {(rawLength2 || 0) !== 1 ? "s" : ""})
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocumentsConfirmed(false)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                  >
                    Edit
                  </button>
                </div>
                {pendingDocuments && pendingDocuments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pendingDocuments.map((doc: any, idx: number) => {
                      const rawName = doc.name;

                      return (
                        <span
                          key={idx}
                          className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {(rawName || doc.file?.name)?.substring(0, 20)}...
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Project Location - Compact */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-600"
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
              disabled={isLocationLocked}
              className={`flex items-center gap-2 px-4 py-2 text-white transition-colors text-sm font-medium shadow-sm rounded-lg ${
                isLocationLocked
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
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

          {/* SA Mines Dropdown - Compact */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                disabled={isLoadingMines || mineDataLoading || isLocationLocked}
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
                    className="w-4 h-4 text-gray-500"
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
              <div className="mt-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Location & slurry auto-filled
                <p className="text-xs text-amber-700 mt-1 ml-6">
                  Environmental intelligence will be populated based on commodity type
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Latitude</label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.latitude}
                onChange={(val) => onUpdate("latitude", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, latitude: false }))}
                isAutoFilled={locationAutoFilled.latitude}
                placeholder="-26.20227 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
              {!locationAutoFilled.latitude && (
                <p className="mt-1 text-xs text-gray-500">
                  Precision required for environmental analysis
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Longitude</label>
              <AutoFilledInput
                type="number"
                step="0.00001"
                value={rfqData.longitude}
                onChange={(val) => onUpdate("longitude", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, longitude: false }))}
                isAutoFilled={locationAutoFilled.longitude}
                placeholder="28.04363 (≥5 decimal places)"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          <div className="mb-4" data-nix-target="siteAddress">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
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
              <label className="block text-sm font-semibold text-gray-900 mb-2">
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
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
              <AutoFilledInput
                type="text"
                value={rfqData.country}
                onChange={(val) => onUpdate("country", val)}
                onOverride={() => setLocationAutoFilled((prev) => ({ ...prev, country: false }))}
                isAutoFilled={locationAutoFilled.country}
                placeholder="e.g., South Africa"
                readOnly={isLocationLocked}
              />
            </div>
          </div>

          {/* Location Confirmation Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
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
                <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-50 px-4 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Location Confirmed
                </div>
                {!isEditingLocation ? (
                  <button
                    type="button"
                    onClick={handleEditLocation}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
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

          {!useNix && rfqData.requiredProducts?.includes("surface_protection") && (
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
      </div>
      {/* Supporting Documents Section - At Bottom - Only shown when Nix is NOT enabled */}
      {!useNix && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BOQ & Drawing Documents */}
            {isUnregisteredCustomer ? (
              <div
                onMouseEnter={showRestrictionTooltip}
                onMouseLeave={hideRestrictionTooltip}
                className="bg-gray-100 rounded-lg p-3 border border-gray-300 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-gray-400 rounded">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-500">BOQ & Drawing Documents</h3>
                    <p className="text-xs text-gray-400">
                      Bills of quantities and technical drawings
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">
                      Registered Users Only
                    </span>
                  </div>
                </div>
                <div className="bg-gray-200 rounded-lg p-4 border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-8 h-8 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-xs">Document upload available for registered users</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-600 rounded">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      BOQ & Drawing Documents Only
                    </h3>
                    <p className="text-xs text-gray-600">
                      Bills of quantities and technical drawings
                    </p>
                  </div>
                </div>

                {!documentsConfirmed ? (
                  <>
                    <RfqDocumentUpload
                      documents={pendingDocuments || []}
                      onAddDocument={onAddDocument}
                      onRemoveDocument={onRemoveDocument}
                      maxDocuments={10}
                      maxFileSizeMB={50}
                    />

                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (!pendingDocuments || pendingDocuments.length === 0) {
                            setShowNoDocumentsPopup(true);
                          } else {
                            setDocumentsConfirmed(true);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2 transition-colors text-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Confirm
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-400 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Confirmed ({rawLength3 || 0} file
                        {(rawLength4 || 0) !== 1 ? "s" : ""})
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocumentsConfirmed(false)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                      >
                        Edit
                      </button>
                    </div>
                    {pendingDocuments && pendingDocuments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {pendingDocuments.map((doc: any, idx: number) => {
                          const rawName2 = doc.name;

                          return (
                            <span
                              key={idx}
                              className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              {(rawName2 || doc.file?.name)?.substring(0, 20)}...
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tender Specification Documents */}
            {isUnregisteredCustomer ? (
              <div
                onMouseEnter={showRestrictionTooltip}
                onMouseLeave={hideRestrictionTooltip}
                className="bg-gray-100 rounded-lg p-3 border border-gray-300 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-gray-400 rounded">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-500">
                      Tender Specification Documents
                    </h3>
                    <p className="text-xs text-gray-400">Tender specs and requirements</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-medium">
                      Registered Users Only
                    </span>
                  </div>
                </div>
                <div className="bg-gray-200 rounded-lg p-4 border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-8 h-8 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-xs">Document upload available for registered users</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-purple-600 rounded">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Tender Specification Documents Only
                    </h3>
                    <p className="text-xs text-gray-600">Tender specs and requirements</p>
                  </div>
                </div>

                {!tenderDocumentsConfirmed ? (
                  <>
                    <RfqDocumentUpload
                      documents={pendingTenderDocuments || []}
                      onAddDocument={onAddTenderDocument}
                      onRemoveDocument={onRemoveTenderDocument}
                      maxDocuments={10}
                      maxFileSizeMB={50}
                    />

                    <div className="mt-3 pt-2 border-t border-purple-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (!pendingTenderDocuments || pendingTenderDocuments.length === 0) {
                            setShowNoTenderDocumentsPopup(true);
                          } else {
                            setTenderDocumentsConfirmed(true);
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2 transition-colors text-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Confirm
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-400 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Confirmed ({rawLength5 || 0} file
                        {(rawLength6 || 0) !== 1 ? "s" : ""})
                      </div>
                      <button
                        type="button"
                        onClick={() => setTenderDocumentsConfirmed(false)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                      >
                        Edit
                      </button>
                    </div>
                    {pendingTenderDocuments && pendingTenderDocuments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {pendingTenderDocuments.map((doc: any, idx: number) => {
                          const rawName3 = doc.name;

                          return (
                            <span
                              key={idx}
                              className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              {(rawName3 || doc.file?.name)?.substring(0, 20)}...
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* No Documents Confirmation Popup */}
      {showNoDocumentsPopup && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <svg
                  className="w-6 h-6 text-amber-600"
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
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Documents Uploaded</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You haven't uploaded any supporting documents. Documents such as specifications,
              drawings, or requirements help suppliers provide accurate quotes.
            </p>
            <p className="text-gray-700 font-medium mb-4">
              Would you like to proceed without uploading documents?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  log.debug("📄 User confirmed: Skip documents");
                  setShowNoDocumentsPopup(false);
                  setDocumentsConfirmed(true);
                  onUpdate("skipDocuments", true);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Proceed Without Documents
              </button>
              <button
                type="button"
                onClick={() => setShowNoDocumentsPopup(false)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}
      {/* No Tender Documents Confirmation Popup */}
      {showNoTenderDocumentsPopup && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <svg
                  className="w-6 h-6 text-amber-600"
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
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Tender Documents Uploaded</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You haven't uploaded any tender specification documents. These documents help
              suppliers understand the full tender requirements and specifications.
            </p>
            <p className="text-gray-700 font-medium mb-4">
              Would you like to proceed without uploading tender documents?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  log.debug("📄 User confirmed: Skip tender documents");
                  setShowNoTenderDocumentsPopup(false);
                  setTenderDocumentsConfirmed(true);
                  onUpdate("skipTenderDocuments", true);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                Proceed Without Documents
              </button>
              <button
                type="button"
                onClick={() => setShowNoTenderDocumentsPopup(false)}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Mine Modal */}
      <AddMineModal
        isOpen={showAddMineModal}
        onClose={() => setShowAddMineModal(false)}
        onMineCreated={handleMineCreated}
      />
      {/* Restriction Popup for Unregistered Customers */}
      {restrictionPopup && <RestrictionTooltip position={restrictionPopup} />}
    </div>
  );
}

"use client";

import { keys } from "es-toolkit/compat";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { useOptionalAdminAuth } from "@/app/context/AdminAuthContext";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { useFeatureFlags } from "@/app/hooks/useFeatureFlags";
import { minesApi, SaMine } from "@/app/lib/api/client";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useEnvironmentalIntelligence } from "@/app/lib/hooks/useEnvironmentalIntelligence";
import { log } from "@/app/lib/logger";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import { generateSystemReferenceNumber } from "@/app/lib/utils/systemUtils";
import {
  buildFallbackEnvironmentalSpecs,
  FALLBACK_ENVIRONMENTAL_AUTO_FILLED_FIELDS,
  fallbackMines,
} from "../projectDetailsFallbackData";
import type { RestrictionPopupPosition } from "./types";
import { useNixDocumentIntake } from "./useNixDocumentIntake";

export function useProjectDetailsLogic() {
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
  const mergeSpecMetadataIntoGlobalSpecs = useRfqWizardStore(
    (s) => s.mergeSpecMetadataIntoGlobalSpecs,
  );
  const currentDraftId = useRfqWizardStore((s) => s.currentDraftId);
  const setWizardCurrentStep = useRfqWizardStore((s) => s.setCurrentStep);
  const applyNixItemsToRfq = useRfqWizardStore((s) => s.applyNixItemsToRfq);
  const globalSpecs = rfqData.globalSpecs;
  const useNix = rfqData.useNix;
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm, ConfirmDialog } = useConfirm();
  // Hoisted up here (was further down) so onAddDocument's email-metadata
  // auto-fill branch can compare current customer-field values against the
  // logged-in user's profile defaults.
  const {
    isAuthenticated: isCustomerAuthenticated,
    isLoading: isCustomerAuthLoading,
    customer,
    profile,
  } = useOptionalCustomerAuth();
  const { isAuthenticated: isAdminAuthenticated, isLoading: isAdminAuthLoading } =
    useOptionalAdminAuth();

  // Surface from the latest email drop so a follow-up useEffect can run
  // mine-name detection once the mines list has loaded. Decoupled from
  // onAddDocument so we don't have to re-memoise the callback when mines
  // load asynchronously after first render.
  const [emailLocationSearchText, setEmailLocationSearchText] = useState<string | null>(null);
  const [showLocationRequiredModal, setShowLocationRequiredModal] = useState(false);
  // Pending mine choice inside LocationRequiredModal — the dropdown only
  // stages a selection here; the "Accept this location" button is what
  // actually commits via handleMineSelect.
  const [pendingMineSelection, setPendingMineSelection] = useState<number | null>(null);

  const [boqExtractionSummary, setBoqExtractionSummary] = useState<{
    fileName: string;
    itemCount: number;
    bundleCount: number;
    duplicateCount: number;
    drawingRefCount: number;
  } | null>(null);

  // Track which customer fields were auto-filled (declared early because
  // onAddDocument's email-metadata branch overwrites them). Mirror state is
  // updated again below from the logged-in-user useEffect.
  const [customerAutoFilled, setCustomerAutoFilled] = useState<{
    customerName: boolean;
    customerEmail: boolean;
    customerPhone: boolean;
  }>({
    customerName: false,
    customerEmail: false,
    customerPhone: false,
  });

  // Sequential queue for Nix extractions so multiple Excel files
  // dropped at once spool through the backend one at a time rather
  // than firing in parallel and surfacing duplicate progress modals.
  // The chain tail tracks the in-flight + queued tasks; new arrivals
  // attach to it and become the new tail.
  const nixExtractionQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // Batch context for the extraction progress modal. When the user
  // drops a pack of N documents at once, every queued task slots
  // into a single batch so the modal can render an overall progress
  // bar + ETA in addition to the per-document bar. Reset to null
  // once the last task in the batch completes.
  const nixBatchStateRef = useRef<{
    startedAt: number;
    total: number;
    completed: number;
    totalEstimateMs: number;
  } | null>(null);

  // Reserve a slot in the active batch (creates one if there isn't
  // an active batch yet). Called at the moment a task is enqueued.
  const { onAddDocument } = useNixDocumentIntake({
    nixProcessDocuments,
    onUpdate,
    storeAddDocument,
    storeAddTenderDocument,
    mergeSpecMetadataIntoGlobalSpecs,
    currentDraftId,
    setWizardCurrentStep,
    applyNixItemsToRfq,
    showToast,
    showExtraction,
    hideExtraction,
    confirm,
    customer,
    profile,
    setBoqExtractionSummary,
    customerAutoFilled,
    setCustomerAutoFilled,
    setEmailLocationSearchText,
    pendingDocuments,
    nixExtractionQueueRef,
    nixBatchStateRef,
    globalSpecs,
    rfqData,
    useNix,
  });

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

  // After an .eml drop, search the email's subject + body for any SaMine
  // name. If exactly one mine matches, auto-select it (re-using the same
  // handleMineSelect path that fills lat/lng/region/etc.). If no match —
  // and no location field has been touched yet — open the
  // LocationRequiredModal as a forcing prompt.
  useEffect(() => {
    if (!emailLocationSearchText) return;
    if (mines.length === 0) return;

    const haystack = emailLocationSearchText.toLowerCase();
    const matches = mines.filter((mine) => {
      const name = mine.mineName.toLowerCase();
      if (name.length < 4) return false;
      return haystack.includes(name);
    });

    const rawLatitude = rfqData.latitude;
    const rawLongitude = rfqData.longitude;
    const rawSiteAddress = rfqData.siteAddress;
    const hasLocation = rawLatitude || rawLongitude || rawSiteAddress;

    if (matches.length === 1 && !hasLocation && !selectedMineId) {
      handleMineSelect(matches[0].id);
    } else if (matches.length === 0 && !hasLocation && !selectedMineId) {
      setShowLocationRequiredModal(true);
    }

    setEmailLocationSearchText(null);
  }, [
    emailLocationSearchText,
    mines,
    rfqData.latitude,
    rfqData.longitude,
    rfqData.siteAddress,
    selectedMineId,
  ]);

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

  // Auto-generate RFQ reference number + project-name fallback when fields
  // are empty (but not when loading a draft; the draft restore provides
  // both). The customer-facing RFQ Reference is the system reference; the
  // Project Name is overwritten by the email subject in
  // applyEmailMetadataToCustomerFields if a .eml is dropped — until then
  // it shares the system reference as a placeholder so the field is never
  // visibly blank.
  useEffect(() => {
    // Skip auto-generation if we're loading a draft - the draft will provide the data
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("draft") || urlParams.get("draftId") || urlParams.get("recover")) return;

    const rawProjectName = rfqData.projectName;
    const rawRfqRef = rfqData.customerRfqReference;
    const projectNameEmpty = !rawProjectName || rawProjectName.trim() === "";
    const rfqRefEmpty = !rawRfqRef || rawRfqRef.trim() === "";
    if (!projectNameEmpty && !rfqRefEmpty) return;

    const autoGenNumber = generateSystemReferenceNumber();
    if (rfqRefEmpty) onUpdate("customerRfqReference", autoGenNumber);
    if (projectNameEmpty) onUpdate("projectName", autoGenNumber);
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
  const rawLocationNotKnown = rfqData.locationNotKnown;
  const rawCollectionOnly = rfqData.collectionOnly;
  const rawSkipEnvSuggestions = rfqData.skipEnvironmentalSuggestions;
  const locationSkipped = Boolean(rawLocationNotKnown || rawCollectionOnly);
  const skipEnvSuggestions = Boolean(rawSkipEnvSuggestions) || locationSkipped;

  // One-line summary shown beside the "Location Confirmed" banner once the
  // detail fields collapse, so the customer can see what's confirmed without
  // re-opening the section.
  const rawSiteAddressSummary = rfqData.siteAddress;
  const rawRegionSummary = rfqData.region;
  const rawCountrySummary = rfqData.country;
  const rawLatSummary = rfqData.latitude;
  const rawLngSummary = rfqData.longitude;
  const regionCountrySummary = [rawRegionSummary, rawCountrySummary].filter(Boolean).join(", ");
  const coordSummary = rawLatSummary && rawLngSummary ? `${rawLatSummary}, ${rawLngSummary}` : "";
  const knownLocationSummary = rawSiteAddressSummary || regionCountrySummary || coordSummary;
  const locationSummary = rawLocationNotKnown
    ? "Location not known"
    : rawCollectionOnly
      ? "Collection only — no delivery site"
      : knownLocationSummary;

  // "Location not known" / "Collection only" toggle. Checking either disables
  // the address fields and switches the location-driven surface-protection
  // suggestion module off for this RFQ — so the customer is warned about the
  // trade-off, the choice is logged to notes, and the two reasons are mutually
  // exclusive.
  const handleLocationUnavailableToggle = async (
    field: "locationNotKnown" | "collectionOnly",
    checked: boolean,
  ) => {
    if (!checked) {
      onUpdate(field, false);
      const otherStillSet =
        field === "locationNotKnown" ? rfqData.collectionOnly : rfqData.locationNotKnown;
      if (!otherStillSet) {
        onUpdate("skipEnvironmentalSuggestions", false);
        // Location is required again — re-open the section so the customer
        // must re-enter and re-confirm real coordinates/address.
        setLocationConfirmed(false);
        setIsEditingLocation(false);
      }
      return;
    }
    const proceed = await confirm({
      title: "No project location — surface-protection suggestions will switch off",
      message:
        "Without a project location, Nix can't suggest a coating / lining (surface-protection) system from the site's environment — coastal exposure, ISO 12944 atmospheric category, time-of-wetness and so on.\n\nThe location-based surface-protection suggestion module will be switched OFF for this RFQ only. If the required surface protection is already specified in your tender documents, that's fine — capture it on the Specifications step.\n\nContinue?",
      variant: "warning",
      confirmLabel: "Yes, continue without location",
      cancelLabel: "Cancel",
    });
    if (!proceed) return;
    const otherField = field === "locationNotKnown" ? "collectionOnly" : "locationNotKnown";
    onUpdate(field, true);
    onUpdate(otherField, false);
    onUpdate("skipEnvironmentalSuggestions", true);
    addNote(
      field === "locationNotKnown"
        ? "Project location not known — location-based surface-protection suggestions disabled for this RFQ (customer confirmed)."
        : "Collection only / no delivery site — location-based surface-protection suggestions disabled for this RFQ (customer confirmed).",
    );
    // The "continue without location" confirmation also confirms the Location
    // section — there's nothing left to fill, so the customer shouldn't have
    // to press "Confirm Location Data" separately.
    setLocationConfirmed(true);
    setIsEditingLocation(false);
  };

  const hasRequiredLocationData = () => {
    if (locationSkipped) return true;
    return !!(
      rfqData.latitude &&
      rfqData.longitude &&
      rfqData.siteAddress &&
      rfqData.region &&
      rfqData.country
    );
  };

  const hasRequiredEnvironmentalData = () => {
    if (skipEnvSuggestions) return true;
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

  // (auth hooks hoisted to top — see early useOptionalCustomerAuth call)

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
      const directPhone = profile.directPhone;
      const companyPrimaryPhone = profile.company?.primaryPhone;
      const phoneNumber = rawMobilePhone || directPhone || companyPrimaryPhone;
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

  return {
    ConfirmDialog,
    addNote,
    additionalNotes,
    boqExtractionSummary,
    commonNotes,
    customerAutoFilled,
    documentsConfirmed,
    environmentalConfirmed,
    environmentalErrors,
    errors,
    featureFlags,
    getMapConfig,
    globalSpecs,
    handleConfirmEnvironmental,
    handleConfirmLocation,
    handleEditEnvironmental,
    handleEditLocation,
    handleLocationSelect,
    handleLocationUnavailableToggle,
    handleMineCreated,
    handleMineDropdownChange,
    handleMineSelect,
    hasProjectTypeError,
    hasRequiredEnvironmentalData,
    hasRequiredLocationData,
    hideRestrictionTooltip,
    isCustomerAuthenticated,
    isEditingEnvironmental,
    isEditingLocation,
    isEnvironmentalLocked,
    isLoadingEnvironmental,
    isLoadingMines,
    isLocationLocked,
    isNixProcessing,
    isUnregisteredCustomer,
    locationAutoFilled,
    locationConfirmed,
    locationSkipped,
    locationSummary,
    markAsOverridden,
    mineDataLoading,
    mines,
    nixProcessDocuments,
    nixStopUsing,
    onAddDocument,
    onRemoveDocument,
    onRemoveTenderDocument,
    onSetValidationError,
    onUpdate,
    onUpdateGlobalSpecs,
    pendingDocuments,
    pendingMineSelection,
    pendingTenderDocuments,
    projectTypeConfirmed,
    rawCustomerRfqReference,
    removeNote,
    restrictionPopup,
    rfqData,
    selectedMineId,
    setCustomerAutoFilled,
    setDocumentsConfirmed,
    setLocationAutoFilled,
    setPendingMineSelection,
    setProjectTypeConfirmed,
    setShowAddMineModal,
    setShowLocationRequiredModal,
    setShowMapPicker,
    setShowNoDocumentsPopup,
    setTenderDocumentsConfirmed,
    showAddMineModal,
    showLocationRequiredModal,
    showMapPicker,
    showNoDocumentsPopup,
    showRestrictionTooltip,
    showToast,
    skipEnvSuggestions,
    storeAddDocument,
    storeAddTenderDocument,
    tenderDocumentsConfirmed,
    updateEnvironmentalField,
    useNix,
    wasAutoFilled,
  };
}

export type ProjectDetailsLogic = ReturnType<typeof useProjectDetailsLogic>;

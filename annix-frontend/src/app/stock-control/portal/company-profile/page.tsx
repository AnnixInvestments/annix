"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { AdminTransferPending } from "@/app/lib/api/stock-control-api/types";
import type { CandidateImage } from "@/app/lib/api/stockControlApi";
import { fromISO } from "@/app/lib/datetime";
import {
  useCancelAdminTransfer,
  useCompanyRoles,
  useInitiateAdminTransfer,
  usePendingAdminTransfer,
  useProcessBrandingSelection,
  useResendAdminTransfer,
  useScrapeBranding,
  useSetBranding,
  useStockControlProxyImageBlob,
  useUpdateCompanyDetails,
} from "@/app/lib/query/hooks";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";
import { usePushNotifications } from "@/app/stock-control/hooks/usePushNotifications";
import { STOCK_CONTROL_VERSION } from "../../config/version";
import { syncStatus } from "../../lib/offline/syncManager";
import { isValidEmail } from "../../lib/validation";
import { AppPermissionsSection } from "../settings/AppPermissionsSection";
import { SmtpConfigSection } from "../settings/SmtpConfigSection";

type BrandingSelection = "annix" | "custom";

const SOURCE_LABELS: Record<string, string> = {
  "logo-attr": "Logo element",
  "header-img": "Header image",
  "og-image": "Open Graph",
  favicon: "Favicon",
  "hero-selector": "Hero section",
  "bg-image": "Background",
  "large-img": "Large image",
};

function CandidateThumbnail(props: {
  candidate: CandidateImage;
  selected: boolean;
  onSelect: () => void;
  size: "small" | "large";
}) {
  const candidate = props.candidate;
  const selected = props.selected;
  const onSelect = props.onSelect;
  const size = props.size;
  const { objectUrl, failed: loadFailed } = useStockControlProxyImageBlob(candidate.url);
  const [imgError, setImgError] = useState(false);

  if (loadFailed || imgError) {
    return null;
  }

  const heightClass = size === "small" ? "h-16" : "h-32";
  const sourceLabel = SOURCE_LABELS[candidate.source];
  const label = sourceLabel ? sourceLabel : candidate.source;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col items-center rounded-lg border-2 p-1.5 transition-all hover:shadow-md ${
        selected
          ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500"
          : "border-gray-200 hover:border-teal-300"
      }`}
    >
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={label}
          className={`${heightClass} w-full object-contain rounded`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${heightClass} w-full flex items-center justify-center bg-gray-100 rounded`}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500 border-t-transparent" />
        </div>
      )}
      <span className="mt-1 text-[10px] text-gray-500 truncate w-full text-center">{label}</span>
      {selected && (
        <div className="absolute top-1 right-1">
          <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useStockControlAuth();
  const updateDetailsMutation = useUpdateCompanyDetails();
  const scrapeBrandingMutation = useScrapeBranding();
  const processBrandingMutation = useProcessBrandingSelection();
  const setBrandingMutation = useSetBranding();
  const pendingTransferMutation = usePendingAdminTransfer();
  const initiateTransferMutation = useInitiateAdminTransfer();
  const resendTransferMutation = useResendAdminTransfer();
  const cancelTransferMutation = useCancelAdminTransfer();

  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [pipingLossFactorPct, setPipingLossFactorPct] = useState(45);
  const [flatPlateLossFactorPct, setFlatPlateLossFactorPct] = useState(20);
  const [structuralSteelLossFactorPct, setStructuralSteelLossFactorPct] = useState(30);
  const [qcEnabled, setQcEnabled] = useState(true);
  const [messagingEnabled, setMessagingEnabled] = useState(false);
  const [workflowEnabled, setWorkflowEnabled] = useState(true);
  const [staffLeaveEnabled, setStaffLeaveEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const {
    permissionState: pushPermissionState,
    isSubscribed: pushIsSubscribed,
    isLoading: pushIsLoading,
    requestPermissionAndSubscribe: enablePushOnThisDevice,
  } = usePushNotifications();
  const [pushEnabling, setPushEnabling] = useState(false);
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresSuccess, setFeaturesSuccess] = useState(false);
  const [featuresError, setFeaturesError] = useState("");
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [brandingSelection, setBrandingSelection] = useState<BrandingSelection>("annix");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandingAuthorized, setBrandingAuthorized] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [accentColor, setAccentColor] = useState("#2dd4bf");
  const [brandingError, setBrandingError] = useState("");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);
  const [scraping, setScraping] = useState(false);

  const [logoCandidates, setLogoCandidates] = useState<CandidateImage[]>([]);
  const [heroCandidates, setHeroCandidates] = useState<CandidateImage[]>([]);
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null);
  const [selectedHeroUrl, setSelectedHeroUrl] = useState<string | null>(null);
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [processedHeroUrl, setProcessedHeroUrl] = useState<string | null>(null);
  const [scrapedPrimaryColor, setScrapedPrimaryColor] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") {
      router.push("/stock-control/portal/dashboard");
      return;
    }

    if (profile?.companyName) {
      setCompanyName(profile.companyName);
    }
    if (profile?.registrationNumber) {
      setRegistrationNumber(profile.registrationNumber);
    }
    if (profile?.vatNumber) {
      setVatNumber(profile.vatNumber);
    }
    if (profile?.streetAddress) {
      setStreetAddress(profile.streetAddress);
    }
    if (profile?.city) {
      setCity(profile.city);
    }
    if (profile?.province) {
      setProvince(profile.province);
    }
    if (profile?.postalCode) {
      setPostalCode(profile.postalCode);
    }
    if (profile?.phone) {
      setPhone(profile.phone);
    }
    if (profile?.companyEmail) {
      setCompanyEmail(profile.companyEmail);
    }
    if (profile?.websiteUrl) {
      setCompanyWebsite(profile.websiteUrl);
    }

    if (profile?.pipingLossFactorPct !== undefined) {
      setPipingLossFactorPct(profile.pipingLossFactorPct);
    }
    if (profile?.flatPlateLossFactorPct !== undefined) {
      setFlatPlateLossFactorPct(profile.flatPlateLossFactorPct);
    }
    if (profile?.structuralSteelLossFactorPct !== undefined) {
      setStructuralSteelLossFactorPct(profile.structuralSteelLossFactorPct);
    }

    if (profile?.qcEnabled !== undefined) {
      setQcEnabled(profile.qcEnabled);
    }

    if (profile?.messagingEnabled !== undefined) {
      setMessagingEnabled(profile.messagingEnabled);
    }

    if (profile?.workflowEnabled !== undefined) {
      setWorkflowEnabled(profile.workflowEnabled);
    }

    if (profile?.staffLeaveEnabled !== undefined) {
      setStaffLeaveEnabled(profile.staffLeaveEnabled);
    }

    if (profile?.notificationsEnabled !== undefined) {
      setNotificationsEnabled(profile.notificationsEnabled);
    }

    if (profile?.brandingType) {
      setBrandingSelection(profile.brandingType as BrandingSelection);
    }

    if (profile?.primaryColor) {
      setPrimaryColor(profile.primaryColor);
    }

    if (profile?.accentColor) {
      setAccentColor(profile.accentColor);
    }

    if (profile?.logoUrl) {
      setProcessedLogoUrl(profile.logoUrl);
    }
    if (profile?.heroImageUrl) {
      setProcessedHeroUrl(profile.heroImageUrl);
    }
  }, [user, profile, router]);

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleSaveCompanyDetails = async () => {
    if (!companyName.trim()) {
      setDetailsError("Company name is required.");
      return;
    }

    if (companyEmail.trim() && !isValidEmail(companyEmail)) {
      setDetailsError("Please enter a valid email address.");
      return;
    }

    setDetailsError("");
    setDetailsSaving(true);
    setDetailsSuccess(false);

    try {
      await updateDetailsMutation.mutateAsync({
        name: companyName.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        streetAddress: streetAddress.trim() || undefined,
        city: city.trim() || undefined,
        province: province || undefined,
        postalCode: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        email: companyEmail.trim() || undefined,
        websiteUrl: companyWebsite.trim() || undefined,
        pipingLossFactorPct,
        flatPlateLossFactorPct,
        structuralSteelLossFactorPct,
      });
      setDetailsSuccess(true);
      await refreshProfile();
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : "Failed to update company details.");
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    setFeaturesError("");
    setFeaturesSaving(true);
    setFeaturesSuccess(false);

    try {
      await updateDetailsMutation.mutateAsync({
        qcEnabled,
        messagingEnabled,
        workflowEnabled,
        staffLeaveEnabled,
        notificationsEnabled,
      });
      setFeaturesSuccess(true);
      await refreshProfile();
    } catch (e) {
      setFeaturesError(e instanceof Error ? e.message : "Failed to update features.");
    } finally {
      setFeaturesSaving(false);
    }
  };

  const handleExtractBranding = async () => {
    if (!websiteUrl.trim()) {
      setBrandingError("Please enter your website URL.");
      return;
    }
    if (!isValidUrl(websiteUrl)) {
      setBrandingError("Please enter a valid website URL.");
      return;
    }
    if (!brandingAuthorized) {
      setBrandingError("Please authorize ASCA to access your website for branding.");
      return;
    }

    setBrandingError("");
    setScraping(true);
    setLogoCandidates([]);
    setHeroCandidates([]);
    setSelectedLogoUrl(null);
    setSelectedHeroUrl(null);
    setProcessedLogoUrl(null);
    setProcessedHeroUrl(null);
    setScrapedPrimaryColor(null);

    try {
      const normalizedUrl = websiteUrl.startsWith("http")
        ? websiteUrl.trim()
        : `https://${websiteUrl.trim()}`;
      const result = await scrapeBrandingMutation.mutateAsync(normalizedUrl);

      if (
        result.logoCandidates.length === 0 &&
        result.heroCandidates.length === 0 &&
        !result.primaryColor
      ) {
        setBrandingError(
          "Could not extract branding from this website. You can set colors and logo manually.",
        );
      } else {
        setLogoCandidates(result.logoCandidates);
        setHeroCandidates(result.heroCandidates);
        setScrapedPrimaryColor(result.primaryColor);

        if (result.logoCandidates.length > 0) {
          setSelectedLogoUrl(result.logoCandidates[0].url);
        }
        if (result.heroCandidates.length > 0) {
          setSelectedHeroUrl(result.heroCandidates[0].url);
        }
        if (result.primaryColor) {
          setPrimaryColor(result.primaryColor);
        }
      }
    } catch (e) {
      setBrandingError(e instanceof Error ? e.message : "Failed to extract branding from website.");
    } finally {
      setScraping(false);
    }
  };

  const handleSaveBranding = async () => {
    if (brandingSelection === "custom") {
      if (!websiteUrl.trim()) {
        setBrandingError("Please enter your website URL.");
        return;
      }
      if (!isValidUrl(websiteUrl)) {
        setBrandingError("Please enter a valid website URL.");
        return;
      }
      if (!brandingAuthorized) {
        setBrandingError("Please authorize ASCA to access your website for branding.");
        return;
      }
    }

    setBrandingError("");
    setBrandingSaving(true);
    setBrandingSuccess(false);

    try {
      const normalizedUrl =
        brandingSelection === "custom"
          ? websiteUrl.startsWith("http")
            ? websiteUrl.trim()
            : `https://${websiteUrl.trim()}`
          : undefined;

      let finalLogoUrl = processedLogoUrl;
      let finalHeroUrl = processedHeroUrl;
      let finalPrimary = primaryColor;
      let finalAccent = accentColor;

      if (brandingSelection === "custom" && (selectedLogoUrl || selectedHeroUrl)) {
        setProcessing(true);
        const processed = await processBrandingMutation.mutateAsync({
          logoSourceUrl: selectedLogoUrl ?? undefined,
          heroSourceUrl: selectedHeroUrl ?? undefined,
          scrapedPrimaryColor: scrapedPrimaryColor ?? undefined,
        });
        setProcessing(false);

        if (processed.logoUrl) {
          finalLogoUrl = processed.logoUrl;
          setProcessedLogoUrl(processed.logoUrl);
        }
        if (processed.heroImageUrl) {
          finalHeroUrl = processed.heroImageUrl;
          setProcessedHeroUrl(processed.heroImageUrl);
        }
        if (processed.primaryColor) {
          finalPrimary = processed.primaryColor;
          setPrimaryColor(processed.primaryColor);
        }
        if (processed.accentColor) {
          finalAccent = processed.accentColor;
          setAccentColor(processed.accentColor);
        }
      }

      await setBrandingMutation.mutateAsync({
        brandingType: brandingSelection,
        websiteUrl: normalizedUrl,
        brandingAuthorized: brandingSelection === "custom" ? brandingAuthorized : undefined,
        primaryColor: brandingSelection === "custom" ? finalPrimary : undefined,
        accentColor: brandingSelection === "custom" ? finalAccent : undefined,
        logoUrl: brandingSelection === "custom" ? (finalLogoUrl ?? undefined) : undefined,
        heroImageUrl: brandingSelection === "custom" ? (finalHeroUrl ?? undefined) : undefined,
      });

      setBrandingSuccess(true);
      await refreshProfile();
    } catch (e) {
      setBrandingError(e instanceof Error ? e.message : "Failed to save branding preference.");
    } finally {
      setBrandingSaving(false);
      setProcessing(false);
    }
  };

  const savingLabel = () => {
    if (processing) {
      return "Processing images...";
    }
    if (brandingSaving) {
      return "Saving...";
    }
    return "Save Branding";
  };

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <h1 className="text-2xl font-bold text-gray-900 lg:col-span-2">Company Profile</h1>

      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setDetailsError("");
                setDetailsSuccess(false);
              }}
              placeholder="Enter company name"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700">
              Registration Number
            </label>
            <input
              id="registrationNumber"
              type="text"
              value={registrationNumber}
              onChange={(e) => {
                setRegistrationNumber(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="e.g. 2020/123456/07"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">
              VAT Number
            </label>
            <input
              id="vatNumber"
              type="text"
              value={vatNumber}
              onChange={(e) => {
                setVatNumber(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="e.g. 4123456789"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              id="streetAddress"
              type="text"
              value={streetAddress}
              onChange={(e) => {
                setStreetAddress(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="Enter street address"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="Enter city"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="province" className="block text-sm font-medium text-gray-700">
              Province
            </label>
            <select
              id="province"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDetailsSuccess(false);
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="">Select province</option>
              <option value="Eastern Cape">Eastern Cape</option>
              <option value="Free State">Free State</option>
              <option value="Gauteng">Gauteng</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              <option value="Limpopo">Limpopo</option>
              <option value="Mpumalanga">Mpumalanga</option>
              <option value="North West">North West</option>
              <option value="Northern Cape">Northern Cape</option>
              <option value="Western Cape">Western Cape</option>
            </select>
          </div>
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              id="postalCode"
              type="text"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="e.g. 2000"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              id="companyPhone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="e.g. 011 123 4567"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="companyEmail"
              type="email"
              value={companyEmail}
              onChange={(e) => {
                setCompanyEmail(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="info@example.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
          <div>
            <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <input
              id="companyWebsite"
              type="url"
              value={companyWebsite}
              onChange={(e) => {
                setCompanyWebsite(e.target.value);
                setDetailsSuccess(false);
              }}
              placeholder="https://company.co.za"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mt-6 mb-2">Coating Loss Factors</h3>
        <p className="text-xs text-gray-500 mb-3">
          Paint loss factors account for material lost during application. Higher loss means more
          paint is needed per m².
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pipingLoss" className="block text-sm font-medium text-gray-700">
              Piping Loss Factor
            </label>
            <p className="text-xs text-gray-400 mb-1">Typical range: 30 &ndash; 50%</p>
            <div className="flex items-center">
              <input
                id="pipingLoss"
                type="number"
                min={0}
                max={100}
                value={pipingLossFactorPct}
                onChange={(e) => {
                  setPipingLossFactorPct(Number(e.target.value));
                  setDetailsSuccess(false);
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <span className="ml-2 text-sm text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label htmlFor="flatPlateLoss" className="block text-sm font-medium text-gray-700">
              Flat Plate Loss Factor (Tanks &amp; Chutes)
            </label>
            <p className="text-xs text-gray-400 mb-1">Typical range: 15 &ndash; 25%</p>
            <div className="flex items-center">
              <input
                id="flatPlateLoss"
                type="number"
                min={0}
                max={100}
                value={flatPlateLossFactorPct}
                onChange={(e) => {
                  setFlatPlateLossFactorPct(Number(e.target.value));
                  setDetailsSuccess(false);
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <span className="ml-2 text-sm text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label
              htmlFor="structuralSteelLoss"
              className="block text-sm font-medium text-gray-700"
            >
              Structural Steel Loss Factor
            </label>
            <p className="text-xs text-gray-400 mb-1">Typical range: 20 &ndash; 40%</p>
            <div className="flex items-center">
              <input
                id="structuralSteelLoss"
                type="number"
                min={0}
                max={100}
                value={structuralSteelLossFactorPct}
                onChange={(e) => {
                  setStructuralSteelLossFactorPct(Number(e.target.value));
                  setDetailsSuccess(false);
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <span className="ml-2 text-sm text-gray-500">%</span>
            </div>
          </div>
        </div>

        {detailsError && <p className="mt-4 text-sm text-red-600">{detailsError}</p>}
        {detailsSuccess && (
          <p className="mt-4 text-sm text-green-600">Company details updated successfully.</p>
        )}
        <button
          type="button"
          onClick={handleSaveCompanyDetails}
          disabled={detailsSaving}
          className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {detailsSaving ? "Saving..." : "Save Company Details"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Company Features</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enable or disable modules for your company. Changes take effect immediately after saving.
        </p>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex-1 mr-4">
              <span className="text-sm font-medium text-gray-900">Quality Control</span>
              <p className="text-xs text-gray-500 mt-0.5">
                PosiTector device integration, DFT measurements, calibration certificates, data
                books, and QC batch management
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={qcEnabled}
              onClick={() => setQcEnabled(!qcEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                qcEnabled ? "bg-teal-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  qcEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Team Messaging</p>
              <p className="text-xs text-gray-500 mt-0.5">
                In-app team chat for real-time communication between staff members
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={messagingEnabled}
              onClick={() => setMessagingEnabled(!messagingEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                messagingEnabled ? "bg-teal-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  messagingEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Workflow Configuration</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Custom workflow steps, background tasks, approvals, and multi-phase actions for job
                card processing
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={workflowEnabled}
              onClick={() => setWorkflowEnabled(!workflowEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                workflowEnabled ? "bg-teal-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  workflowEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Staff Leave Management</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Track staff sick days and holidays with automatic WFA task delegation to secondary
                users
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={staffLeaveEnabled}
              onClick={() => setStaffLeaveEnabled(!staffLeaveEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                staffLeaveEnabled ? "bg-teal-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  staffLeaveEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Push Notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Send push notifications to staff devices for approvals, dispatches, and alerts.
                Disabling removes all device subscriptions — users will be re-prompted when
                re-enabled.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                notificationsEnabled ? "bg-teal-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  notificationsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          {notificationsEnabled &&
            !pushIsLoading &&
            pushPermissionState !== "unsupported" &&
            pushPermissionState !== "denied" &&
            !pushIsSubscribed && (
              <div className="flex items-center justify-between rounded-md border border-teal-200 bg-teal-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-teal-900">
                    Enable push notifications on this device
                  </p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    Receive approval, dispatch, and alert notifications directly in this browser.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pushEnabling}
                  onClick={async () => {
                    setPushEnabling(true);
                    try {
                      localStorage.removeItem("stock-control-push-dismissed");
                      await enablePushOnThisDevice();
                    } finally {
                      setPushEnabling(false);
                    }
                  }}
                  className="ml-4 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {pushEnabling ? "Enabling..." : "Enable"}
                </button>
              </div>
            )}

          {notificationsEnabled && pushPermissionState === "denied" && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">
                Push notifications are blocked in this browser
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Update your browser's site permissions to allow notifications, then reload this
                page.
              </p>
            </div>
          )}
        </div>

        {featuresError && <p className="mt-4 text-sm text-red-600">{featuresError}</p>}
        {featuresSuccess && (
          <p className="mt-4 text-sm text-green-600">Features updated successfully.</p>
        )}

        <button
          type="button"
          onClick={handleSaveFeatures}
          disabled={featuresSaving}
          className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {featuresSaving ? "Saving..." : "Save Features"}
        </button>
      </div>

      <SmtpConfigSection />

      <AppPermissionsSection />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setBrandingSelection("annix");
              setBrandingError("");
              setBrandingSuccess(false);
            }}
            className={`relative flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
              brandingSelection === "annix"
                ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500"
                : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
            }`}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mb-3">
              <svg
                className="w-6 h-6 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Annix Branding</h3>
            <p className="mt-1 text-sm text-gray-500 text-center">
              Default ASCA corporate identity
            </p>
            {brandingSelection === "annix" && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setBrandingSelection("custom");
              setBrandingError("");
              setBrandingSuccess(false);
            }}
            className={`relative flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
              brandingSelection === "custom"
                ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500"
                : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
            }`}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-3">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Your Branding</h3>
            <p className="mt-1 text-sm text-gray-500 text-center">White-label with your identity</p>
            {brandingSelection === "custom" && (
              <div className="absolute top-2 right-2">
                <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        </div>

        {brandingSelection === "custom" && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
                Your website URL
              </label>
              <input
                id="websiteUrl"
                type="url"
                placeholder="https://yourcompany.com"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setBrandingError("");
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={brandingAuthorized}
                onChange={(e) => {
                  setBrandingAuthorized(e.target.checked);
                  setBrandingError("");
                }}
                className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">
                I authorize ASCA to access my website to extract branding elements (logo, colors)
                for use within this application
              </span>
            </label>
            <button
              type="button"
              onClick={handleExtractBranding}
              disabled={scraping || !brandingAuthorized || !websiteUrl.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scraping ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Extracting branding...
                </>
              ) : logoCandidates.length > 0 || heroCandidates.length > 0 ? (
                "Re-extract Branding"
              ) : (
                "Extract Branding"
              )}
            </button>

            {logoCandidates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Logo Candidates ({logoCandidates.length})
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {logoCandidates.map((candidate) => (
                    <CandidateThumbnail
                      key={candidate.url}
                      candidate={candidate}
                      selected={selectedLogoUrl === candidate.url}
                      onSelect={() => setSelectedLogoUrl(candidate.url)}
                      size="small"
                    />
                  ))}
                </div>
              </div>
            )}

            {heroCandidates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Hero Image Candidates ({heroCandidates.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {heroCandidates.map((candidate) => (
                    <CandidateThumbnail
                      key={candidate.url}
                      candidate={candidate}
                      selected={selectedHeroUrl === candidate.url}
                      onSelect={() => setSelectedHeroUrl(candidate.url)}
                      size="large"
                    />
                  ))}
                </div>
              </div>
            )}

            {processedLogoUrl && logoCandidates.length === 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <img
                  src={processedLogoUrl}
                  alt="Current logo"
                  className="h-12 w-12 object-contain rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Current logo</p>
                  <p className="text-xs text-gray-500">
                    Extract branding to choose a different logo
                  </p>
                </div>
              </div>
            )}

            {processedHeroUrl && heroCandidates.length === 0 && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Current hero image</p>
                <div className="relative rounded overflow-hidden" style={{ maxHeight: 160 }}>
                  <img
                    src={processedHeroUrl}
                    alt="Current hero"
                    className="w-full object-cover rounded"
                    style={{ maxHeight: 160 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Extract branding to choose a different image
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                  Primary Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="primaryColor"
                    type="color"
                    value={primaryColor || "#0d9488"}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor || "#0d9488"}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700">
                  Accent Color
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="accentColor"
                    type="color"
                    value={accentColor || "#2dd4bf"}
                    onChange={(e) => {
                      setAccentColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor || "#2dd4bf"}
                    onChange={(e) => {
                      setAccentColor(e.target.value);
                      setBrandingError("");
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {brandingError && <p className="mt-3 text-sm text-red-600">{brandingError}</p>}
        {brandingSuccess && (
          <p className="mt-3 text-sm text-green-600">Branding preference saved successfully.</p>
        )}

        <button
          type="button"
          onClick={handleSaveBranding}
          disabled={brandingSaving || processing}
          className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {savingLabel()}
        </button>
      </div>

      <AdminTransferSection />

      <AppInfoSection />
    </div>
  );
}

function AdminTransferSection() {
  const { data: companyRoles = [] } = useCompanyRoles();
  const { confirm, ConfirmDialog } = useConfirm();
  const pendingTransferMutation = usePendingAdminTransfer();
  const initiateTransferMutation = useInitiateAdminTransfer();
  const resendTransferMutation = useResendAdminTransfer();
  const cancelTransferMutation = useCancelAdminTransfer();

  const [targetEmail, setTargetEmail] = useState("");
  const [selectedNewRole, setSelectedNewRole] = useState<string | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingTransfer, setPendingTransfer] = useState<AdminTransferPending | null>(null);
  const [loadingPending, setLoadingPending] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);

  const nonAdminRoles = companyRoles.filter((r) => r.key !== "admin");

  const loadPendingTransfer = useCallback(async () => {
    try {
      const result = await pendingTransferMutation.mutateAsync();
      setPendingTransfer(result);
    } catch {
      setPendingTransfer(null);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadPendingTransfer();
  }, [loadPendingTransfer]);

  const handleInitiate = async () => {
    setError("");
    setSuccess("");

    if (!targetEmail.trim()) {
      setError("Please enter the new admin's email address.");
      return;
    }

    if (!isValidEmail(targetEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (selectedNewRole === null && selectedNewRole !== null) {
      setError("Please select your new role.");
      return;
    }

    const confirmed = await confirm({
      title: "Transfer Admin Role",
      message: `Are you sure you want to transfer admin to ${targetEmail.trim()}? This will take effect when they next log in.`,
      variant: "warning",
    });
    if (!confirmed) return;

    setInitiating(true);
    try {
      const result = await initiateTransferMutation.mutateAsync([
        targetEmail.trim(),
        selectedNewRole,
      ] as [string, string | null]);
      setSuccess(result.message);
      setTargetEmail("");
      setSelectedNewRole(null);
      await loadPendingTransfer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initiate transfer");
    } finally {
      setInitiating(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const result = await resendTransferMutation.mutateAsync();
      setSuccess(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend email");
    } finally {
      setResending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!pendingTransfer) return;
    const frontendUrl = window.location.origin;
    const link = `${frontendUrl}/stock-control/login?admin-transfer=${pendingTransfer.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy link to clipboard");
    }
  };

  const handleCancel = async () => {
    if (!pendingTransfer) return;

    const confirmed = await confirm({
      title: "Cancel Admin Transfer",
      message: "Are you sure you want to cancel this admin transfer?",
    });
    if (!confirmed) return;

    setCancelling(true);
    try {
      await cancelTransferMutation.mutateAsync(pendingTransfer.id);
      setPendingTransfer(null);
      setSuccess("Admin transfer cancelled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel transfer");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {ConfirmDialog}
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Admin Transfer</h2>
      <p className="text-sm text-gray-500 mb-4">
        Transfer your admin role to another team member. The transfer will only complete once the
        new admin logs in.
      </p>

      {loadingPending ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-500 border-t-transparent" />
          Loading...
        </div>
      ) : pendingTransfer ? (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Pending Admin Transfer</p>
                <p className="text-sm text-amber-700 mt-1">
                  Waiting for <strong>{pendingTransfer.targetEmail}</strong> to log in and accept
                  the transfer.
                </p>
                {pendingTransfer.newRoleForInitiator ? (
                  <p className="text-xs text-amber-600 mt-1">
                    Your role after transfer:{" "}
                    <strong>
                      {(() => {
                        const matchedRole = nonAdminRoles.find(
                          (r) => r.key === pendingTransfer.newRoleForInitiator,
                        );
                        const roleLabel = matchedRole ? matchedRole.label : null;
                        return roleLabel ? roleLabel : pendingTransfer.newRoleForInitiator;
                      })()}
                    </strong>
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-1">
                    You will be removed from the app after transfer.
                  </p>
                )}
                <p className="text-xs text-amber-500 mt-1">
                  Expires:{" "}
                  {fromISO(pendingTransfer.expiresAt).toJSDate().toLocaleDateString("en-ZA")}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? "Sending..." : "Resend Email"}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelling ? "Cancelling..." : "Cancel Transfer"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="transferEmail" className="block text-sm font-medium text-gray-700 mb-1">
              New Admin Email Address
            </label>
            <input
              id="transferEmail"
              type="email"
              value={targetEmail}
              onChange={(e) => {
                setTargetEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              placeholder="Enter the email of the new admin"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              The new admin must already be a team member of your company.
            </p>
          </div>

          <div>
            <label htmlFor="newRole" className="block text-sm font-medium text-gray-700 mb-1">
              Your New Role After Transfer
            </label>
            <select
              id="newRole"
              value={selectedNewRole || "__leave__"}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedNewRole(val === "__leave__" ? null : val);
                setError("");
                setSuccess("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="__leave__">Leave the App</option>
              {nonAdminRoles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {selectedNewRole === null
                ? "Your account will be removed. You can be re-invited later by the new admin."
                : "You will continue to have access with this role."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleInitiate}
            disabled={initiating}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {initiating ? "Sending..." : "Initiate Transfer"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
    </div>
  );
}

function AppInfoSection() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [version, setVersion] = useState<string | null>(null);
  const [swStatus, setSwStatus] = useState<"active" | "waiting" | "none">("none");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration("/stock-control").then((registration) => {
        if (registration?.active) {
          setSwStatus("active");
          registration.active.postMessage({ type: "GET_VERSION" });
        }
        if (registration?.waiting) {
          setSwStatus("waiting");
        }
      });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "VERSION") {
          setVersion(event.data.version);
        }
      });
    }

    const status = syncStatus();
    setLastSync(status.lastSyncAt);
  }, []);

  const handleUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration("/stock-control");
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const handleClearCache = async () => {
    const confirmed = await confirm({
      title: "Clear Cache",
      message: "Clear all cached data? You will need to re-download data when online.",
      confirmLabel: "Clear",
      variant: "warning",
    });
    if (confirmed) {
      const registration = await navigator.serviceWorker.getRegistration("/stock-control");
      if (registration?.active) {
        registration.active.postMessage({ type: "CLEAR_CACHE" });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {ConfirmDialog}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">App Info</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">App Version</span>
          <span className="text-sm font-medium text-gray-900">
            {version ?? STOCK_CONTROL_VERSION}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Service Worker</span>
          <span
            className={`text-sm font-medium ${
              swStatus === "active"
                ? "text-green-600"
                : swStatus === "waiting"
                  ? "text-amber-600"
                  : "text-gray-500"
            }`}
          >
            {swStatus === "active"
              ? "Active"
              : swStatus === "waiting"
                ? "Update Available"
                : "Not Registered"}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Offline Support</span>
          <span className="text-sm font-medium text-green-600">Enabled</span>
        </div>

        {lastSync && (
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Last Sync</span>
            <span className="text-sm font-medium text-gray-900">
              {fromISO(lastSync).toJSDate().toLocaleString("en-ZA")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {swStatus === "waiting" && (
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
          >
            Update Now
          </button>
        )}
        <button
          onClick={handleClearCache}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}

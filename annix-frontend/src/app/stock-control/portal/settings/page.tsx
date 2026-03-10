"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import {
  CandidateImage,
  EligibleUser,
  StepNotificationRecipients,
  StockControlDepartment,
  StockControlInvitation,
  StockControlLocation,
  StockControlTeamMember,
  stockControlApiClient,
  UserLocationSummary,
  WorkflowStepAssignment,
} from "@/app/lib/api/stockControlApi";
import { syncStatus } from "../../lib/offline/syncManager";
import { roleLabel } from "../../lib/roleLabels";
import { AppPermissionsSection } from "./AppPermissionsSection";
import { SmtpConfigSection } from "./SmtpConfigSection";

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

function CandidateThumbnail({
  candidate,
  selected,
  onSelect,
  size,
}: {
  candidate: CandidateImage;
  selected: boolean;
  onSelect: () => void;
  size: "small" | "large";
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    const proxyUrl = stockControlApiClient.proxyImageUrl(candidate.url);
    const headers = stockControlApiClient.authHeaders();

    fetch(proxyUrl, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error("proxy failed");
        }
        return res.blob();
      })
      .then((blob) => {
        if (!revoked) {
          setObjectUrl(URL.createObjectURL(blob));
        }
      })
      .catch(() => {
        if (!revoked) {
          setFailed(true);
        }
      });

    return () => {
      revoked = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [candidate.url]);

  if (failed) {
    return null;
  }

  const heightClass = size === "small" ? "h-16" : "h-32";
  const label = SOURCE_LABELS[candidate.source] || candidate.source;

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
          onError={() => setFailed(true)}
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

export default function StockControlSettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useStockControlAuth();

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

  const [teamMembers, setTeamMembers] = useState<StockControlTeamMember[]>([]);
  const [invitations, setInvitations] = useState<StockControlInvitation[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("storeman");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [sendingAppLinkId, setSendingAppLinkId] = useState<number | null>(null);

  const [departments, setDepartments] = useState<StockControlDepartment[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [departmentError, setDepartmentError] = useState("");

  const [locations, setLocations] = useState<StockControlLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationDescription, setNewLocationDescription] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [editingLocationDescription, setEditingLocationDescription] = useState("");
  const [locationError, setLocationError] = useState("");

  const loadTeamData = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [members, invites] = await Promise.all([
        stockControlApiClient.teamMembers(),
        stockControlApiClient.companyInvitations(),
      ]);
      setTeamMembers(members);
      setInvitations(invites);
    } catch {
      // Silent fail
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const data = await stockControlApiClient.departments();
      setDepartments(data);
    } catch {
      // Silent fail
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const data = await stockControlApiClient.locations();
      setLocations(data);
    } catch {
      // Silent fail
    } finally {
      setLocationsLoading(false);
    }
  }, []);

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

    loadTeamData();
    loadDepartments();
    loadLocations();
  }, [user, profile, router, loadTeamData, loadDepartments, loadLocations]);

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

    setDetailsError("");
    setDetailsSaving(true);
    setDetailsSuccess(false);

    try {
      await stockControlApiClient.updateCompanyDetails({
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
      const result = await stockControlApiClient.scrapeBranding(normalizedUrl);

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
        const processed = await stockControlApiClient.processBrandingSelection({
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

      await stockControlApiClient.setBranding({
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

  const handleRoleChange = async (memberId: number, newRole: string) => {
    try {
      await stockControlApiClient.updateMemberRole(memberId, newRole);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update role";
      alert(msg);
    }
  };

  const handleSendAppLink = async (memberId: number) => {
    setSendingAppLinkId(memberId);
    try {
      await stockControlApiClient.sendAppLink(memberId);
      alert("App link sent successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send app link";
      alert(msg);
    } finally {
      setSendingAppLinkId(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("Please enter an email address.");
      return;
    }

    setInviteError("");
    setInviteSending(true);

    try {
      await stockControlApiClient.createInvitation(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("storeman");
      setShowInviteForm(false);
      await loadTeamData();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invitation.");
    } finally {
      setInviteSending(false);
    }
  };

  const handleCancelInvitation = async (id: number) => {
    try {
      await stockControlApiClient.cancelInvitation(id);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to cancel invitation";
      alert(msg);
    }
  };

  const handleResendInvitation = async (id: number) => {
    try {
      await stockControlApiClient.resendInvitation(id);
      await loadTeamData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to resend invitation";
      alert(msg);
    }
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      manager: "Manager",
      accounts: "Accounts",
      storeman: "Storeman",
    };
    return labels[role] || role;
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    setDepartmentError("");
    try {
      await stockControlApiClient.createDepartment(newDepartmentName.trim());
      setNewDepartmentName("");
      await loadDepartments();
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to add department");
    }
  };

  const handleUpdateDepartment = async (id: number) => {
    if (!editingDepartmentName.trim()) return;
    setDepartmentError("");
    try {
      await stockControlApiClient.updateDepartment(id, { name: editingDepartmentName.trim() });
      setEditingDepartmentId(null);
      await loadDepartments();
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to update department");
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    setDepartmentError("");
    try {
      await stockControlApiClient.deleteDepartment(id);
      await loadDepartments();
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to delete department");
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    setLocationError("");
    try {
      await stockControlApiClient.createLocation(
        newLocationName.trim(),
        newLocationDescription.trim() || undefined,
      );
      setNewLocationName("");
      setNewLocationDescription("");
      await loadLocations();
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to add location");
    }
  };

  const handleUpdateLocation = async (id: number) => {
    if (!editingLocationName.trim()) return;
    setLocationError("");
    try {
      await stockControlApiClient.updateLocation(id, {
        name: editingLocationName.trim(),
        description: editingLocationDescription.trim() || null,
      });
      setEditingLocationId(null);
      await loadLocations();
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to update location");
    }
  };

  const handleDeleteLocation = async (id: number) => {
    setLocationError("");
    try {
      await stockControlApiClient.deleteLocation(id);
      await loadLocations();
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to delete location");
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
      <h1 className="text-2xl font-bold text-gray-900 lg:col-span-2">Account Settings</h1>

      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
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
              placeholder="info@company.co.za"
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

      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
          <button
            type="button"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
          >
            Invite Member
          </button>
        </div>

        {showInviteForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="storeman">Storeman</option>
                <option value="accounts">Accounts</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviteSending}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {inviteSending ? "Sending..." : "Send"}
              </button>
            </div>
            {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
          </div>
        )}

        {teamLoading ? (
          <div className="text-center py-8 text-gray-500">Loading team...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-2 text-left text-xs font-medium uppercase text-gray-500">
                      Name
                    </th>
                    <th className="hidden py-3 px-2 text-left text-xs font-medium uppercase text-gray-500 sm:table-cell">
                      Email
                    </th>
                    <th className="py-3 px-2 text-left text-xs font-medium uppercase text-gray-500">
                      Role
                    </th>
                    <th className="hidden py-3 px-2 text-left text-xs font-medium uppercase text-gray-500 md:table-cell">
                      Joined
                    </th>
                    <th className="py-3 px-2 text-right text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100">
                      <td className="py-3 px-2 text-sm text-gray-900">{member.name}</td>
                      <td className="hidden py-3 px-2 text-sm text-gray-500 sm:table-cell">
                        {member.email}
                      </td>
                      <td className="py-3 px-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500"
                        >
                          <option value="storeman">Storeman</option>
                          <option value="accounts">Accounts</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="hidden py-3 px-2 text-sm text-gray-500 md:table-cell">
                        {new Date(member.createdAt).toLocaleDateString("en-ZA")}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleSendAppLink(member.id)}
                          disabled={sendingAppLinkId === member.id}
                          className="text-xs font-medium text-teal-600 hover:text-teal-800 disabled:opacity-50"
                        >
                          {sendingAppLinkId === member.id ? "Sending..." : "Send Link"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invitations.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</h3>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 truncate">
                        <span className="text-sm text-gray-900">{inv.email}</span>
                        <span className="ml-2 text-xs text-gray-500">({roleLabel(inv.role)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv.id)}
                          className="text-xs font-medium text-teal-600 hover:text-teal-800"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Departments & Locations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Departments</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manage departments that can be assigned to staff members.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New department name"
                value={newDepartmentName}
                onChange={(e) => {
                  setNewDepartmentName(e.target.value);
                  setDepartmentError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDepartment();
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAddDepartment}
                disabled={!newDepartmentName.trim()}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>

            {departmentError && <p className="text-sm text-red-600 mb-4">{departmentError}</p>}

            {departmentsLoading ? (
              <div className="text-center py-4 text-gray-500">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No departments yet</div>
            ) : (
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {editingDepartmentId === dept.id ? (
                      <input
                        type="text"
                        value={editingDepartmentName}
                        onChange={(e) => setEditingDepartmentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateDepartment(dept.id);
                          if (e.key === "Escape") setEditingDepartmentId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{dept.name}</span>
                    )}
                    <div className="flex items-center gap-2">
                      {editingDepartmentId === dept.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateDepartment(dept.id)}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDepartmentId(null)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDepartmentId(dept.id);
                              setEditingDepartmentName(dept.name);
                            }}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(dept.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Locations</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manage storage locations for inventory items.
            </p>

            <div className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="New location name"
                value={newLocationName}
                onChange={(e) => {
                  setNewLocationName(e.target.value);
                  setLocationError("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newLocationDescription}
                onChange={(e) => setNewLocationDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLocation();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                disabled={!newLocationName.trim()}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                Add Location
              </button>
            </div>

            {locationError && <p className="text-sm text-red-600 mb-4">{locationError}</p>}

            {locationsLoading ? (
              <div className="text-center py-4 text-gray-500">Loading locations...</div>
            ) : locations.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No locations yet</div>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {editingLocationId === loc.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input
                          type="text"
                          value={editingLocationName}
                          onChange={(e) => setEditingLocationName(e.target.value)}
                          autoFocus
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        />
                        <input
                          type="text"
                          value={editingLocationDescription}
                          onChange={(e) => setEditingLocationDescription(e.target.value)}
                          placeholder="Description (optional)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateLocation(loc.id);
                            if (e.key === "Escape") setEditingLocationId(null);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">{loc.name}</span>
                        {loc.description && (
                          <span className="ml-2 text-xs text-gray-500">{loc.description}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {editingLocationId === loc.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateLocation(loc.id)}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLocationId(null)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocationId(loc.id);
                              setEditingLocationName(loc.name);
                              setEditingLocationDescription(loc.description ?? "");
                            }}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <WorkflowConfigurationSection teamMembers={teamMembers} />
      <UserLocationAssignmentsSection locations={locations} teamMembers={teamMembers} />
      <AppInfoSection />
    </div>
  );
}

const WORKFLOW_STEPS = [
  { key: "DOCUMENT_UPLOAD", label: "Doc Upload" },
  { key: "ADMIN_APPROVAL", label: "Admin" },
  { key: "MANAGER_APPROVAL", label: "Manager" },
  { key: "REQUISITION_SENT", label: "Requisition" },
  { key: "STOCK_ALLOCATION", label: "Stock Alloc" },
  { key: "MANAGER_FINAL", label: "Final Mgr" },
  { key: "READY_FOR_DISPATCH", label: "Ready" },
  { key: "DISPATCHED", label: "Dispatched" },
];

type WorkflowTab = "assignments" | "notifications";

function WorkflowConfigurationSection({ teamMembers }: { teamMembers: StockControlTeamMember[] }) {
  const [assignments, setAssignments] = useState<WorkflowStepAssignment[]>([]);
  const [recipients, setRecipients] = useState<StepNotificationRecipients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkflowTab>("assignments");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const [editingNotifyStep, setEditingNotifyStep] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [editEmails, setEditEmails] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentData, recipientData] = await Promise.all([
        stockControlApiClient.workflowAssignments(),
        stockControlApiClient.notificationRecipients(),
      ]);
      setAssignments(assignmentData);
      setRecipients(recipientData);
    } catch {
      setError("Failed to load workflow configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentsByStep = assignments.reduce<Record<string, WorkflowStepAssignment>>(
    (acc, a) => ({ ...acc, [a.step]: a }),
    {},
  );

  const recipientsByStep = recipients.reduce<Record<string, StepNotificationRecipients>>(
    (acc, r) => ({ ...acc, [r.step]: r }),
    {},
  );

  const allUsers = assignments.reduce<EligibleUser[]>((acc, a) => {
    a.users.forEach((u) => {
      if (!acc.some((existing) => existing.id === u.id)) {
        acc.push(u);
      }
    });
    return acc;
  }, []);

  const uniqueTeamUsers = teamMembers.reduce<StockControlTeamMember[]>((acc, m) => {
    if (!allUsers.some((u) => u.id === m.id) && !acc.some((existing) => existing.id === m.id)) {
      acc.push(m);
    }
    return acc;
  }, []);

  const matrixUsers = [
    ...allUsers.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    ...uniqueTeamUsers.map((m) => ({ id: m.id, name: m.name, role: m.role })),
  ];

  const isUserAssigned = (userId: number, step: string): boolean => {
    const assignment = assignmentsByStep[step];
    return assignment?.userIds?.includes(userId) ?? false;
  };

  const isPrimaryUser = (userId: number, step: string): boolean => {
    const assignment = assignmentsByStep[step];
    return assignment?.primaryUserId === userId;
  };

  const handleToggleAssignment = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds ?? [];
    const currentPrimary = assignment?.primaryUserId ?? null;

    const isCurrentlyAssigned = currentIds.includes(userId);
    const newIds = isCurrentlyAssigned
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    const newPrimary = isCurrentlyAssigned && currentPrimary === userId ? null : currentPrimary;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, newPrimary ?? undefined);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds ?? [];
    const newIds = currentIds.includes(userId) ? currentIds : [...currentIds, userId];

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, userId);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set primary user");
    } finally {
      setSaving(false);
    }
  };

  const handleEditNotify = (step: string) => {
    const existing = recipientsByStep[step];
    setEditEmails(existing?.emails ?? []);
    setSelectedEmail("");
    setEditingNotifyStep(step);
    setError("");
    setSuccess(false);
  };

  const handleAddEmail = () => {
    if (!selectedEmail) return;
    const trimmed = selectedEmail.trim().toLowerCase();
    if (editEmails.includes(trimmed)) {
      setError("This user has already been added");
      return;
    }
    setEditEmails((prev) => [...prev, trimmed]);
    setSelectedEmail("");
    setError("");
  };

  const handleRemoveEmail = (email: string) => {
    setEditEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSaveNotify = async () => {
    if (!editingNotifyStep) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    const emailsToSave = selectedEmail.trim().toLowerCase()
      ? [...new Set([...editEmails, selectedEmail.trim().toLowerCase()])]
      : editEmails;

    try {
      await stockControlApiClient.updateNotificationRecipients(editingNotifyStep, emailsToSave);
      await loadData();
      setEditingNotifyStep(null);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save recipients");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Workflow Configuration</h2>
      <p className="text-sm text-gray-500 mb-4">
        Manage who is assigned to each workflow step and who receives notifications.
      </p>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "assignments"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Step Assignments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "notifications"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Notifications
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mb-3">Updated successfully.</p>}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading workflow configuration...</div>
      ) : activeTab === "assignments" ? (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            Click a cell to toggle assignment. Right-click (or long-press) to set as primary.
          </p>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-4 pl-1 font-medium text-gray-700 sticky left-0 bg-white min-w-[160px]">
                    Team Member
                  </th>
                  {WORKFLOW_STEPS.map((step) => (
                    <th
                      key={step.key}
                      className="py-2 px-1 font-medium text-gray-700 text-center min-w-[72px]"
                    >
                      <span className="text-xs leading-tight block">{step.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {matrixUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition-colors ${selectedUser === user.id ? "bg-teal-50" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                  >
                    <td className="py-2.5 pr-4 pl-1 sticky left-0 bg-inherit">
                      <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      <div className="text-xs text-gray-400">
                        {roleLabel(user.role)}
                      </div>
                    </td>
                    {WORKFLOW_STEPS.map((step) => {
                      const assigned = isUserAssigned(user.id, step.key);
                      const primary = isPrimaryUser(user.id, step.key);

                      return (
                        <td key={step.key} className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAssignment(user.id, step.key);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (assigned) {
                                handleSetPrimary(user.id, step.key);
                              }
                            }}
                            className={`w-8 h-8 rounded-md border transition-all inline-flex items-center justify-center ${
                              primary
                                ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                                : assigned
                                  ? "bg-teal-100 border-teal-300 text-teal-700"
                                  : "bg-white border-gray-200 text-gray-300 hover:border-gray-300"
                            } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                            title={
                              primary
                                ? `${user.name} is primary for ${step.label}`
                                : assigned
                                  ? `${user.name} assigned to ${step.label} (right-click for primary)`
                                  : `Assign ${user.name} to ${step.label}`
                            }
                          >
                            {primary ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                                />
                              </svg>
                            ) : assigned ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-teal-100 border border-teal-300 inline-block" />
              Assigned
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-teal-600 border border-teal-600 inline-block" />
              Primary
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-white border border-gray-200 inline-block" />
              Not assigned
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {WORKFLOW_STEPS.map((step) => {
            const recipient = recipientsByStep[step.key];
            const isEditing = editingNotifyStep === step.key;
            const emailCount = recipient?.emails?.length ?? 0;

            return (
              <div
                key={step.key}
                className={`border rounded-lg p-4 transition-colors ${
                  isEditing ? "border-teal-300 bg-teal-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 text-sm">{step.label}</h3>
                    {emailCount > 0 && !isEditing && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {emailCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isEditing ? setEditingNotifyStep(null) : handleEditNotify(step.key)
                    }
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <select
                        value={selectedEmail}
                        onChange={(e) => setSelectedEmail(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">Select a team member...</option>
                        {teamMembers
                          .filter((m) => !editEmails.includes(m.email.toLowerCase()))
                          .map((member) => (
                            <option key={member.id} value={member.email.toLowerCase()}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        disabled={!selectedEmail}
                        className="px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {editEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {editEmails.map((email) => {
                          const member = teamMembers.find((m) => m.email.toLowerCase() === email);
                          return (
                            <span
                              key={email}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {member ? member.name : email}
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(email)}
                                className="ml-1.5 text-blue-600 hover:text-blue-800"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveNotify}
                        disabled={saving}
                        className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNotifyStep(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  emailCount > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {recipient.emails.map((email) => {
                        const member = teamMembers.find(
                          (m) => m.email.toLowerCase() === email.toLowerCase(),
                        );
                        return (
                          <span
                            key={email}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {member ? member.name : email}
                          </span>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserLocationAssignmentsSection({
  locations,
  teamMembers,
}: {
  locations: StockControlLocation[];
  teamMembers: StockControlTeamMember[];
}) {
  const [userLocations, setUserLocations] = useState<UserLocationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const activeLocations = locations.filter((l) => l.active);
  const eligibleMembers = teamMembers.filter(
    (m) => m.role === "storeman" || m.role === "manager" || m.role === "admin",
  );

  const loadUserLocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockControlApiClient.userLocationAssignments();
      setUserLocations(data);
    } catch {
      setError("Failed to load user location assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserLocations();
  }, [loadUserLocations]);

  const isLocationAssigned = (userId: number, locationId: number): boolean => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    return userLoc?.locationIds?.includes(locationId) ?? false;
  };

  const handleToggleLocation = async (userId: number, locationId: number) => {
    const userLoc = userLocations.find((ul) => ul.userId === userId);
    const currentIds = userLoc?.locationIds ?? [];
    const newIds = currentIds.includes(locationId)
      ? currentIds.filter((id) => id !== locationId)
      : [...currentIds, locationId];

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateUserLocations(userId, newIds);
      await loadUserLocations();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update location assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Store Location Assignments</h2>
      <p className="text-sm text-gray-500 mb-4">
        Click a cell to toggle access. Users with no locations assigned can access all locations.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mb-3">Updated successfully.</p>}

      {activeLocations.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No store locations configured. Add locations in the Locations section above first.
        </p>
      ) : loading ? (
        <div className="text-center py-8 text-gray-500">Loading location assignments...</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 pl-1 font-medium text-gray-700 sticky left-0 bg-white min-w-[160px]">
                  Team Member
                </th>
                {activeLocations.map((loc) => (
                  <th
                    key={loc.id}
                    className="py-2 px-1 font-medium text-gray-700 text-center min-w-[72px]"
                  >
                    <span className="text-xs leading-tight block">{loc.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eligibleMembers.map((member) => {
                const userLoc = userLocations.find((ul) => ul.userId === member.id);
                const hasAny = (userLoc?.locationIds?.length ?? 0) > 0;

                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 pl-1 sticky left-0 bg-inherit">
                      <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                      <div className="text-xs text-gray-400">
                        {roleLabel(member.role)}
                        {!hasAny && <span className="ml-1 text-amber-500">(all locations)</span>}
                      </div>
                    </td>
                    {activeLocations.map((loc) => {
                      const assigned = isLocationAssigned(member.id, loc.id);
                      return (
                        <td key={loc.id} className="py-2.5 px-1 text-center">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleToggleLocation(member.id, loc.id)}
                            className={`w-8 h-8 rounded-md border transition-all inline-flex items-center justify-center ${
                              assigned
                                ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                : "bg-white border-gray-200 text-gray-300 hover:border-gray-300"
                            } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                            title={
                              assigned
                                ? `${member.name} can access ${loc.name}`
                                : `Grant ${member.name} access to ${loc.name}`
                            }
                          >
                            {assigned && (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AppInfoSection() {
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
    if (confirm("Clear all cached data? You will need to re-download data when online.")) {
      const registration = await navigator.serviceWorker.getRegistration("/stock-control");
      if (registration?.active) {
        registration.active.postMessage({ type: "CLEAR_CACHE" });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">App Info</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">App Version</span>
          <span className="text-sm font-medium text-gray-900">{version ?? "1.0.0"}</span>
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
              {new Date(lastSync).toLocaleString("en-ZA")}
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

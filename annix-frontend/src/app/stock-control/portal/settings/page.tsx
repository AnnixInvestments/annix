"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import {
  CandidateImage,
  StockControlInvitation,
  StockControlTeamMember,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";

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
        <div className={`${heightClass} w-full flex items-center justify-center bg-gray-100 rounded`}>
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
  const [companyNameSaving, setCompanyNameSaving] = useState(false);
  const [companyNameSuccess, setCompanyNameSuccess] = useState(false);
  const [companyNameError, setCompanyNameError] = useState("");

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

  useEffect(() => {
    if (user?.role !== "admin") {
      router.push("/stock-control/portal/dashboard");
      return;
    }

    if (profile?.companyName) {
      setCompanyName(profile.companyName);
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
  }, [user, profile, router, loadTeamData]);

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleSaveCompanyName = async () => {
    if (!companyName.trim()) {
      setCompanyNameError("Please enter a company name.");
      return;
    }

    setCompanyNameError("");
    setCompanyNameSaving(true);
    setCompanyNameSuccess(false);

    try {
      await stockControlApiClient.updateCompanyName(companyName.trim());
      setCompanyNameSuccess(true);
      await refreshProfile();
    } catch (e) {
      setCompanyNameError(e instanceof Error ? e.message : "Failed to update company name.");
    } finally {
      setCompanyNameSaving(false);
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

      if (result.logoCandidates.length === 0 && result.heroCandidates.length === 0 && !result.primaryColor) {
        setBrandingError("Could not extract branding from this website. You can set colors and logo manually.");
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
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Name</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setCompanyNameError("");
              setCompanyNameSuccess(false);
            }}
            placeholder="Enter company name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
          />
          <button
            type="button"
            onClick={handleSaveCompanyName}
            disabled={companyNameSaving}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {companyNameSaving ? "Saving..." : "Save"}
          </button>
        </div>
        {companyNameError && <p className="mt-3 text-sm text-red-600">{companyNameError}</p>}
        {companyNameSuccess && (
          <p className="mt-3 text-sm text-green-600">Company name updated successfully.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
              ) : (
                logoCandidates.length > 0 || heroCandidates.length > 0 ? "Re-extract Branding" : "Extract Branding"
              )}
            </button>

            {logoCandidates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Logo Candidates ({logoCandidates.length})
                </h3>
                <div className="grid grid-cols-4 gap-2">
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
                  <p className="text-xs text-gray-500">Extract branding to choose a different logo</p>
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
                <p className="text-xs text-gray-500 mt-1">Extract branding to choose a different image</p>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100">
                      <td className="py-3 px-2 text-sm text-gray-900">{member.name}</td>
                      <td className="py-3 px-2 text-sm text-gray-500">{member.email}</td>
                      <td className="py-3 px-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        >
                          <option value="storeman">Storeman</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {new Date(member.createdAt).toLocaleDateString("en-ZA")}
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
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div>
                        <span className="text-sm text-gray-900">{inv.email}</span>
                        <span className="ml-2 text-xs text-gray-500">({roleLabel(inv.role)})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv.id)}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
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
    </div>
  );
}

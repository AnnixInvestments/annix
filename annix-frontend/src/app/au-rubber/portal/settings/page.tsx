"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient, type CandidateImage } from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../components/Breadcrumb";

const SOURCE_LABELS: Record<string, string> = {
  "logo-attr": "Logo element",
  "header-img": "Header image",
  "og-image": "Open Graph",
  favicon: "Favicon",
  "hero-selector": "Hero section",
  "bg-image": "Background",
  "large-img": "Large image",
  "section-img": "Section image",
  "srcset-img": "Srcset image",
  "wp-featured": "WP Featured",
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
    const proxyUrl = auRubberApiClient.proxyImageUrl(candidate.url);
    const headers = auRubberApiClient.authHeaders();

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
          ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500"
          : "border-gray-200 hover:border-yellow-300"
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
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent" />
        </div>
      )}
      <span className="mt-1 text-[10px] text-gray-500 truncate w-full text-center">{label}</span>
      {selected && (
        <div className="absolute top-1 right-1">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
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

export default function SettingsPage() {
  const { showToast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState("https://auind.co.za/");
  const [brandingAuthorized, setBrandingAuthorized] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logoCandidates, setLogoCandidates] = useState<CandidateImage[]>([]);
  const [heroCandidates, setHeroCandidates] = useState<CandidateImage[]>([]);
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null);
  const [selectedHeroUrl, setSelectedHeroUrl] = useState<string | null>(null);
  const [scrapedPrimaryColor, setScrapedPrimaryColor] = useState<string | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#323288");
  const [accentColor, setAccentColor] = useState("#FFD700");

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleExtractBranding = async () => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }
    if (!isValidUrl(websiteUrl)) {
      setError("Please enter a valid website URL");
      return;
    }
    if (!brandingAuthorized) {
      setError("Please authorize AU Rubber to access the website for branding");
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      setLogoCandidates([]);
      setHeroCandidates([]);
      setSelectedLogoUrl(null);
      setSelectedHeroUrl(null);
      setScrapedPrimaryColor(null);

      const normalizedUrl = websiteUrl.startsWith("http")
        ? websiteUrl.trim()
        : `https://${websiteUrl.trim()}`;

      const result = await auRubberApiClient.scrapeBranding(normalizedUrl);

      if (
        result.logoCandidates.length === 0 &&
        result.heroCandidates.length === 0 &&
        !result.primaryColor
      ) {
        setError(
          "Could not extract branding from this website. You can set colors manually below.",
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
          const normalized = normalizeToHex(result.primaryColor);
          if (normalized) {
            setPrimaryColor(normalized);
            setAccentColor(lightenColor(normalized));
          }
        }

        showToast("Branding extracted successfully", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to extract branding";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const normalizeToHex = (color: string): string | null => {
    if (color.startsWith("#")) {
      return color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    }

    const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      return `#${[r, g, b].map((c) => parseInt(c, 10).toString(16).padStart(2, "0")).join("")}`;
    }

    return null;
  };

  const lightenColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const lighten = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.4));

    return `#${[lighten(r), lighten(g), lighten(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  };

  const handleApplyBranding = () => {
    showToast(
      `Branding applied: Primary ${primaryColor}, Accent ${accentColor}${selectedLogoUrl ? ", Logo selected" : ""}${selectedHeroUrl ? ", Hero selected" : ""}`,
      "success",
    );
  };

  const ColorSwatch = ({ color, label }: { color: string; label?: string }) => (
    <div className="flex items-center space-x-2">
      <div
        className="w-8 h-8 rounded border border-gray-300 shadow-sm"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="text-sm font-mono text-gray-600">{label || color}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Settings" }]} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure AU Rubber app branding and preferences
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Brand Extraction</h2>
        <p className="text-sm text-gray-600 mb-4">
          Extract branding colors, logos, and hero images from a website. Enter the URL of your
          company website to automatically detect brand elements.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={brandingAuthorized}
              onChange={(e) => {
                setBrandingAuthorized(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">
              I authorize AU Rubber to access this website to extract branding elements (logo,
              colors, images) for use within this application
            </span>
          </label>

          <button
            onClick={handleExtractBranding}
            disabled={isExtracting || !brandingAuthorized || !websiteUrl.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExtracting ? (
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

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {logoCandidates.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Logo Candidates ({logoCandidates.length})
          </h2>
          <p className="text-sm text-gray-600 mb-4">Select a logo to use for your branding.</p>
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Hero Image Candidates ({heroCandidates.length})
          </h2>
          <p className="text-sm text-gray-600 mb-4">Select a hero image to use as a background.</p>
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

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h2>
        <p className="text-sm text-gray-600 mb-4">
          Adjust the colors to match your brand identity.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
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
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={handleApplyBranding}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            Apply Branding
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Branding</h2>
        <p className="text-sm text-gray-600 mb-4">
          These are the current colors used in the AU Rubber app.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Background</h3>
            <ColorSwatch color="#323288" label="#323288 (Navy)" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Accent</h3>
            <ColorSwatch color="#FFD700" label="#FFD700 (Gold)" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Sidebar</h3>
            <ColorSwatch color="#FFFFFF" label="#FFFFFF (White)" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Text</h3>
            <ColorSwatch color="#1f2937" label="#1f2937 (Gray)" />
          </div>
        </div>
      </div>
    </div>
  );
}

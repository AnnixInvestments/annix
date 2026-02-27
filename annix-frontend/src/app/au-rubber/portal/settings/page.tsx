"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient, type ExtractedBrandingDto } from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../components/Breadcrumb";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState("https://auind.co.za/");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedBranding, setExtractedBranding] = useState<ExtractedBrandingDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtractBranding = async () => {
    if (!websiteUrl) {
      showToast("Please enter a website URL", "error");
      return;
    }

    try {
      setIsExtracting(true);
      setError(null);
      const result = await auRubberApiClient.extractBranding(websiteUrl);
      setExtractedBranding(result);
      showToast("Branding extracted successfully", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to extract branding";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsExtracting(false);
    }
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
          Extract branding colors and information from a website. Enter the URL of your company
          website to automatically detect colors, logo, and other brand elements.
        </p>

        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
            />
          </div>
          <button
            onClick={handleExtractBranding}
            disabled={isExtracting || !websiteUrl}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExtracting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
                Extracting...
              </span>
            ) : (
              "Extract Branding"
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {extractedBranding && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Extracted Branding</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {extractedBranding.companyName || "Not detected"}
                </p>
              </div>

              {extractedBranding.tagline && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Tagline / Description</h3>
                  <p className="text-gray-700">{extractedBranding.tagline}</p>
                </div>
              )}

              {extractedBranding.logoUrl && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Logo</h3>
                  <img
                    src={extractedBranding.logoUrl}
                    alt="Company logo"
                    className="max-h-20 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500">Extracted At</h3>
                <p className="text-gray-600 text-sm">
                  {new Date(extractedBranding.extractedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {extractedBranding.colors.primary.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Primary Colors</h3>
                  <div className="flex flex-wrap gap-3">
                    {extractedBranding.colors.primary.map((color, i) => (
                      <ColorSwatch key={i} color={color} />
                    ))}
                  </div>
                </div>
              )}

              {extractedBranding.colors.accent.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Accent Colors</h3>
                  <div className="flex flex-wrap gap-3">
                    {extractedBranding.colors.accent.map((color, i) => (
                      <ColorSwatch key={i} color={color} />
                    ))}
                  </div>
                </div>
              )}

              {extractedBranding.colors.background.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Background Colors</h3>
                  <div className="flex flex-wrap gap-3">
                    {extractedBranding.colors.background.map((color, i) => (
                      <ColorSwatch key={i} color={color} />
                    ))}
                  </div>
                </div>
              )}

              {extractedBranding.colors.text.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Text Colors</h3>
                  <div className="flex flex-wrap gap-3">
                    {extractedBranding.colors.text.map((color, i) => (
                      <ColorSwatch key={i} color={color} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Apply Branding</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select colors from above to apply to your app branding. This feature will be available
              in a future update.
            </p>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-white bg-gray-400 rounded-md cursor-not-allowed"
            >
              Apply Colors (Coming Soon)
            </button>
          </div>
        </div>
      )}

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

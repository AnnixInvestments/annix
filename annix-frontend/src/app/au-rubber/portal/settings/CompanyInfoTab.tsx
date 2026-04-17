"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberAppProfileDto } from "@/app/lib/api/rubberPortalApi";

const EMPTY_PROFILE: RubberAppProfileDto = {
  id: 1,
  legalName: null,
  tradingName: null,
  vatNumber: null,
  registrationNumber: null,
  streetAddress: null,
  city: null,
  province: null,
  postalCode: null,
  postalAddress: null,
  deliveryAddress: null,
  phone: null,
  email: null,
  websiteUrl: null,
  logoUrl: null,
};

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{props.label}</label>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
      />
    </div>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const rawPropsRows = props.rows;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{props.label}</label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={rawPropsRows || 3}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
      />
    </div>
  );
}

export function CompanyInfoTab() {
  const { showToast } = useToast();
  const { branding } = useAuRubberBranding();
  const [profile, setProfile] = useState<RubberAppProfileDto>(EMPTY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const rawProfileLegalName = profile.legalName;
  const rawProfileTradingName = profile.tradingName;
  const rawProfileVatNumber = profile.vatNumber;
  const rawProfileRegistrationNumber = profile.registrationNumber;
  const rawProfileStreetAddress = profile.streetAddress;
  const rawProfileCity = profile.city;
  const rawProfileProvince = profile.province;
  const rawProfilePostalCode = profile.postalCode;
  const rawProfilePhone = profile.phone;
  const rawProfileEmail = profile.email;
  const rawProfilePostalAddress = profile.postalAddress;
  const rawProfileDeliveryAddress = profile.deliveryAddress;
  const rawProfileWebsiteUrl = profile.websiteUrl;
  const rawProfileLogoUrl = profile.logoUrl;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await auRubberApiClient.appProfile();
        if (!data.logoUrl && branding.logoUrl) {
          data.logoUrl = branding.logoUrl;
        }
        setProfile(data);
      } catch (err) {
        console.error("Failed to load app profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await auRubberApiClient.updateAppProfile(profile);
      setProfile(updated);
      showToast("Company info saved", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const streetBlock = [profile.streetAddress, profile.city, profile.province, profile.postalCode]
    .filter(Boolean)
    .join("\n");

  const updateField = (field: keyof RubberAppProfileDto, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value || null }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
          <p className="text-sm text-gray-500">
            These details appear on all generated documents (order confirmations, invoices, etc.)
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Legal Name"
            value={rawProfileLegalName || ""}
            onChange={(v) => updateField("legalName", v)}
            placeholder="AU Industries (Pty) Ltd"
          />
          <TextField
            label="Trading Name"
            value={rawProfileTradingName || ""}
            onChange={(v) => updateField("tradingName", v)}
            placeholder="AU Industries"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="VAT Number"
            value={rawProfileVatNumber || ""}
            onChange={(v) => updateField("vatNumber", v)}
          />
          <TextField
            label="Registration Number"
            value={rawProfileRegistrationNumber || ""}
            onChange={(v) => updateField("registrationNumber", v)}
          />
        </div>

        <hr className="border-gray-200" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Street Address"
            value={rawProfileStreetAddress || ""}
            onChange={(v) => updateField("streetAddress", v)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="City"
              value={rawProfileCity || ""}
              onChange={(v) => updateField("city", v)}
            />
            <TextField
              label="Province"
              value={rawProfileProvince || ""}
              onChange={(v) => updateField("province", v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Postal Code"
            value={rawProfilePostalCode || ""}
            onChange={(v) => updateField("postalCode", v)}
          />
          <TextField
            label="Phone"
            value={rawProfilePhone || ""}
            onChange={(v) => updateField("phone", v)}
          />
          <TextField
            label="Email"
            value={rawProfileEmail || ""}
            onChange={(v) => updateField("email", v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Postal Address (one line per row)
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.postalAddress === streetBlock}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateField("postalAddress", streetBlock);
                    }
                  }}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                Same as street address
              </label>
            </div>
            <textarea
              value={rawProfilePostalAddress || ""}
              onChange={(e) => updateField("postalAddress", e.target.value)}
              placeholder={"PO Box 1234\nCity\nProvince\n1234"}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Address (one line per row)
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.deliveryAddress === streetBlock}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateField("deliveryAddress", streetBlock);
                    }
                  }}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
                Same as street address
              </label>
            </div>
            <textarea
              value={rawProfileDeliveryAddress || ""}
              onChange={(e) => updateField("deliveryAddress", e.target.value)}
              placeholder={"123 Street Name\nCity\nProvince\n1234"}
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm border p-2"
            />
          </div>
        </div>

        <hr className="border-gray-200" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Website URL"
            value={rawProfileWebsiteUrl || ""}
            onChange={(v) => updateField("websiteUrl", v)}
          />
          <TextField
            label="Logo URL"
            value={rawProfileLogoUrl || ""}
            onChange={(v) => updateField("logoUrl", v)}
            placeholder="https://... (from branding extraction)"
          />
        </div>

        {profile.logoUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Preview</label>
            <img
              src={auRubberApiClient.proxyImageUrl(profile.logoUrl)}
              alt="Company logo"
              className="h-16 max-w-[200px] object-contain border rounded p-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}

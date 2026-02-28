"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto, RubberPricingTierDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import { TableEmptyState, TableIcons, TableLoadingState } from "../../components/TableComponents";

export default function AuRubberPricingTiersPage() {
  const { showToast } = useToast();

  const [tiers, setTiers] = useState<RubberPricingTierDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<RubberPricingTierDto | null>(null);
  const [deleteTierId, setDeleteTierId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    pricingFactor: 100,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tiersData, companiesData] = await Promise.all([
        auRubberApiClient.pricingTiers(),
        auRubberApiClient.companies(),
      ]);
      setTiers(tiersData);
      setCompanies(companiesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const companyCountByTier = (tierId: number) => {
    return companies.filter((c) => c.pricingTierId === tierId).length;
  };

  const openNewModal = () => {
    setEditingTier(null);
    setFormData({
      name: "",
      pricingFactor: 100,
    });
    setShowModal(true);
  };

  const openEditModal = (tier: RubberPricingTierDto) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      pricingFactor: tier.pricingFactor,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editingTier) {
        await auRubberApiClient.updatePricingTier(editingTier.id, formData);
      } else {
        await auRubberApiClient.createPricingTier(formData);
      }
      showToast(editingTier ? "Pricing tier updated" : "Pricing tier created", "success");
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save pricing tier";
      showToast(errorMessage, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deletePricingTier(id);
      showToast("Pricing tier deleted", "success");
      setDeleteTierId(null);
      fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete pricing tier";
      showToast(errorMessage, "error");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Pricing Tiers</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Pricing Tiers" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Tiers</h1>
          <p className="mt-1 text-sm text-gray-600">Manage pricing multipliers for companies</p>
        </div>
        <button
          onClick={openNewModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Pricing Tier
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading pricing tiers..." />
        ) : tiers.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.currency />}
            title="No pricing tiers found"
            subtitle="Get started by adding your first pricing tier."
            action={{ label: "Add Pricing Tier", onClick: openNewModal }}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Pricing Factor
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Effect
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Companies
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tiers.map((tier) => {
                const companyCount = companyCountByTier(tier.id);
                return (
                  <tr key={tier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {tier.pricingFactor}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tier.pricingFactor === 100
                        ? "Standard pricing"
                        : tier.pricingFactor > 100
                          ? `${tier.pricingFactor - 100}% markup`
                          : `${100 - tier.pricingFactor}% discount`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${companyCount > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}
                      >
                        {companyCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(tier)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTierId(tier.id)}
                        className={`ml-4 ${companyCount > 0 ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:text-red-900"}`}
                        disabled={companyCount > 0}
                        title={
                          companyCount > 0
                            ? `Cannot delete: ${companyCount} company(ies) assigned`
                            : "Delete tier"
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTier ? "Edit Pricing Tier" : "Add Pricing Tier"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tier Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="e.g. Standard, Premium, VIP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pricing Factor (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.pricingFactor}
                    onChange={(e) =>
                      setFormData({ ...formData, pricingFactor: Number(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="100"
                    min="0"
                    max="500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    100% = standard pricing. Below 100% = discount. Above 100% = markup.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTierId !== null}
        title="Delete Pricing Tier"
        message="Are you sure you want to delete this pricing tier? Companies using this tier will need to be reassigned."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteTierId && handleDelete(deleteTierId)}
        onCancel={() => setDeleteTierId(null)}
      />
    </div>
  );
}

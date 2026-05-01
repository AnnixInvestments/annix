"use client";

import { CODING_TYPES, CodingType } from "@annix/product-data/rubber/codingTypes";
import { toPairs as entries, isArray } from "es-toolkit/compat";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pagination, TableLoadingState } from "@/app/components/shared/TableComponents";
import { useToast } from "@/app/components/Toast";
import { usePersistedState } from "@/app/hooks/usePersistedState";
import { auRubberApiClient, type RubberSpecificationDto } from "@/app/lib/api/auRubberApi";
import type { RubberProductCodingDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import { RequirePermission } from "../../components/RequirePermission";

const ITEMS_PER_PAGE = 25;

import { PAGE_PERMISSIONS } from "../../config/pagePermissions";

const SANS_1198_TAB = "SANS_1198" as const;
type TabType = CodingType | typeof SANS_1198_TAB;

function SpecificationsTable({
  specs,
  isLoading,
}: {
  specs: RubberSpecificationDto[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <TableLoadingState
        message="Loading SANS 1198 specifications..."
        spinnerClassName="border-b-2 border-yellow-600"
      />
    );
  }

  if (specs.length === 0) {
    return <div className="text-center py-12 text-gray-500">No specifications found</div>;
  }

  const groupedByType = specs.reduce<Record<string, RubberSpecificationDto[]>>((acc, spec) => {
    const rawSpecRubberTypeName = spec.rubberTypeName;
    const key = `${spec.typeNumber}-${rawSpecRubberTypeName || "Unknown"}`;
    const rawAccByKey = acc[key];
    return { ...acc, [key]: [...(rawAccByKey || []), spec] };
  }, {});

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              "Grade",
              "Hardness (IRHD)",
              "Tensile Min (MPa)",
              "Elongation Min (%)",
              "Ageing Tensile (%)",
              "Ageing Elongation (%)",
              "Hardness Change Max",
            ].map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries(groupedByType).map(([key, typeSpecs]) => {
            const typeName = key.split("-").slice(1).join("-");
            const typeNumber = key.split("-")[0];
            return [
              <tr key={`header-${key}`} className="bg-yellow-50">
                <td colSpan={7} className="px-4 py-2 text-sm font-semibold text-yellow-800">
                  Type {typeNumber} &mdash; {typeName}
                </td>
              </tr>,
              ...typeSpecs.map((spec) => (
                <tr key={spec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {spec.grade}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {spec.hardnessClassIrhd}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {spec.tensileStrengthMpaMin}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {spec.elongationAtBreakMin}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {spec.tensileAfterAgeingMinPercent}&ndash;{spec.tensileAfterAgeingMaxPercent}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {spec.elongationAfterAgeingMinPercent}&ndash;
                    {spec.elongationAfterAgeingMaxPercent}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {spec.hardnessChangeAfterAgeingMax}
                  </td>
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AuRubberCodingsPage() {
  const { showToast } = useToast();
  const [selectedTab, setSelectedTab] = useState<TabType>("COMPOUND");
  const isSansTab = selectedTab === SANS_1198_TAB;
  const selectedType = isSansTab ? null : (selectedTab as CodingType);

  const [codings, setCodings] = useState<RubberProductCodingDto[]>([]);
  const [specifications, setSpecifications] = useState<RubberSpecificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingCoding, setEditingCoding] = useState<RubberProductCodingDto | null>(null);
  const [deleteCodingId, setDeleteCodingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codingType: "COMPOUND" as CodingType,
    code: "",
    name: "",
    aliases: "",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedState<number>(
    "auRubber.codings.pageSize",
    ITEMS_PER_PAGE,
  );

  const fetchCodings = async (type: CodingType) => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.productCodings(type);
      setCodings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load codings"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpecifications = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.rubberSpecifications();
      setSpecifications(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load specifications"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSansTab) {
      fetchSpecifications();
    } else if (selectedType) {
      fetchCodings(selectedType);
    }
  }, [selectedTab]);

  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);
  const filteredCodings = showOnlyNeedsReview ? codings.filter((c) => c.needsReview) : codings;
  const needsReviewCount = codings.filter((c) => c.needsReview).length;
  const effectivePageSize = pageSize === 0 ? filteredCodings.length : pageSize;
  const paginatedCodings = filteredCodings.slice(
    currentPage * effectivePageSize,
    (currentPage + 1) * effectivePageSize,
  );

  const openNewModal = () => {
    setEditingCoding(null);
    setFormData({
      codingType: selectedType || "COMPOUND",
      code: "",
      name: "",
      aliases: "",
    });
    setShowModal(true);
  };

  const openEditModal = (coding: RubberProductCodingDto) => {
    setEditingCoding(coding);
    const codingAliases = coding.aliases;
    const aliasesString = isArray(codingAliases) ? codingAliases.join(", ") : "";
    setFormData({
      codingType: coding.codingType,
      code: coding.code,
      name: coding.name,
      aliases: aliasesString,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const aliasesArray = formData.aliases
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      const payload = {
        codingType: formData.codingType,
        code: formData.code,
        name: formData.name,
        aliases: aliasesArray,
        needsReview: false,
      };
      if (editingCoding) {
        await auRubberApiClient.updateProductCoding(editingCoding.id, payload);
      } else {
        await auRubberApiClient.createProductCoding(payload);
      }
      showToast(editingCoding ? "Coding updated" : "Coding created", "success");
      setShowModal(false);
      if (selectedType) fetchCodings(selectedType);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save coding";
      showToast(errorMessage, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteProductCoding(id);
      showToast("Coding deleted", "success");
      setDeleteCodingId(null);
      if (selectedType) fetchCodings(selectedType);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete coding";
      showToast(errorMessage, "error");
    }
  };

  const handleTabChange = (tab: TabType) => {
    setSelectedTab(tab);
    setCurrentPage(0);
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [pageSize]);

  const currentTypeInfo = selectedType ? CODING_TYPES.find((t) => t.value === selectedType) : null;

  if (error) {
    return (
      <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/codings"]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Codings</div>
            <p className="text-gray-600">{error.message}</p>
            <button
              onClick={() =>
                isSansTab ? fetchSpecifications() : selectedType && fetchCodings(selectedType)
              }
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Retry
            </button>
          </div>
        </div>
      </RequirePermission>
    );
  }

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/codings"]}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Product Codings" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Codings</h1>
            <p className="mt-1 text-sm text-gray-600">
              {isSansTab
                ? "SANS 1198:2013 rubber specification reference data"
                : "Manage product attribute codes"}
            </p>
          </div>
          {!isSansTab && (
            <button
              onClick={openNewModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add {currentTypeInfo?.label.slice(0, -1) || "Coding"}
            </button>
          )}
        </div>

        {needsReviewCount > 0 && !isSansTab && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-amber-600"
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
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {needsReviewCount} coding{needsReviewCount === 1 ? "" : "s"} need
                  {needsReviewCount === 1 ? "s" : ""} review
                </p>
                <p className="text-xs text-amber-700">
                  Auto-created from supplier documents. Open each one, set a real Name and any
                  Aliases, then Save — that clears the flag.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyNeedsReview(!showOnlyNeedsReview)}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
            >
              {showOnlyNeedsReview ? "Show all" : "Show only needs-review"}
            </button>
          </div>
        )}

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
            {CODING_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleTabChange(type.value)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === type.value
                    ? "border-yellow-500 text-yellow-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {type.label}
              </button>
            ))}
            <button
              onClick={() => handleTabChange(SANS_1198_TAB)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                isSansTab
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              SANS 1198 Specs
            </button>
          </nav>
        </div>

        {currentTypeInfo && <p className="text-sm text-gray-500">{currentTypeInfo.description}</p>}

        {isSansTab ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <SpecificationsTable specs={specifications} isLoading={isLoading} />
          </div>
        ) : (
          <>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {isLoading ? (
                <TableLoadingState
                  message={`Loading ${currentTypeInfo?.label.toLowerCase()}...`}
                  spinnerClassName="border-b-2 border-yellow-600"
                />
              ) : codings.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No {currentTypeInfo?.label.toLowerCase()} found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first{" "}
                    {currentTypeInfo?.label.slice(0, -1).toLowerCase()}.
                  </p>
                  <button
                    onClick={openNewModal}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add {currentTypeInfo?.label.slice(0, -1) || "Coding"}
                  </button>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Code
                      </th>
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
                        Aliases
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedCodings.map((coding) => {
                      const codingAliases = coding.aliases;
                      const aliasList = isArray(codingAliases) ? codingAliases : [];
                      return (
                        <tr
                          key={coding.id}
                          className={`hover:bg-gray-50 ${coding.needsReview ? "bg-amber-50/40" : ""}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {coding.code}
                              </span>
                              {coding.needsReview && (
                                <span
                                  className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800"
                                  title="Auto-created from a supplier document — review and set a proper name + any aliases"
                                >
                                  Needs Review
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{coding.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            {aliasList.length === 0 ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {aliasList.map((alias) => (
                                  <span
                                    key={alias}
                                    className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700"
                                  >
                                    {alias}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(coding)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteCodingId(coding.id)}
                              className="text-red-600 hover:text-red-900 ml-4"
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

            <div className="bg-white rounded-lg shadow">
              <Pagination
                currentPage={currentPage}
                totalItems={codings.length}
                itemsPerPage={pageSize}
                itemName={currentTypeInfo ? currentTypeInfo.label.toLowerCase() : "codings"}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}

        {showModal &&
          globalThis.document &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="fixed inset-0 bg-black/10 backdrop-blur-md"
                onClick={() => setShowModal(false)}
                aria-hidden="true"
              />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingCoding ? "Edit" : "Add"} {currentTypeInfo?.label.slice(0, -1)}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      placeholder="e.g. NR, SBR, RED"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      placeholder="e.g. Natural Rubber, Red"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Aliases (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.aliases}
                      onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      placeholder="e.g. RSCA40, AU-RSCA40"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Other names this code is known by — used to match supplier documents that use
                      a different naming convention. e.g. an Impilo CoC saying "RSCA40" can match
                      S&N batches under "AUA40RSCA" if you list "RSCA40" as an alias.
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
                    disabled={isSaving || !formData.code || !formData.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>,
            globalThis.document.body,
          )}

        <ConfirmModal
          isOpen={deleteCodingId !== null}
          title="Delete Coding"
          message="Are you sure you want to delete this coding? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => deleteCodingId && handleDelete(deleteCodingId)}
          onCancel={() => setDeleteCodingId(null)}
        />
      </div>
    </RequirePermission>
  );
}

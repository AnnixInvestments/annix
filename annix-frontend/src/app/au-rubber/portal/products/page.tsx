"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { now } from "@/app/lib/datetime";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import { ProductFormModal } from "../../components/ProductFormModal";
import { ProductImportModal } from "../../components/ProductImportModal";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "title" | "type" | "costPerKg" | "markup" | "pricePerKg" | "specificGravity";

const exportProductsToCSV = (products: RubberProductDto[]) => {
  const headers = [
    "Title",
    "Description",
    "Type",
    "Compound",
    "Colour",
    "Hardness",
    "Grade",
    "Curing Method",
    "Cost/kg",
    "Markup %",
    "Price/kg",
    "Specific Gravity",
  ];
  const rows = products.map((product) => [
    product.title || "",
    product.description || "",
    product.typeName || "",
    product.compoundName || "",
    product.colourName || "",
    product.hardnessName || "",
    product.gradeName || "",
    product.curingMethodName || "",
    product.costPerKg?.toString() || "",
    product.markup?.toString() || "",
    product.pricePerKg?.toString() || "",
    product.specificGravity?.toString() || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `rubber-products-${now().toISODate()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AuRubberProductsPage() {
  const { showToast } = useToast();

  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [compoundFilter, setCompoundFilter] = useState("");
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.products();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load products"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const sortProducts = (productsToSort: RubberProductDto[]): RubberProductDto[] => {
    return [...productsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "title") {
        const aVal = a.title || "";
        const bVal = b.title || "";
        return direction * aVal.localeCompare(bVal);
      } else if (sortColumn === "type") {
        const aVal = a.typeName || "";
        const bVal = b.typeName || "";
        return direction * aVal.localeCompare(bVal);
      } else if (sortColumn === "costPerKg") {
        return direction * ((a.costPerKg || 0) - (b.costPerKg || 0));
      } else if (sortColumn === "markup") {
        return direction * ((a.markup || 0) - (b.markup || 0));
      } else if (sortColumn === "pricePerKg") {
        return direction * ((a.pricePerKg || 0) - (b.pricePerKg || 0));
      } else if (sortColumn === "specificGravity") {
        return direction * ((a.specificGravity || 0) - (b.specificGravity || 0));
      }
      return 0;
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleSelectProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    setShowBulkDeleteModal(false);
    const ids = Array.from(selectedProducts);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        await auRubberApiClient.deleteProduct(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      showToast(
        `Deleted ${successCount} product${successCount > 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} failed` : ""}`,
        failCount > 0 ? "warning" : "success",
      );
      setSelectedProducts(new Set());
      fetchProducts();
    } else if (failCount > 0) {
      showToast(`Failed to delete ${failCount} product${failCount > 1 ? "s" : ""}`, "error");
    }
  };

  const uniqueTypes = [
    ...new Set(products.map((p) => p.typeName).filter((t): t is string => Boolean(t))),
  ].sort();
  const uniqueCompounds = [
    ...new Set(products.map((p) => p.compoundName).filter((c): c is string => Boolean(c))),
  ].sort();

  const filteredProducts = sortProducts(
    products.filter((product) => {
      const matchesSearch =
        searchQuery === "" ||
        product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "" || product.typeName === typeFilter;
      const matchesCompound = compoundFilter === "" || product.compoundName === compoundFilter;
      return matchesSearch && matchesType && matchesCompound;
    }),
  );

  const paginatedProducts = filteredProducts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
    setSelectedProducts(new Set());
  }, [searchQuery, typeFilter, compoundFilter]);

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteProduct(id);
      showToast("Product deleted", "success");
      setDeleteProductId(null);
      fetchProducts();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete product";
      showToast(errorMessage, "error");
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return "-";
    return `R ${value.toFixed(2)}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Products</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => fetchProducts()}
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
      <Breadcrumb items={[{ label: "Products" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rubber Products</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage rubber lining products</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedProducts.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete ({selectedProducts.size})
            </button>
          )}
          <button
            onClick={() => exportProductsToCSV(filteredProducts)}
            disabled={filteredProducts.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L12 8m4-4v12"
              />
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
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
            Create Product
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Title or description"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Compound:</label>
            <select
              value={compoundFilter}
              onChange={(e) => setCompoundFilter(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Compounds</option>
              {uniqueCompounds.map((compound) => (
                <option key={compound} value={compound}>
                  {compound}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || typeFilter || compoundFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("");
                setCompoundFilter("");
              }}
              className="text-sm text-yellow-600 hover:text-yellow-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading products..." />
        ) : filteredProducts.length === 0 ? (
          <TableEmptyState
            icon={TableIcons.cube}
            title="No products found"
            subtitle={
              searchQuery || typeFilter || compoundFilter
                ? "Try adjusting your filters"
                : "Get started by creating your first product."
            }
            action={
              !searchQuery && !typeFilter && !compoundFilter
                ? { label: "Create Product", onClick: () => setShowCreateModal(true) }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={
                        paginatedProducts.length > 0 &&
                        selectedProducts.size === paginatedProducts.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("title")}
                  >
                    Title
                    <SortIcon active={sortColumn === "title"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("type")}
                  >
                    Type / Compound
                    <SortIcon active={sortColumn === "type"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Properties
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("costPerKg")}
                  >
                    Cost/kg
                    <SortIcon active={sortColumn === "costPerKg"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("markup")}
                  >
                    Markup
                    <SortIcon active={sortColumn === "markup"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("pricePerKg")}
                  >
                    Price/kg
                    <SortIcon active={sortColumn === "pricePerKg"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("specificGravity")}
                  >
                    Sp. Gravity
                    <SortIcon active={sortColumn === "specificGravity"} direction={sortDirection} />
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-50 ${selectedProducts.has(product.id) ? "bg-yellow-50" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/au-rubber/portal/products/${product.id}/edit`}
                        className="text-sm font-medium text-yellow-600 hover:text-yellow-900"
                      >
                        {product.title || "Untitled"}
                      </Link>
                      {product.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.typeName || "-"}</div>
                      <div className="text-sm text-gray-500">{product.compoundName || "-"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.colourName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                            {product.colourName}
                          </span>
                        )}
                        {product.hardnessName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                            {product.hardnessName}
                          </span>
                        )}
                        {product.gradeName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                            {product.gradeName}
                          </span>
                        )}
                        {product.curingMethodName && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                            {product.curingMethodName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(product.costPerKg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.markup ? `${product.markup}%` : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(product.pricePerKg)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.specificGravity?.toFixed(2) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Link
                        href={`/au-rubber/portal/products/${product.id}/edit`}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteProductId(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="products"
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmModal
        isOpen={deleteProductId !== null}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteProductId && handleDelete(deleteProductId)}
        onCancel={() => setDeleteProductId(null)}
      />

      <ProductFormModal
        isOpen={showCreateModal}
        product={null}
        onSave={() => {
          setShowCreateModal(false);
          showToast("Product created", "success");
          fetchProducts();
        }}
        onCancel={() => {
          setShowCreateModal(false);
        }}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Delete Selected Products"
        message={`Are you sure you want to delete ${selectedProducts.size} product${selectedProducts.size > 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedProducts.size}`}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      <ProductImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          fetchProducts();
        }}
      />
    </div>
  );
}

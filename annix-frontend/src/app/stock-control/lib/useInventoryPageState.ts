"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  ImportResult,
  ImportUploadResponse,
  InventoryColumnMapping,
  StockControlLocation,
  StockItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import {
  useInvalidateInventory,
  useInventoryCategories,
  useInventoryGrouped,
  useInventoryItems,
  useInventoryLocations,
} from "@/app/lib/query/hooks";
import type {
  GroupByOption,
  SortDirection,
  SortField,
  ThumbnailSize,
} from "../components/InventoryCardView";

type ViewMode = "list" | "grouped" | "cards";
type ImportStep = "idle" | "parsing" | "preview" | "importing" | "result";
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 0] as const;
const PAGE_SIZE_KEY = "asca-inventory-page-size";
const VIEW_MODE_KEY = "asca-inventory-view-mode";
const THUMB_SIZE_KEY = "asca-inventory-thumb-size";

function savedPageSize(): PageSize {
  if (typeof window === "undefined") return 25;
  const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
  if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(stored)) return stored as PageSize;
  return 25;
}

function savedViewMode(): ViewMode {
  if (typeof window === "undefined") return "cards";
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  if (stored === "list" || stored === "grouped" || stored === "cards") return stored;
  return "cards";
}

function savedThumbSize(): ThumbnailSize {
  if (typeof window === "undefined") return "M";
  const stored = localStorage.getItem(THUMB_SIZE_KEY);
  if (stored === "S" || stored === "M" || stored === "L" || stored === "XL") return stored;
  return "M";
}

interface ModalForm {
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  minStockLevel: number;
  locationId: number | null;
}

const INITIAL_MODAL_FORM: ModalForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  unitOfMeasure: "each",
  costPerUnit: 0,
  quantity: 0,
  minStockLevel: 0,
  locationId: null,
};

interface LocationGroup {
  locationId: number | null;
  locationName: string;
  items: StockItem[];
  expanded: boolean;
}

interface InventoryPageState {
  actionError: Error | null;
  viewMode: ViewMode;
  thumbnailSize: ThumbnailSize;
  cardGroupBy: GroupByOption;
  cardSortField: SortField;
  cardSortDirection: SortDirection;
  lowStockOnly: boolean;
  search: string;
  debouncedSearch: string;
  categoryFilter: string;
  locationFilter: number | "" | "uncategorized";
  currentPage: number;
  pageSize: PageSize;
  showModal: boolean;
  editingItem: StockItem | null;
  modalForm: ModalForm;
  isSaving: boolean;
  photoFile: File | null;
  photoPreview: string | null;
  confirmDeleteId: number | null;
  importStep: ImportStep;
  importFile: File | null;
  parsedRows: Record<string, unknown>[];
  importHeaders: string[];
  importRawRows: string[][];
  importMapping: InventoryColumnMapping | null;
  importFormat: string | null;
  importResult: ImportResult | null;
  importError: string | null;
  isDragging: boolean;
  isStockTakeMode: boolean;
  selectedIds: Set<number>;
  isPrintingLabels: boolean;
  showPrintDropdown: boolean;
  printPreviewItems: StockItem[] | null;
  pendingMinLevels: Map<number, number>;
  pendingPrices: Map<number, number>;
  pendingLocations: Map<number, number | null>;
  isSavingMinLevels: boolean;
  isSavingPrices: boolean;
  isSavingLocations: boolean;
  expandedGroups: Map<number | null, boolean>;
  listGroupByCategory: boolean;
  isAutoCategorizing: boolean;
}

const INITIAL_STATE: InventoryPageState = {
  actionError: null,
  viewMode: savedViewMode(),
  thumbnailSize: savedThumbSize(),
  cardGroupBy: "location",
  cardSortField: "name",
  cardSortDirection: "asc",
  lowStockOnly: false,
  search: "",
  debouncedSearch: "",
  categoryFilter: "",
  locationFilter: "",
  currentPage: 0,
  pageSize: savedPageSize(),
  showModal: false,
  editingItem: null,
  modalForm: INITIAL_MODAL_FORM,
  isSaving: false,
  photoFile: null,
  photoPreview: null,
  confirmDeleteId: null,
  importStep: "idle",
  importFile: null,
  parsedRows: [],
  importHeaders: [],
  importRawRows: [],
  importMapping: null,
  importFormat: null,
  importResult: null,
  importError: null,
  isDragging: false,
  isStockTakeMode: false,
  selectedIds: new Set(),
  isPrintingLabels: false,
  showPrintDropdown: false,
  printPreviewItems: null,
  pendingMinLevels: new Map(),
  pendingPrices: new Map(),
  pendingLocations: new Map(),
  isSavingMinLevels: false,
  isSavingPrices: false,
  isSavingLocations: false,
  expandedGroups: new Map(),
  listGroupByCategory: false,
  isAutoCategorizing: false,
};

export function useInventoryPageState(pdfPreview?: ReturnType<typeof usePdfPreview>) {
  const { user } = useStockControlAuth();
  const canEditPrices =
    user?.role === "admin" || user?.role === "manager" || user?.role === "accounts";

  const [state, setState] = useState<InventoryPageState>(INITIAL_STATE);

  const printDropdownRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const updateState = useCallback((patch: Partial<InventoryPageState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const isGroupedView = state.viewMode === "grouped" || state.viewMode === "cards";

  const listParams: Record<string, string> = isGroupedView
    ? {}
    : state.pageSize > 0
      ? { page: String(state.currentPage + 1), limit: String(state.pageSize) }
      : {};
  if (!isGroupedView && state.debouncedSearch) listParams.search = state.debouncedSearch;
  if (!isGroupedView && state.categoryFilter) listParams.category = state.categoryFilter;
  if (!isGroupedView && state.locationFilter) {
    listParams.locationId =
      state.locationFilter === "uncategorized" ? "null" : String(state.locationFilter);
  }

  const listQuery = useInventoryItems(isGroupedView ? {} : listParams);
  const numericLocationFilter =
    typeof state.locationFilter === "number" ? state.locationFilter : undefined;
  const groupedQuery = useInventoryGrouped(
    isGroupedView ? state.debouncedSearch || undefined : undefined,
    isGroupedView ? numericLocationFilter : undefined,
  );
  const tabCountsQuery = useInventoryGrouped();
  const { data: categories = [] } = useInventoryCategories();
  const { data: locations = [] } = useInventoryLocations();
  const invalidateInventory = useInvalidateInventory();

  const isLoading = isGroupedView ? groupedQuery.isLoading : listQuery.isLoading;
  const queryError = isGroupedView ? groupedQuery.error : listQuery.error;
  const error = state.actionError || queryError;
  const items = isGroupedView ? [] : listQuery.data?.items || [];
  const total = isGroupedView ? 0 : listQuery.data?.total || 0;
  const totalPages = state.pageSize > 0 ? Math.ceil(total / state.pageSize) : 1;

  const groupedData: LocationGroup[] = useMemo(() => {
    if (!isGroupedView || !groupedQuery.data) return [];
    const allFlatItems = groupedQuery.data.groups.flatMap(
      (g: { category: string; items: StockItem[] }) => g.items,
    );
    const categoryFiltered = state.categoryFilter
      ? allFlatItems.filter((item: StockItem) => item.category === state.categoryFilter)
      : allFlatItems;
    const filteredItems =
      state.locationFilter === "uncategorized"
        ? categoryFiltered.filter((item: StockItem) => item.locationId == null)
        : categoryFiltered;
    const locMap = new Map(locations.map((l: StockControlLocation) => [l.id, l.name]));
    const byLocation = filteredItems.reduce<Record<string, StockItem[]>>((acc, item: StockItem) => {
      const key = item.locationId != null ? String(item.locationId) : "null";
      const existing = acc[key] || [];
      return { ...acc, [key]: [...existing, item] };
    }, {});
    return Object.entries(byLocation)
      .map(([key, locationItems]) => {
        const locationId = key === "null" ? null : Number(key);
        const locationName =
          locationId != null ? locMap.get(locationId) || "Unknown" : "No Location Assigned";
        const sortedItems = [...locationItems].sort((a, b) => {
          const catCmp = (a.category || "").localeCompare(b.category || "");
          if (catCmp !== 0) return catCmp;
          return a.name.localeCompare(b.name);
        });
        const isExpanded = state.expandedGroups.has(locationId)
          ? state.expandedGroups.get(locationId)!
          : true;
        return { locationId, locationName, items: sortedItems, expanded: isExpanded };
      })
      .sort((a, b) => {
        if (a.locationId === null) return -1;
        if (b.locationId === null) return 1;
        return a.locationName.localeCompare(b.locationName);
      });
  }, [
    isGroupedView,
    groupedQuery.data,
    state.categoryFilter,
    state.locationFilter,
    locations,
    state.expandedGroups,
  ]);

  const locationCounts: Map<number | null, number> = useMemo(() => {
    if (!tabCountsQuery.data) return new Map();
    const allFlatItems = tabCountsQuery.data.groups.flatMap(
      (g: { category: string; items: StockItem[] }) => g.items,
    );
    return allFlatItems.reduce<Map<number | null, number>>((acc, item: StockItem) => {
      const key = item.locationId != null ? item.locationId : null;
      const current = acc.get(key) || 0;
      return new Map([...acc, [key, current + 1]]);
    }, new Map());
  }, [tabCountsQuery.data]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(event.target as Node)) {
        updateState({ showPrintDropdown: false });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [updateState]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateState({ debouncedSearch: state.search });
    }, 300);
    return () => clearTimeout(timer);
  }, [state.search, updateState]);

  const allItems = useMemo((): StockItem[] => {
    if (state.viewMode === "grouped" || state.viewMode === "cards") {
      return groupedData
        .flatMap((g) => g.items)
        .filter((item): item is StockItem => item != null && typeof item === "object");
    }
    return items.filter((item): item is StockItem => item != null && typeof item === "object");
  }, [state.viewMode, groupedData, items]);

  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      updateState({ viewMode: mode });
      localStorage.setItem(VIEW_MODE_KEY, mode);
    },
    [updateState],
  );

  const changeThumbSize = useCallback(
    (size: ThumbnailSize) => {
      updateState({ thumbnailSize: size });
      localStorage.setItem(THUMB_SIZE_KEY, size);
    },
    [updateState],
  );

  const changePageSize = useCallback(
    (size: PageSize) => {
      updateState({ pageSize: size, currentPage: 0 });
      localStorage.setItem(PAGE_SIZE_KEY, String(size));
    },
    [updateState],
  );

  const handleSearch = useCallback(
    (value: string) => {
      updateState({ search: value, currentPage: 0 });
    },
    [updateState],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      updateState({ categoryFilter: value, currentPage: 0 });
    },
    [updateState],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      updateState({
        locationFilter:
          value === "" ? "" : value === "uncategorized" ? "uncategorized" : Number(value),
        currentPage: 0,
      });
    },
    [updateState],
  );

  const toggleGroupExpanded = useCallback((locationId: number | null) => {
    setState((prev) => {
      const next = new Map(prev.expandedGroups);
      const current = next.has(locationId) ? next.get(locationId)! : true;
      next.set(locationId, !current);
      return { ...prev, expandedGroups: next };
    });
  }, []);

  const expandAllGroups = useCallback(() => {
    setState((prev) => {
      const next = new Map(prev.expandedGroups);
      groupedData.forEach((g) => next.set(g.locationId, true));
      return { ...prev, expandedGroups: next };
    });
  }, [groupedData]);

  const collapseAllGroups = useCallback(() => {
    setState((prev) => {
      const next = new Map(prev.expandedGroups);
      groupedData.forEach((g) => next.set(g.locationId, false));
      return { ...prev, expandedGroups: next };
    });
  }, [groupedData]);

  const openCreateModal = useCallback(() => {
    updateState({
      editingItem: null,
      modalForm: INITIAL_MODAL_FORM,
      photoFile: null,
      photoPreview: null,
      showModal: true,
    });
  }, [updateState]);

  const openEditModal = useCallback(
    (item: StockItem) => {
      updateState({
        editingItem: item,
        modalForm: {
          sku: item.sku,
          name: item.name,
          description: item.description || "",
          category: item.category || "",
          unitOfMeasure: item.unitOfMeasure,
          costPerUnit: item.costPerUnit,
          quantity: item.quantity,
          minStockLevel: item.minStockLevel,
          locationId: item.locationId,
        },
        photoFile: null,
        photoPreview: item.photoUrl || null,
        showModal: true,
      });
    },
    [updateState],
  );

  const handleSave = useCallback(async () => {
    try {
      updateState({ isSaving: true });
      let savedItem: StockItem;
      if (state.editingItem) {
        savedItem = await stockControlApiClient.updateStockItem(
          state.editingItem.id,
          state.modalForm,
        );
      } else {
        savedItem = await stockControlApiClient.createStockItem(state.modalForm);
      }
      if (state.photoFile) {
        await stockControlApiClient.uploadStockItemPhoto(savedItem.id, state.photoFile);
      }
      updateState({ showModal: false, photoFile: null, photoPreview: null });
      invalidateInventory();
    } catch (err) {
      updateState({
        actionError: err instanceof Error ? err : new Error("Failed to save item"),
      });
    } finally {
      updateState({ isSaving: false });
    }
  }, [state.editingItem, state.modalForm, state.photoFile, updateState, invalidateInventory]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await stockControlApiClient.deleteStockItem(id);
        invalidateInventory();
      } catch (err) {
        updateState({
          actionError: err instanceof Error ? err : new Error("Failed to delete item"),
        });
      } finally {
        updateState({ confirmDeleteId: null });
      }
    },
    [updateState, invalidateInventory],
  );

  const toggleSelectItem = useCallback((id: number) => {
    setState((prev) => {
      const next = new Set(prev.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, selectedIds: next };
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setState((prev) => {
      const pageIds = items.map((item) => item.id);
      const allSelected = pageIds.every((id) => prev.selectedIds.has(id));
      const next = new Set(prev.selectedIds);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return { ...prev, selectedIds: next };
    });
  }, [items]);

  const handlePrintStockList = useCallback(
    (mode: "all" | "selected") => {
      const itemsToPrint =
        mode === "selected" ? allItems.filter((item) => state.selectedIds.has(item.id)) : allItems;
      updateState({ showPrintDropdown: false, printPreviewItems: itemsToPrint });
    },
    [allItems, state.selectedIds, updateState],
  );

  const handlePrintPreviewPrint = useCallback(() => {
    window.print();
  }, []);

  const closePrintPreview = useCallback(() => {
    updateState({ printPreviewItems: null });
  }, [updateState]);

  const handlePrintSelected = useCallback(async () => {
    if (state.selectedIds.size === 0) return;
    try {
      updateState({ isPrintingLabels: true });
      const idsArray = [...state.selectedIds];
      const blob = await stockControlApiClient.downloadBatchLabelsPdf({ ids: idsArray });
      if (pdfPreview) {
        pdfPreview.open(blob, "shelf-labels.pdf");
      }
      const itemsNeedingClear = allItems
        .filter((item) => idsArray.includes(item.id) && item.needsQrPrint)
        .map((item) => item.id);
      if (itemsNeedingClear.length > 0) {
        await stockControlApiClient.clearQrPrintFlag(itemsNeedingClear);
        invalidateInventory();
      }
    } catch (err) {
      updateState({
        actionError: err instanceof Error ? err : new Error("Failed to download labels"),
      });
    } finally {
      updateState({ isPrintingLabels: false });
    }
  }, [state.selectedIds, allItems, updateState, invalidateInventory, pdfPreview]);

  const handlePrintAll = useCallback(async () => {
    try {
      updateState({ isPrintingLabels: true });
      const blob = await stockControlApiClient.downloadBatchLabelsPdf({
        search: state.search || undefined,
        category: state.categoryFilter || undefined,
      });
      if (pdfPreview) {
        pdfPreview.open(blob, "shelf-labels.pdf");
      }
      const itemsNeedingClear = allItems.filter((item) => item.needsQrPrint).map((item) => item.id);
      if (itemsNeedingClear.length > 0) {
        await stockControlApiClient.clearQrPrintFlag(itemsNeedingClear);
        invalidateInventory();
      }
    } catch (err) {
      updateState({
        actionError: err instanceof Error ? err : new Error("Failed to download labels"),
      });
    } finally {
      updateState({ isPrintingLabels: false });
    }
  }, [state.search, state.categoryFilter, allItems, updateState, invalidateInventory, pdfPreview]);

  const updatePendingMinLevel = useCallback((itemId: number, value: number) => {
    setState((prev) => {
      const next = new Map(prev.pendingMinLevels);
      next.set(itemId, value);
      return { ...prev, pendingMinLevels: next };
    });
  }, []);

  const clearPendingMinLevel = useCallback((itemId: number) => {
    setState((prev) => {
      const next = new Map(prev.pendingMinLevels);
      next.delete(itemId);
      return { ...prev, pendingMinLevels: next };
    });
  }, []);

  const clearAllPendingMinLevels = useCallback(() => {
    updateState({ pendingMinLevels: new Map() });
  }, [updateState]);

  const saveAllMinLevels = useCallback(async () => {
    if (state.isSavingMinLevels || state.pendingMinLevels.size === 0) return;
    try {
      updateState({ isSavingMinLevels: true });
      const updates = Array.from(state.pendingMinLevels.entries()).map(([id, minStockLevel]) =>
        stockControlApiClient.updateStockItem(id, { minStockLevel }),
      );
      await Promise.all(updates);
      updateState({ pendingMinLevels: new Map() });
      invalidateInventory();
    } catch (err) {
      updateState({
        actionError: err instanceof Error ? err : new Error("Failed to update min stock levels"),
      });
    } finally {
      updateState({ isSavingMinLevels: false });
    }
  }, [state.isSavingMinLevels, state.pendingMinLevels, updateState, invalidateInventory]);

  const minLevelForItem = useCallback(
    (item: StockItem): number => {
      return state.pendingMinLevels.has(item.id)
        ? state.pendingMinLevels.get(item.id)!
        : item.minStockLevel;
    },
    [state.pendingMinLevels],
  );

  const priceForItem = useCallback(
    (item: StockItem): number => {
      return state.pendingPrices.has(item.id)
        ? state.pendingPrices.get(item.id)!
        : item.costPerUnit;
    },
    [state.pendingPrices],
  );

  const locationForItem = useCallback(
    (item: StockItem): number | null => {
      return state.pendingLocations.has(item.id)
        ? state.pendingLocations.get(item.id)!
        : item.locationId;
    },
    [state.pendingLocations],
  );

  const updatePendingPrice = useCallback((itemId: number, value: number) => {
    setState((prev) => {
      const next = new Map(prev.pendingPrices);
      next.set(itemId, value);
      return { ...prev, pendingPrices: next };
    });
  }, []);

  const updatePendingLocation = useCallback((itemId: number, value: number | null) => {
    setState((prev) => {
      const next = new Map(prev.pendingLocations);
      next.set(itemId, value);
      return { ...prev, pendingLocations: next };
    });
  }, []);

  const clearAllPendingPrices = useCallback(() => {
    updateState({ pendingPrices: new Map() });
  }, [updateState]);

  const clearAllPendingLocations = useCallback(() => {
    updateState({ pendingLocations: new Map() });
  }, [updateState]);

  const saveAllPrices = useCallback(async () => {
    if (state.isSavingPrices || state.pendingPrices.size === 0) return;
    try {
      updateState({ isSavingPrices: true });
      const updates = Array.from(state.pendingPrices.entries()).map(([id, costPerUnit]) =>
        stockControlApiClient.updateStockItem(id, { costPerUnit }),
      );
      await Promise.all(updates);
      updateState({ pendingPrices: new Map() });
      invalidateInventory();
    } catch (err) {
      updateState({
        actionError: err instanceof Error ? err : new Error("Failed to update prices"),
      });
    } finally {
      updateState({ isSavingPrices: false });
    }
  }, [state.isSavingPrices, state.pendingPrices, updateState, invalidateInventory]);

  const saveAllLocations = useCallback(async () => {
    if (state.isSavingLocations || state.pendingLocations.size === 0) return;
    try {
      updateState({ isSavingLocations: true });
      const updates = Array.from(state.pendingLocations.entries()).map(([id, locationId]) =>
        stockControlApiClient.updateStockItem(id, { locationId }),
      );
      await Promise.all(updates);
      updateState({ pendingLocations: new Map() });
      invalidateInventory();
    } catch (err) {
      updateState({
        actionError: err instanceof Error ? err : new Error("Failed to update locations"),
      });
    } finally {
      updateState({ isSavingLocations: false });
    }
  }, [state.isSavingLocations, state.pendingLocations, updateState, invalidateInventory]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (e.dataTransfer.types.includes("Files")) {
        updateState({ isDragging: true });
      }
    },
    [updateState],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setState((prev) => ({ ...prev, isDragging: false }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      updateState({ isDragging: false });
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      const validExtensions = [".xlsx", ".xls", ".csv", ".pdf"];
      const extension = droppedFile.name.toLowerCase().slice(droppedFile.name.lastIndexOf("."));
      if (!validExtensions.includes(extension)) {
        updateState({
          importError: "Unsupported file type. Please use Excel, CSV, or PDF files.",
          importStep: "idle",
        });
        return;
      }

      updateState({ importFile: droppedFile, importError: null, importStep: "parsing" });

      try {
        const response: ImportUploadResponse =
          await stockControlApiClient.uploadImportFile(droppedFile);
        if (response.format === "excel" && response.headers && response.rawRows) {
          updateState({
            importFormat: response.format,
            importHeaders: response.headers,
            importRawRows: response.rawRows,
            importMapping: response.mapping || null,
            parsedRows: [],
            importStep: "preview",
          });
        } else {
          updateState({
            importFormat: response.format,
            parsedRows: Array.isArray(response.rows)
              ? (response.rows as Record<string, unknown>[])
              : [],
            importHeaders: [],
            importRawRows: [],
            importMapping: null,
            importStep: "preview",
          });
        }
      } catch (err) {
        updateState({
          importError: err instanceof Error ? err.message : "Failed to parse file",
          importStep: "idle",
        });
      }
    },
    [updateState],
  );

  const handleConfirmImport = useCallback(async () => {
    try {
      updateState({ importStep: "importing", importError: null });

      const buildFallbackMapping = (headers: string[]): InventoryColumnMapping => {
        const mapping: InventoryColumnMapping = {
          sku: null,
          name: null,
          description: null,
          category: null,
          unitOfMeasure: null,
          costPerUnit: null,
          quantity: null,
          minStockLevel: null,
          location: null,
        };
        headers.forEach((header, idx) => {
          const h = header.toLowerCase().trim();
          if (/product.?code|sku|code|item.?code|part.?no/.test(h)) {
            mapping.sku = idx;
          } else if (/stock.?count|qty|quantity|soh|on.?hand|count/.test(h)) {
            mapping.quantity = idx;
          } else if (/r\/p|unit.?price|cost|price.?per/.test(h)) {
            mapping.costPerUnit = idx;
          } else if (/min|minimum|reorder/.test(h)) {
            mapping.minStockLevel = idx;
          } else if (/location|loc|warehouse/.test(h)) {
            mapping.location = idx;
          } else if (/category|cat|group/.test(h)) {
            mapping.category = idx;
          } else if (/unit.?of|uom|measure/.test(h)) {
            mapping.unitOfMeasure = idx;
          }
        });
        if (mapping.name === null) {
          const mappedIndices = new Set(
            Object.values(mapping).filter((v): v is number => v !== null),
          );
          if (!mappedIndices.has(0)) {
            mapping.name = 0;
          }
        }
        return mapping;
      };

      let effectiveMapping = state.importMapping;
      let dataRows = state.importRawRows;

      if (state.importFormat === "excel") {
        const headersEmpty = state.importHeaders.every((h) => h.trim() === "");
        if (headersEmpty && state.importRawRows.length > 0) {
          effectiveMapping = buildFallbackMapping(state.importRawRows[0]);
          dataRows = state.importRawRows.slice(1);
        } else if (effectiveMapping && Object.values(effectiveMapping).every((v) => v === null)) {
          effectiveMapping = buildFallbackMapping(state.importHeaders);
        }
      }

      const rowsToImport =
        state.importFormat === "excel" && effectiveMapping
          ? dataRows
              .filter((row) => !isImportRowBlank(row) && !isImportSectionTitle(row))
              .map((row) => {
                const cellAt = (idx: number | null): string | undefined => {
                  if (idx === null || idx < 0 || idx >= row.length) {
                    return undefined;
                  }
                  const val = row[idx].trim();
                  return val === "" ? undefined : val;
                };
                const numAt = (idx: number | null): number | undefined => {
                  const val = cellAt(idx);
                  if (val === undefined) {
                    return undefined;
                  }
                  const num = Number(val);
                  return Number.isNaN(num) ? undefined : num;
                };
                return {
                  sku: cellAt(effectiveMapping.sku),
                  name: cellAt(effectiveMapping.name),
                  description: cellAt(effectiveMapping.description),
                  category: cellAt(effectiveMapping.category),
                  unitOfMeasure: cellAt(effectiveMapping.unitOfMeasure),
                  costPerUnit: numAt(effectiveMapping.costPerUnit),
                  quantity: numAt(effectiveMapping.quantity),
                  minStockLevel: numAt(effectiveMapping.minStockLevel),
                  location: cellAt(effectiveMapping.location),
                };
              })
          : state.parsedRows;

      const result = await stockControlApiClient.confirmImport(rowsToImport, state.isStockTakeMode);
      updateState({ importResult: result, importStep: "result", isStockTakeMode: false });
    } catch (err) {
      updateState({
        importError: err instanceof Error ? err.message : "Failed to import data",
        importStep: "preview",
      });
    }
  }, [
    state.importMapping,
    state.importRawRows,
    state.importFormat,
    state.importHeaders,
    state.parsedRows,
    state.isStockTakeMode,
    updateState,
  ]);

  const dismissImport = useCallback(() => {
    updateState({
      importStep: "idle",
      importFile: null,
      parsedRows: [],
      importHeaders: [],
      importRawRows: [],
      importMapping: null,
      importFormat: null,
      importResult: null,
      importError: null,
    });
    invalidateInventory();
  }, [updateState, invalidateInventory]);

  const handleInlineCategoryChange = useCallback(
    async (itemId: number, category: string) => {
      try {
        await stockControlApiClient.updateStockItem(itemId, { category });
        invalidateInventory();
      } catch (err) {
        updateState({
          actionError: err instanceof Error ? err : new Error("Failed to update category"),
        });
      }
    },
    [invalidateInventory, updateState],
  );

  const handleAutoCategorize = useCallback(async () => {
    updateState({ isAutoCategorizing: true });
    try {
      const result = await stockControlApiClient.autoCategorize();
      if (result.categorized > 0) {
        invalidateInventory();
      }
      return result;
    } finally {
      updateState({ isAutoCategorizing: false });
    }
  }, [updateState, invalidateInventory]);

  const toggleListGroupByCategory = useCallback(() => {
    updateState({ listGroupByCategory: !state.listGroupByCategory });
  }, [updateState, state.listGroupByCategory]);

  return {
    user,
    canEditPrices,
    state,
    updateState,

    printDropdownRef,
    dragCounterRef,

    isGroupedView,
    isLoading,
    error,
    items,
    total,
    totalPages,
    categories,
    locations,
    groupedData,
    locationCounts,
    allItems,

    changeViewMode,
    changeThumbSize,
    changePageSize,
    handleSearch,
    handleCategoryChange,
    handleLocationChange,
    toggleGroupExpanded,
    expandAllGroups,
    collapseAllGroups,

    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,

    toggleSelectItem,
    toggleSelectAll,
    handlePrintStockList,
    handlePrintPreviewPrint,
    closePrintPreview,
    handlePrintSelected,
    handlePrintAll,

    updatePendingMinLevel,
    clearPendingMinLevel,
    clearAllPendingMinLevels,
    saveAllMinLevels,
    minLevelForItem,
    priceForItem,
    locationForItem,
    updatePendingPrice,
    updatePendingLocation,
    clearAllPendingPrices,
    clearAllPendingLocations,
    saveAllPrices,
    saveAllLocations,

    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleConfirmImport,
    dismissImport,

    handleInlineCategoryChange,
    handleAutoCategorize,
    toggleListGroupByCategory,

    invalidateInventory,
  };
}

export type { ImportStep, InventoryPageState, LocationGroup, ModalForm, PageSize, ViewMode };
export { formatRandCell, isImportRowBlank, isImportSectionTitle, isRandColumn, PAGE_SIZE_OPTIONS };

function isRandColumn(header: string): boolean {
  return /value|price|cost|r\/p|amount|rand|zar/i.test(header);
}

function isImportRowBlank(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "" || cell.trim() === "0");
}

function isImportSectionTitle(row: string[]): boolean {
  const firstCell = row[0] ? row[0].trim() : "";
  if (firstCell === "" || firstCell === "0") {
    return false;
  } else {
    return row.slice(1).every((cell) => cell.trim() === "" || cell.trim() === "0");
  }
}

function formatRandCell(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return value;
  } else {
    return `R ${num.toFixed(2)}`;
  }
}

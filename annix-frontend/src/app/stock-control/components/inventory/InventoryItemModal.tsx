import { createPortal } from "react-dom";
import type { StockControlLocation, StockItem } from "@/app/lib/api/stockControlApi";
import type { InventoryPageState, ModalForm } from "../../lib/useInventoryPageState";

interface InventoryItemModalProps {
  showModal: boolean;
  editingItem: StockItem | null;
  modalForm: ModalForm;
  isSaving: boolean;
  photoPreview: string | null;
  locations: StockControlLocation[];
  onUpdateState: (patch: Partial<InventoryPageState>) => void;
  onSave: () => void;
}

export function InventoryItemModal({
  showModal,
  editingItem,
  modalForm,
  isSaving,
  photoPreview,
  locations,
  onUpdateState,
  onSave,
}: InventoryItemModalProps) {
  if (!showModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
          onClick={() => onUpdateState({ showModal: false })}
        ></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingItem ? "Edit Stock Item" : "Add Stock Item"}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  value={modalForm.sku}
                  onChange={(e) =>
                    onUpdateState({ modalForm: { ...modalForm, sku: e.target.value } })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={modalForm.name}
                  onChange={(e) =>
                    onUpdateState({ modalForm: { ...modalForm, name: e.target.value } })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={modalForm.description}
                onChange={(e) =>
                  onUpdateState({
                    modalForm: { ...modalForm, description: e.target.value },
                  })
                }
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={modalForm.category}
                  onChange={(e) =>
                    onUpdateState({ modalForm: { ...modalForm, category: e.target.value } })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                <input
                  type="text"
                  value={modalForm.unitOfMeasure}
                  onChange={(e) =>
                    onUpdateState({
                      modalForm: { ...modalForm, unitOfMeasure: e.target.value },
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  value={modalForm.costPerUnit}
                  onChange={(e) =>
                    onUpdateState({
                      modalForm: {
                        ...modalForm,
                        costPerUnit: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={modalForm.quantity}
                  onChange={(e) =>
                    onUpdateState({
                      modalForm: {
                        ...modalForm,
                        quantity: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                <input
                  type="number"
                  value={modalForm.minStockLevel}
                  onChange={(e) =>
                    onUpdateState({
                      modalForm: {
                        ...modalForm,
                        minStockLevel: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <select
                value={modalForm.locationId != null ? modalForm.locationId : ""}
                onChange={(e) =>
                  onUpdateState({
                    modalForm: {
                      ...modalForm,
                      locationId: e.target.value ? parseInt(e.target.value, 10) : null,
                    },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              >
                <option value="">No location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <PhotoField photoPreview={photoPreview} onUpdateState={onUpdateState} />
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => onUpdateState({ showModal: false })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : editingItem ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface PhotoFieldProps {
  photoPreview: string | null;
  onUpdateState: (patch: Partial<InventoryPageState>) => void;
}

function PhotoField({ photoPreview, onUpdateState }: PhotoFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
      <div className="flex items-center gap-4">
        {photoPreview ? (
          <div className="relative h-20 w-20 shrink-0">
            <img
              src={photoPreview}
              alt="Item photo"
              className="h-20 w-20 rounded-lg object-cover border border-gray-200"
            />
            <button
              type="button"
              onClick={() => {
                onUpdateState({ photoFile: null, photoPreview: null });
              }}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
            >
              &times;
            </button>
          </div>
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center border border-dashed border-gray-300">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {photoPreview ? "Change Photo" : "Add Photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUpdateState({
                    photoFile: file,
                    photoPreview: URL.createObjectURL(file),
                  });
                }
              }}
            />
          </label>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP</p>
        </div>
      </div>
    </div>
  );
}

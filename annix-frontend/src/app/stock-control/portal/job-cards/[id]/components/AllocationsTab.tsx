"use client";

import type {
  JobCard,
  StaffMember,
  StockAllocation,
  StockItem,
} from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { HelpTooltip } from "../../../../components/HelpTooltip";
import { PhotoCapture } from "../../../../components/PhotoCapture";

interface AllocationsTabProps {
  jobCard: JobCard;
  jobId: number;
  allocations: StockAllocation[];
  userRole: string | null;
  onAllocate: () => void;
  showAllocateModal: boolean;
  onCloseAllocateModal: () => void;
  allocateForm: {
    stockItemId: number;
    quantityUsed: number;
    notes: string;
    staffMemberId: number;
  };
  onAllocateFormChange: (form: {
    stockItemId: number;
    quantityUsed: number;
    notes: string;
    staffMemberId: number;
  }) => void;
  isAllocating: boolean;
  onSubmitAllocate: () => void;
  stockItems: StockItem[];
  activeStaff: StaffMember[];
  capturedFile: File | null;
  onCapturedFileChange: (file: File | null) => void;
  approvingAllocationId: number | null;
  rejectingAllocationId: number | null;
  onApproveAllocation: (allocationId: number) => void;
  onRejectAllocation: (allocationId: number, reason: string) => void;
}

export function AllocationsTab(props: AllocationsTabProps) {
  const {
    allocations,
    userRole,
    showAllocateModal,
    onCloseAllocateModal,
    allocateForm,
    onAllocateFormChange,
    isAllocating,
    onSubmitAllocate,
    stockItems,
    activeStaff,
    capturedFile,
    onCapturedFileChange,
    approvingAllocationId,
    rejectingAllocationId,
    onApproveAllocation,
    onRejectAllocation,
  } = props;

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Stock Allocations <HelpTooltip term="SOH" />
          </h3>
          <span className="text-sm text-gray-500">{allocations.length} allocations</span>
        </div>
        {allocations.length === 0 ? (
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No allocations</h3>
            <p className="mt-1 text-sm text-gray-500">Allocate stock items to this job card.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Qty Used
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Staff
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Allocated By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Notes
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr
                  key={allocation.id}
                  className={
                    allocation.pendingApproval
                      ? "bg-amber-50 hover:bg-amber-100"
                      : allocation.rejectedAt
                        ? "bg-red-50 hover:bg-red-100"
                        : "hover:bg-gray-50"
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    const rawName = allocation.stockItem?.name;
                    {rawName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    const sku = allocation.stockItem?.sku;
                    {sku || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {allocation.quantityUsed}
                    {allocation.allowedLitres && (
                      <span className="text-xs text-gray-400 ml-1">
                        / {allocation.allowedLitres}L allowed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    const name = allocation.staffMember?.name;
                    {name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    const allocatedBy = allocation.allocatedBy;
                    {allocatedBy || "System"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(allocation.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    const notes = allocation.notes;
                    {notes || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {allocation.pendingApproval ? (
                      <div className="flex flex-col space-y-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                        {(userRole === "manager" || userRole === "admin") && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => onApproveAllocation(allocation.id)}
                              disabled={approvingAllocationId === allocation.id}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {approvingAllocationId === allocation.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason:");
                                if (reason) {
                                  onRejectAllocation(allocation.id, reason);
                                }
                              }}
                              disabled={rejectingAllocationId === allocation.id}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {rejectingAllocationId === allocation.id ? "..." : "Reject"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : allocation.rejectedAt ? (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Rejected
                        </span>
                        {allocation.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">{allocation.rejectionReason}</p>
                        )}
                      </div>
                    ) : allocation.approvedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Allocated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAllocateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={onCloseAllocateModal}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allocate Stock to Job</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Item</label>
                  <select
                    value={allocateForm.stockItemId}
                    onChange={(e) =>
                      onAllocateFormChange({
                        ...allocateForm,
                        stockItemId: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value={0}>Select an item...</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} (SOH: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={allocateForm.quantityUsed}
                    onChange={(e) =>
                      onAllocateFormChange({
                        ...allocateForm,
                        quantityUsed: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={allocateForm.notes}
                    onChange={(e) =>
                      onAllocateFormChange({
                        ...allocateForm,
                        notes: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                {activeStaff.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Allocated To (Staff)
                    </label>
                    <select
                      value={allocateForm.staffMemberId}
                      onChange={(e) =>
                        onAllocateFormChange({
                          ...allocateForm,
                          staffMemberId: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    >
                      <option value={0}>None</option>
                      {activeStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {member.employeeNumber ? ` (${member.employeeNumber})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <PhotoCapture
                    onCapture={(file) => onCapturedFileChange(file)}
                    currentPhotoUrl={capturedFile ? URL.createObjectURL(capturedFile) : undefined}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={onCloseAllocateModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmitAllocate}
                  disabled={isAllocating || !allocateForm.stockItemId}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAllocating ? "Allocating..." : "Allocate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

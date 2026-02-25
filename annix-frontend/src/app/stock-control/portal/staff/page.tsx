"use client";

import { useCallback, useEffect, useState } from "react";
import type { StaffMember, StockControlDepartment } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { PhotoCapture } from "@/app/stock-control/components/PhotoCapture";

export default function StaffPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [departments, setDepartments] = useState<StockControlDepartment[]>([]);
  const [form, setForm] = useState({
    name: "",
    employeeNumber: "",
    departmentId: null as number | null,
  });

  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: { search?: string; active?: string } = {};
      if (search) {
        params.search = search;
      }
      if (showActiveOnly) {
        params.active = "true";
      }
      const [data, depts] = await Promise.all([
        stockControlApiClient.staffMembers(params),
        stockControlApiClient.departments(),
      ]);
      setStaffMembers(Array.isArray(data) ? data : []);
      setDepartments(depts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff members");
    } finally {
      setIsLoading(false);
    }
  }, [search, showActiveOnly]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openCreateModal = () => {
    setEditingMember(null);
    setForm({ name: "", employeeNumber: "", departmentId: null });
    setCapturedFile(null);
    setShowModal(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingMember(member);
    setForm({
      name: member.name,
      employeeNumber: member.employeeNumber ?? "",
      departmentId: member.departmentId,
    });
    setCapturedFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      setIsSaving(true);
      const payload = {
        name: form.name.trim(),
        employeeNumber: form.employeeNumber.trim() || null,
        departmentId: form.departmentId,
      };

      if (editingMember) {
        const updated = await stockControlApiClient.updateStaffMember(editingMember.id, payload);
        if (capturedFile) {
          await stockControlApiClient.uploadStaffPhoto(updated.id, capturedFile);
        }
      } else {
        const created = await stockControlApiClient.createStaffMember(payload);
        if (capturedFile) {
          await stockControlApiClient.uploadStaffPhoto(created.id, capturedFile);
        }
      }

      setShowModal(false);
      setCapturedFile(null);
      fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save staff member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      if (member.active) {
        await stockControlApiClient.deleteStaffMember(member.id);
      } else {
        await stockControlApiClient.updateStaffMember(member.id, {
          active: true,
        } as Partial<StaffMember>);
      }
      fetchStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff member");
    }
  };

  const handlePrintIdCard = async (staffId: number) => {
    try {
      await stockControlApiClient.downloadStaffIdCardPdf(staffId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download ID card");
    }
  };

  const handlePrintBatchIdCards = async () => {
    try {
      const activeIds = staffMembers.filter((m) => m.active).map((m) => m.id);
      await stockControlApiClient.downloadBatchStaffIdCards(
        activeIds.length > 0 ? activeIds : undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download batch ID cards");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Members</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintBatchIdCards}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print ID Cards
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Staff Member
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, employee number, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowActiveOnly(true)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              showActiveOnly
                ? "bg-teal-100 text-teal-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setShowActiveOnly(false)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              !showActiveOnly
                ? "bg-teal-100 text-teal-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : staffMembers.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add staff members to track stock allocations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6"
                  >
                    Staff Member
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:table-cell sm:px-6"
                  >
                    Employee #
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider md:table-cell sm:px-6"
                  >
                    Department
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:px-6"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider lg:table-cell sm:px-6"
                  >
                    Added
                  </th>
                  <th scope="col" className="relative px-3 py-3 sm:px-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap sm:px-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {member.photoUrl ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={member.photoUrl}
                              alt={member.name}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                              <span className="text-sm font-medium text-gray-500">
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-4 whitespace-nowrap text-sm font-mono text-gray-500 sm:table-cell sm:px-6">
                      {member.employeeNumber || "-"}
                    </td>
                    <td className="hidden px-3 py-4 whitespace-nowrap text-sm text-gray-500 md:table-cell sm:px-6">
                      {member.departmentId
                        ? (departments.find((d) => d.id === member.departmentId)?.name ?? "-")
                        : "-"}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap sm:px-6">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          member.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {member.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="hidden px-3 py-4 whitespace-nowrap text-sm text-gray-500 lg:table-cell sm:px-6">
                      {formatDateZA(member.createdAt)}
                    </td>
                    <td className="space-x-1 px-3 py-4 whitespace-nowrap text-right text-sm font-medium sm:space-x-2 sm:px-6">
                      <button
                        onClick={() => openEditModal(member)}
                        className="text-teal-600 hover:text-teal-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={
                          member.active
                            ? "text-red-600 hover:text-red-900"
                            : "text-green-600 hover:text-green-900"
                        }
                      >
                        <span className="hidden sm:inline">
                          {member.active ? "Deactivate" : "Reactivate"}
                        </span>
                        <span className="sm:hidden">{member.active ? "Off" : "On"}</span>
                      </button>
                      <button
                        onClick={() => handlePrintIdCard(member.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <span className="hidden sm:inline">ID Card</span>
                        <span className="sm:hidden">ID</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingMember ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee Number</label>
                  <input
                    type="text"
                    value={form.employeeNumber}
                    onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <select
                    value={form.departmentId ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        departmentId: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value="">No department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <PhotoCapture
                    onCapture={(file) => setCapturedFile(file)}
                    currentPhotoUrl={
                      capturedFile
                        ? URL.createObjectURL(capturedFile)
                        : (editingMember?.photoUrl ?? undefined)
                    }
                  />
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
                  disabled={isSaving || !form.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : editingMember ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

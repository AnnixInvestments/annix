"use client";

import { useCallback, useEffect, useState } from "react";
import type { StockControlDepartment, StockControlLocation } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface DepartmentsLocationsSectionProps {
  onLocationsLoaded?: (locations: StockControlLocation[]) => void;
}

export function DepartmentsLocationsSection({
  onLocationsLoaded,
}: DepartmentsLocationsSectionProps) {
  const [departments, setDepartments] = useState<StockControlDepartment[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [departmentError, setDepartmentError] = useState("");

  const [locations, setLocations] = useState<StockControlLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationDescription, setNewLocationDescription] = useState("");
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [editingLocationDescription, setEditingLocationDescription] = useState("");
  const [locationError, setLocationError] = useState("");

  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const data = await stockControlApiClient.departments();
      setDepartments(data);
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to load departments");
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const data = await stockControlApiClient.locations();
      setLocations(data);
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to load locations");
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    loadLocations();
  }, [loadDepartments, loadLocations]);

  useEffect(() => {
    if (onLocationsLoaded) {
      onLocationsLoaded(locations);
    }
  }, [locations, onLocationsLoaded]);

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    setDepartmentError("");
    try {
      await stockControlApiClient.createDepartment(newDepartmentName.trim());
      setNewDepartmentName("");
      await loadDepartments();
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to add department");
    }
  };

  const handleUpdateDepartment = async (id: number) => {
    if (!editingDepartmentName.trim()) return;
    setDepartmentError("");
    try {
      await stockControlApiClient.updateDepartment(id, {
        name: editingDepartmentName.trim(),
      });
      setEditingDepartmentId(null);
      await loadDepartments();
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to update department");
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    setDepartmentError("");
    try {
      await stockControlApiClient.deleteDepartment(id);
      await loadDepartments();
    } catch (e) {
      setDepartmentError(e instanceof Error ? e.message : "Failed to delete department");
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    setLocationError("");
    try {
      await stockControlApiClient.createLocation(
        newLocationName.trim(),
        newLocationDescription.trim() || undefined,
      );
      setNewLocationName("");
      setNewLocationDescription("");
      await loadLocations();
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to add location");
    }
  };

  const handleUpdateLocation = async (id: number) => {
    if (!editingLocationName.trim()) return;
    setLocationError("");
    try {
      await stockControlApiClient.updateLocation(id, {
        name: editingLocationName.trim(),
        description: editingLocationDescription.trim() || null,
      });
      setEditingLocationId(null);
      await loadLocations();
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to update location");
    }
  };

  const handleDeleteLocation = async (id: number) => {
    setLocationError("");
    try {
      await stockControlApiClient.deleteLocation(id);
      await loadLocations();
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Failed to delete location");
    }
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors mb-4"
      >
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Departments & Locations
      </button>
      {collapsed ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Departments</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manage departments that can be assigned to staff members.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New department name"
                value={newDepartmentName}
                onChange={(e) => {
                  setNewDepartmentName(e.target.value);
                  setDepartmentError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddDepartment();
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAddDepartment}
                disabled={!newDepartmentName.trim()}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>

            {departmentError && <p className="text-sm text-red-600 mb-4">{departmentError}</p>}

            {departmentsLoading ? (
              <div className="text-center py-4 text-gray-500">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No departments yet</div>
            ) : (
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {editingDepartmentId === dept.id ? (
                      <input
                        type="text"
                        value={editingDepartmentName}
                        onChange={(e) => setEditingDepartmentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateDepartment(dept.id);
                          if (e.key === "Escape") setEditingDepartmentId(null);
                        }}
                        autoFocus
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-900">{dept.name}</span>
                    )}
                    <div className="flex items-center gap-2">
                      {editingDepartmentId === dept.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateDepartment(dept.id)}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDepartmentId(null)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDepartmentId(dept.id);
                              setEditingDepartmentName(dept.name);
                            }}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDepartment(dept.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Locations</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manage storage locations for inventory items.
            </p>

            <div className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="New location name"
                value={newLocationName}
                onChange={(e) => {
                  setNewLocationName(e.target.value);
                  setLocationError("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newLocationDescription}
                onChange={(e) => setNewLocationDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLocation();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                disabled={!newLocationName.trim()}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                Add Location
              </button>
            </div>

            {locationError && <p className="text-sm text-red-600 mb-4">{locationError}</p>}

            {locationsLoading ? (
              <div className="text-center py-4 text-gray-500">Loading locations...</div>
            ) : locations.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No locations yet</div>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {editingLocationId === loc.id ? (
                      <div className="flex-1 space-y-2 mr-4">
                        <input
                          type="text"
                          value={editingLocationName}
                          onChange={(e) => setEditingLocationName(e.target.value)}
                          autoFocus
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        />
                        <input
                          type="text"
                          value={editingLocationDescription}
                          onChange={(e) => setEditingLocationDescription(e.target.value)}
                          placeholder="Description (optional)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateLocation(loc.id);
                            if (e.key === "Escape") setEditingLocationId(null);
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">{loc.name}</span>
                        {loc.description && (
                          <span className="ml-2 text-xs text-gray-500">{loc.description}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {editingLocationId === loc.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateLocation(loc.id)}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLocationId(null)}
                            className="text-xs font-medium text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocationId(loc.id);
                              setEditingLocationName(loc.name);
                              setEditingLocationDescription(loc.description ?? "");
                            }}
                            className="text-xs font-medium text-teal-600 hover:text-teal-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

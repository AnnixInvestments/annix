"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  StockControlTeamMember,
  WorkflowStepAssignment,
  WorkflowStepConfig,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { roleLabel } from "../../lib/roleLabels";

const QA_TRIGGER = "quality_check";

interface QaWorkflowSectionProps {
  teamMembers: StockControlTeamMember[];
}

export function QaWorkflowSection(props: QaWorkflowSectionProps) {
  const { teamMembers } = props;

  const [qaSteps, setQaSteps] = useState<WorkflowStepConfig[]>([]);
  const [fgSteps, setFgSteps] = useState<WorkflowStepConfig[]>([]);
  const [assignments, setAssignments] = useState<WorkflowStepAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingActionLabel, setEditingActionLabel] = useState("");
  const [editingFollows, setEditingFollows] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bgSteps, fg, assignmentData] = await Promise.all([
        stockControlApiClient.backgroundStepConfigs(),
        stockControlApiClient.workflowStepConfigs(),
        stockControlApiClient.workflowAssignments(),
      ]);
      const qaOnly = bgSteps
        .filter((s) => s.triggerAfterStep === QA_TRIGGER)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      setQaSteps(qaOnly);
      setFgSteps(fg);
      setAssignments(assignmentData);
    } catch {
      setError("Failed to load QA workflow steps");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentsByStep = assignments.reduce<Record<string, WorkflowStepAssignment>>(
    (acc, a) => ({ ...acc, [a.step]: a }),
    {},
  );

  const allAssignedUsers = assignments.reduce<Array<{ id: number; name: string; role: string }>>(
    (acc, a) => {
      const newUsers = a.users
        .filter((u) => !acc.some((existing) => existing.id === u.id))
        .map((u) => ({ id: u.id, name: u.name, role: u.role }));
      return [...acc, ...newUsers];
    },
    [],
  );

  const matrixUsers = [
    ...allAssignedUsers,
    ...teamMembers
      .filter((m) => !allAssignedUsers.some((u) => u.id === m.id))
      .map((m) => ({ id: m.id, name: m.name, role: m.role })),
  ];

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleToggleAssignment = async (userId: number, stepKey: string) => {
    const assignment = assignmentsByStep[stepKey];
    const currentIds = assignment?.userIds || [];
    const currentPrimary = assignment?.primaryUserId || null;
    const isAssigned = currentIds.includes(userId);
    const newIds = isAssigned ? currentIds.filter((id) => id !== userId) : [...currentIds, userId];
    const newPrimary = isAssigned && currentPrimary === userId ? null : currentPrimary;

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowAssignments(
        stepKey,
        newIds,
        newPrimary ?? undefined,
      );
      await loadData();
      flash("Assignment updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (userId: number, stepKey: string) => {
    const assignment = assignmentsByStep[stepKey];
    const currentIds = assignment?.userIds || [];
    const newIds = currentIds.includes(userId) ? currentIds : [...currentIds, userId];

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowAssignments(stepKey, newIds, userId);
      await loadData();
      flash("Primary user set");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set primary user");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (step: WorkflowStepConfig) => {
    setEditingKey(step.key);
    setEditingLabel(step.label);
    setEditingActionLabel(step.actionLabel || "");
    setEditingFollows(step.triggerAfterStep);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingLabel("");
    setEditingActionLabel("");
    setEditingFollows(null);
  };

  const handleSaveEdit = async () => {
    if (!editingKey || !editingLabel.trim()) return;

    setSaving(true);
    setError("");
    try {
      const step = qaSteps.find((s) => s.key === editingKey);
      if (step && step.label !== editingLabel.trim()) {
        await stockControlApiClient.updateWorkflowStepLabel(editingKey, editingLabel.trim());
      }
      const newActionLabel = editingActionLabel.trim() || null;
      if (step && step.actionLabel !== newActionLabel) {
        await stockControlApiClient.updateStepActionLabel(editingKey, newActionLabel);
      }
      setEditingKey(null);
      await loadData();
      flash("Step updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update step");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollows = async (stepKey: string, triggerAfterStep: string | null) => {
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateStepFollows(stepKey, triggerAfterStep);
      await loadData();
      flash("Step dependency updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update dependency");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStep = async (step: WorkflowStepConfig) => {
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.removeWorkflowStep(step.key);
      await loadData();
      flash("Step removed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove step");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.addWorkflowStep({
        label: newLabel.trim(),
        afterStepKey: "",
        isBackground: true,
        triggerAfterStep: QA_TRIGGER,
      });
      setShowAdd(false);
      setNewLabel("");
      await loadData();
      flash("Step added");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStep = async (stepKey: string, direction: "up" | "down") => {
    const currentIndex = qaSteps.findIndex((s) => s.key === stepKey);
    if (currentIndex === -1) return;
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= qaSteps.length) return;

    const reordered = [...qaSteps];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[swapIndex];
    reordered[swapIndex] = temp;
    setQaSteps(reordered);

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.reorderWorkflowSteps(reordered.map((s) => s.key));
      flash("Order updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder steps");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const possibleFollows = [
    { key: QA_TRIGGER, label: "Quality Check (foreground)" },
    ...qaSteps.map((s) => ({ key: s.key, label: s.label })),
  ];

  const renderAssignmentChips = (stepKey: string) => {
    const assignment = assignmentsByStep[stepKey];
    const assignedUsers = assignment?.users || [];
    const primaryId = assignment?.primaryUserId || null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {assignedUsers.map((u) => (
          <span
            key={u.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
              u.id === primaryId
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
            onClick={() => handleToggleAssignment(u.id, stepKey)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleSetPrimary(u.id, stepKey);
            }}
            title={
              u.id === primaryId
                ? `${u.name} (primary) - click to unassign, right-click to change primary`
                : `${u.name} - click to unassign, right-click to set as primary`
            }
          >
            {u.id === primaryId && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            )}
            {u.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleAssignment(u.id, stepKey);
              }}
              className={`ml-0.5 ${u.id === primaryId ? "text-blue-200 hover:text-white" : "text-blue-400 hover:text-blue-700"}`}
            >
              &times;
            </button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              handleToggleAssignment(Number(e.target.value), stepKey);
            }
          }}
          disabled={saving}
          className="text-xs border border-dashed border-gray-300 rounded-full px-2 py-0.5 text-gray-400 hover:border-blue-400 hover:text-blue-600 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-transparent"
        >
          <option value="">+ Assign</option>
          {matrixUsers
            .filter((u) => !assignedUsers.some((au) => au.id === u.id))
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({roleLabel(u.role)})
              </option>
            ))}
        </select>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-blue-200 p-5 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Quality Assurance Workflow</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {qaSteps.length} steps
          </span>
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            disabled={saving}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            + Add Step
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          {success}
        </div>
      )}

      {collapsed ? null : loading ? (
        <p className="text-sm text-gray-500">Loading QA workflow...</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            These background tasks run after Quality Approval. Click a user chip to unassign,
            right-click to set as primary.
          </p>

          {showAdd && (
            <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddStep();
                    if (e.key === "Escape") {
                      setShowAdd(false);
                      setNewLabel("");
                    }
                  }}
                  placeholder="New step name..."
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={saving || !newLabel.trim()}
                  className="text-xs font-medium px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setNewLabel("");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-8">
                    #
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Step
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Action Label
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned To
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-16">
                    Order
                  </th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-16" />
                </tr>
              </thead>
              <tbody>
                {qaSteps.map((step, idx) => {
                  const isEditing = editingKey === step.key;

                  return (
                    <tr
                      key={step.key}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        isEditing ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="py-2 px-2 text-gray-400 text-xs">{idx + 1}</td>

                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="text-sm border border-blue-300 rounded px-2 py-0.5 w-full focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{step.label}</span>
                            {step.isSystem && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                System
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingActionLabel}
                            onChange={(e) => setEditingActionLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            placeholder="Button label..."
                            className="text-sm border border-blue-300 rounded px-2 py-0.5 w-full focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <span className="text-gray-600 text-xs">{step.actionLabel || "-"}</span>
                        )}
                      </td>

                      <td className="py-2 px-2">{renderAssignmentChips(step.key)}</td>

                      <td className="py-2 px-2">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(step.key, "up")}
                            disabled={saving || idx === 0}
                            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            title="Move up"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(step.key, "down")}
                            disabled={saving || idx === qaSteps.length - 1}
                            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            title="Move down"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>

                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(step)}
                                disabled={saving}
                                className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50"
                                title="Edit step"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveStep(step)}
                                disabled={saving}
                                className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50"
                                title="Delete step"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {qaSteps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                      No QA workflow steps configured. Click &quot;+ Add Step&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

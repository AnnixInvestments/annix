"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  EligibleUser,
  StepNotificationRecipients,
  StockControlTeamMember,
  WorkflowStepAssignment,
  WorkflowStepConfig,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { roleLabel } from "../../lib/roleLabels";

interface WorkflowConfigurationSectionProps {
  teamMembers: StockControlTeamMember[];
}

export function WorkflowConfigurationSection({ teamMembers }: WorkflowConfigurationSectionProps) {
  const [stepConfigs, setStepConfigs] = useState<WorkflowStepConfig[]>([]);
  const [assignments, setAssignments] = useState<WorkflowStepAssignment[]>([]);
  const [recipients, setRecipients] = useState<StepNotificationRecipients[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sectionCollapsed, setSectionCollapsed] = useState(false);
  const [success, setSuccess] = useState(false);
  const [backgroundSteps, setBackgroundSteps] = useState<WorkflowStepConfig[]>([]);

  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const [showAddStep, setShowAddStep] = useState(false);
  const [addAfterStepKey, setAddAfterStepKey] = useState<string | null>(null);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepIsBackground, setNewStepIsBackground] = useState(false);
  const [newStepTriggerAfter, setNewStepTriggerAfter] = useState("");

  const [editingNotifyStep, setEditingNotifyStep] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [editEmails, setEditEmails] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, assignmentData, recipientData, bgSteps] = await Promise.all([
        stockControlApiClient.workflowStepConfigs(),
        stockControlApiClient.workflowAssignments(),
        stockControlApiClient.notificationRecipients(),
        stockControlApiClient.backgroundStepConfigs(),
      ]);
      setStepConfigs(configs);
      setAssignments(assignmentData);
      setRecipients(recipientData);
      setBackgroundSteps(bgSteps);
    } catch {
      setError("Failed to load workflow configuration");
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

  const recipientsByStep = recipients.reduce<Record<string, StepNotificationRecipients>>(
    (acc, r) => ({ ...acc, [r.step]: r }),
    {},
  );

  const allUsers = assignments.reduce<EligibleUser[]>((acc, a) => {
    a.users.forEach((u) => {
      if (!acc.some((existing) => existing.id === u.id)) {
        acc.push(u);
      }
    });
    return acc;
  }, []);

  const uniqueTeamUsers = teamMembers.reduce<StockControlTeamMember[]>((acc, m) => {
    if (!allUsers.some((u) => u.id === m.id) && !acc.some((existing) => existing.id === m.id)) {
      acc.push(m);
    }
    return acc;
  }, []);

  const matrixUsers = [
    ...allUsers.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    ...uniqueTeamUsers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
    })),
  ];

  const triggerKey = (s: WorkflowStepConfig) =>
    String(s["triggerAfterStep" as keyof WorkflowStepConfig] ?? "");

  const allStepsByKey = [...stepConfigs, ...backgroundSteps].reduce<
    Record<string, WorkflowStepConfig>
  >((acc, s) => ({ ...acc, [s.key]: s }), {});

  const followersByKey = [...stepConfigs, ...backgroundSteps].reduce<
    Record<string, WorkflowStepConfig[]>
  >((acc, s) => {
    const parent = triggerKey(s);
    if (parent) {
      return { ...acc, [parent]: [...(acc[parent] ?? []), s] };
    }
    return acc;
  }, {});

  const unifiedSteps = (() => {
    const result: WorkflowStepConfig[] = [];
    const inserted = new Set<string>();

    const insertWithFollowers = (step: WorkflowStepConfig) => {
      if (inserted.has(step.key)) return;
      inserted.add(step.key);
      result.push(step);
      const followers = [...(followersByKey[step.key] ?? [])].sort((a, b) => {
        if (a.isBackground !== b.isBackground) {
          return a.isBackground ? -1 : 1;
        }
        return a.sortOrder - b.sortOrder;
      });
      followers.forEach((f) => insertWithFollowers(f));
    };

    const roots = [...stepConfigs, ...backgroundSteps].filter((s) => {
      const parent = triggerKey(s);
      return !parent || !allStepsByKey[parent];
    });

    roots
      .sort((a, b) => {
        if (a.isBackground !== b.isBackground) {
          return a.isBackground ? -1 : 1;
        }
        return a.sortOrder - b.sortOrder;
      })
      .forEach((root) => insertWithFollowers(root));

    [...stepConfigs, ...backgroundSteps].forEach((s) => {
      if (!inserted.has(s.key)) {
        insertWithFollowers(s);
      }
    });

    return result;
  })();

  const allSteps = [...stepConfigs, ...backgroundSteps];

  const handleToggleAssignment = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds || [];
    const currentPrimary = assignment?.primaryUserId || null;

    const isCurrentlyAssigned = currentIds.includes(userId);
    const newIds = isCurrentlyAssigned
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    const newPrimary = isCurrentlyAssigned && currentPrimary === userId ? null : currentPrimary;

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, newPrimary ?? undefined);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds || [];
    const newIds = currentIds.includes(userId) ? currentIds : [...currentIds, userId];

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, userId);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set primary user");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditLabel = (key: string, currentLabel: string) => {
    setEditingLabelKey(key);
    setEditingLabelValue(currentLabel);
  };

  const handleSaveLabel = async () => {
    if (!editingLabelKey || !editingLabelValue.trim()) return;
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowStepLabel(
        editingLabelKey,
        editingLabelValue.trim(),
      );
      setEditingLabelKey(null);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update label");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStep = async (key: string, direction: "up" | "down") => {
    const currentIndex = stepConfigs.findIndex((s) => s.key === key);
    if (currentIndex === -1) return;
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= stepConfigs.length) return;

    const reordered = [...stepConfigs];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[swapIndex];
    reordered[swapIndex] = temp;

    setStepConfigs(reordered);
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.reorderWorkflowSteps(reordered.map((s) => s.key));
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder steps");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollows = async (stepKey: string, triggerAfterStep: string | null) => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await stockControlApiClient.updateStepFollows(stepKey, triggerAfterStep);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update step order");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStepLabel.trim()) return;
    const afterKey = newStepIsBackground
      ? ""
      : (addAfterStepKey ??
        (stepConfigs.length > 0 ? stepConfigs[stepConfigs.length - 1].key : ""));
    if (!newStepIsBackground && !afterKey) return;
    if (newStepIsBackground && !newStepTriggerAfter) return;

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.addWorkflowStep({
        label: newStepLabel.trim(),
        afterStepKey: afterKey,
        isBackground: newStepIsBackground,
        triggerAfterStep: newStepIsBackground ? newStepTriggerAfter : undefined,
      });
      setShowAddStep(false);
      setAddAfterStepKey(null);
      setNewStepLabel("");
      setNewStepIsBackground(false);
      setNewStepTriggerAfter("");
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBackground = async (key: string, toBackground: boolean) => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const triggerStep = stepConfigs.length > 0 ? stepConfigs[0].key : undefined;
      await stockControlApiClient.toggleWorkflowStepBackground(
        key,
        toBackground,
        toBackground ? triggerStep : undefined,
      );
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle step");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStep = async (key: string) => {
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.removeWorkflowStep(key);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove step");
    } finally {
      setSaving(false);
    }
  };

  const handleEditNotify = (step: string) => {
    const existing = recipientsByStep[step];
    setEditEmails(existing?.emails || []);
    setSelectedEmail("");
    setEditingNotifyStep(step);
    setError("");
    setSuccess(false);
  };

  const handleAddEmail = () => {
    if (!selectedEmail) return;
    const trimmed = selectedEmail.trim().toLowerCase();
    if (editEmails.includes(trimmed)) {
      setError("This user has already been added");
      return;
    }
    setEditEmails((prev) => [...prev, trimmed]);
    setSelectedEmail("");
    setError("");
  };

  const handleRemoveEmail = (email: string) => {
    setEditEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSaveNotify = async () => {
    if (!editingNotifyStep) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    const emailsToSave = selectedEmail.trim().toLowerCase()
      ? [...new Set([...editEmails, selectedEmail.trim().toLowerCase()])]
      : editEmails;

    try {
      await stockControlApiClient.updateNotificationRecipients(editingNotifyStep, emailsToSave);
      await loadData();
      setEditingNotifyStep(null);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save recipients");
    } finally {
      setSaving(false);
    }
  };

  const openAddStepAfter = (afterKey: string) => {
    setAddAfterStepKey(afterKey);
    setNewStepLabel("");
    setNewStepIsBackground(false);
    setNewStepTriggerAfter("");
    setShowAddStep(true);
  };

  const renderUserChips = (stepKey: string) => {
    const assignment = assignmentsByStep[stepKey];
    const assignedUsers = assignment?.users || [];
    const primaryId = assignment?.primaryUserId || null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {assignedUsers.map((u) => (
          <span
            key={u.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
              u.id === primaryId
                ? "bg-teal-600 text-white"
                : "bg-teal-100 text-teal-700 hover:bg-teal-200"
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
              className={`ml-0.5 ${u.id === primaryId ? "text-teal-200 hover:text-white" : "text-teal-400 hover:text-teal-700"}`}
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
          className="text-xs border border-dashed border-gray-300 rounded-full px-2 py-0.5 text-gray-400 hover:border-teal-400 hover:text-teal-600 focus:ring-teal-500 focus:border-teal-500 cursor-pointer bg-transparent"
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

  const renderNotificationSection = (stepKey: string) => {
    const recipient = recipientsByStep[stepKey];
    const isEditing = editingNotifyStep === stepKey;
    const emailCount = recipient?.emails?.length || 0;

    if (isEditing) {
      return (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Notifications
            </span>
            <button
              type="button"
              onClick={() => setEditingNotifyStep(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Select team member...</option>
              {teamMembers
                .filter((m) => !editEmails.includes(m.email.toLowerCase()))
                .map((member) => (
                  <option key={member.id} value={member.email.toLowerCase()}>
                    {member.name} ({member.email})
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAddEmail}
              disabled={!selectedEmail}
              className="px-2 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {editEmails.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {editEmails.map((email) => {
                const member = teamMembers.find((m) => m.email.toLowerCase() === email);
                return (
                  <span
                    key={email}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                  >
                    {member ? member.name : email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveNotify}
            disabled={saving}
            className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      );
    }

    return (
      <div className="mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {emailCount > 0 ? (
              <div className="flex flex-wrap gap-1">
                {recipient.emails.map((email) => {
                  const member = teamMembers.find(
                    (m) => m.email.toLowerCase() === email.toLowerCase(),
                  );
                  return (
                    <span
                      key={email}
                      className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded"
                    >
                      {member ? member.name : email}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-gray-400">No notifications</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleEditNotify(stepKey)}
            className="text-xs text-teal-600 hover:text-teal-700"
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  const renderStepCard = (step: WorkflowStepConfig, index: number, isBackground: boolean) => {
    const isExpanded = expandedStep === step.key;
    const assignment = assignmentsByStep[step.key];
    const assignedCount = assignment?.userIds?.length || 0;
    const primaryUser = assignment?.users?.find((u) => u.id === assignment.primaryUserId);
    const followsStep = String(step["triggerAfterStep" as keyof WorkflowStepConfig] ?? "");

    return (
      <div
        key={step.key}
        className={`border rounded-lg transition-all ${
          isBackground ? "border-amber-200 bg-amber-50/50" : "border-gray-200 bg-white"
        } ${isExpanded ? "shadow-md ring-1 ring-teal-200" : "shadow-sm hover:shadow-md"}`}
      >
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setExpandedStep(isExpanded ? null : step.key)}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isBackground ? "bg-amber-200 text-amber-800" : "bg-teal-100 text-teal-700"
              }`}
            >
              {isBackground ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editingLabelKey === step.key ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingLabelValue}
                    onChange={(e) => setEditingLabelValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveLabel();
                      if (e.key === "Escape") setEditingLabelKey(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="px-2 py-0.5 text-sm border border-teal-400 rounded focus:ring-1 focus:ring-teal-500 w-48"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveLabel();
                    }}
                    className="text-teal-600 hover:text-teal-800"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLabelKey(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{step.label}</span>
                  {isBackground ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBackground(step.key, false);
                      }}
                      className="text-xs bg-amber-100 text-amber-700 hover:bg-teal-100 hover:text-teal-700 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                      title="Click to move to foreground"
                    >
                      Background
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBackground(step.key, true);
                      }}
                      className="text-xs bg-teal-50 text-teal-600 hover:bg-amber-100 hover:text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0 transition-colors"
                      title="Click to move to background"
                    >
                      Foreground
                    </button>
                  )}
                  {step.isSystem && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                      System
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                {assignedCount > 0 ? (
                  <span className="text-xs text-gray-500">
                    {assignedCount} {assignedCount === 1 ? "person" : "people"} assigned
                    {primaryUser ? ` · Primary: ${primaryUser.name}` : ""}
                  </span>
                ) : (
                  <span className="text-xs text-orange-500">No one assigned</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-400">Follows:</span>
                <select
                  value={followsStep}
                  onChange={(e) => handleUpdateFollows(step.key, e.target.value || null)}
                  disabled={saving}
                  className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:ring-teal-500 focus:border-teal-500 bg-white cursor-pointer"
                >
                  <option value="">None</option>
                  {allSteps
                    .filter((s) => s.key !== step.key)
                    .map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                        {s.isBackground ? " (bg)" : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isExpanded && !isBackground && (
              <>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveStep(step.key, "up");
                    }}
                    className="text-gray-300 hover:text-teal-600 p-1"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                )}
                {index < stepConfigs.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveStep(step.key, "down");
                    }}
                    className="text-gray-300 hover:text-teal-600 p-1"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}
              </>
            )}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Assigned Users
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStartEditLabel(step.key, step.label)}
                  className="text-xs text-gray-400 hover:text-teal-600 px-1.5 py-0.5"
                  title="Rename step"
                >
                  Rename
                </button>
                {!isBackground && (
                  <>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveStep(step.key, "up")}
                        className="text-gray-400 hover:text-teal-600 p-1"
                        title="Move up"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                    )}
                    {index < stepConfigs.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveStep(step.key, "down")}
                        className="text-gray-400 hover:text-teal-600 p-1"
                        title="Move down"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleBackground(step.key, true)}
                      className="text-gray-400 hover:text-amber-600 p-1"
                      title="Move to background"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </>
                )}
                {isBackground && (
                  <button
                    type="button"
                    onClick={() => handleToggleBackground(step.key, false)}
                    className="text-gray-400 hover:text-teal-600 p-1"
                    title="Move to foreground"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 17l-5-5 5-5m6 10l-5-5 5-5"
                      />
                    </svg>
                  </button>
                )}
                {!step.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(step.key)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Remove step"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {renderUserChips(step.key)}
            {renderNotificationSection(step.key)}
          </div>
        )}
      </div>
    );
  };

  const renderConnector = (afterStepKey: string, _index: number) => {
    return (
      <div key={`connector-${afterStepKey}`} className="relative">
        <div className="flex justify-center py-1">
          <div className="flex flex-col items-center">
            <svg
              className="w-5 h-5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-center -mt-1">
          <button
            type="button"
            onClick={() => openAddStepAfter(afterStepKey)}
            className="group flex items-center gap-1 px-2 py-0.5 text-xs text-gray-300 hover:text-teal-600 transition-colors"
            title="Add step here"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Add step</span>
          </button>
        </div>
      </div>
    );
  };

  const renderAddStepForm = () => {
    if (!showAddStep) return null;

    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Add New Step</h4>
          <button
            type="button"
            onClick={() => {
              setShowAddStep(false);
              setNewStepIsBackground(false);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={newStepIsBackground}
              onChange={(e) => {
                setNewStepIsBackground(e.target.checked);
                if (e.target.checked && stepConfigs.length > 0) {
                  setNewStepTriggerAfter(addAfterStepKey ?? stepConfigs[0].key);
                }
              }}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Background step (runs parallel, no signature)
          </label>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Step Name</label>
              <input
                type="text"
                value={newStepLabel}
                onChange={(e) => setNewStepLabel(e.target.value)}
                placeholder={newStepIsBackground ? "e.g. Internal QC Check" : "e.g. QC Inspection"}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            {newStepIsBackground && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Trigger After
                </label>
                <select
                  value={newStepTriggerAfter}
                  onChange={(e) => setNewStepTriggerAfter(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  {[...stepConfigs, ...backgroundSteps].map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                      {s.isBackground ? " (background)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={handleAddStep}
              disabled={
                saving || !newStepLabel.trim() || (newStepIsBackground && !newStepTriggerAfter)
              }
              className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Workflow Configuration</h2>
        <div className="text-center py-8 text-gray-500">Loading workflow configuration...</div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setSectionCollapsed((prev) => !prev)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${sectionCollapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Workflow Configuration
        </button>
        {!sectionCollapsed && (
          <button
            type="button"
            onClick={() => {
              setAddAfterStepKey(
                stepConfigs.length > 0 ? stepConfigs[stepConfigs.length - 1].key : null,
              );
              setShowAddStep(!showAddStep);
              setNewStepLabel("");
              setNewStepIsBackground(false);
              setNewStepTriggerAfter("");
            }}
            className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Step
          </button>
        )}
      </div>
      {sectionCollapsed ? null : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Define your workflow steps, assign team members, and configure notifications. Click a
            step to expand.
          </p>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mb-3">Updated successfully.</p>}

          {renderAddStepForm()}

          <div className="space-y-0">
            {unifiedSteps.map((step, idx) => {
              const fgIndex = stepConfigs.findIndex((s) => s.key === step.key);
              const isLastUnified = idx === unifiedSteps.length - 1;
              const nextStep = !isLastUnified ? unifiedSteps[idx + 1] : null;
              const showConnector =
                !isLastUnified && (!step.isBackground || (nextStep && !nextStep.isBackground));

              return (
                <div key={step.key}>
                  {renderStepCard(step, fgIndex >= 0 ? fgIndex : idx, step.isBackground)}
                  {showConnector && renderConnector(step.key, idx)}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
            <span>Click to unassign</span>
            <span>Right-click to set primary</span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              = Primary
            </span>
          </div>
        </>
      )}
    </div>
  );
}

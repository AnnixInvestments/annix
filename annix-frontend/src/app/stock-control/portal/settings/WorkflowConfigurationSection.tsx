"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  EligibleUser,
  StepNotificationRecipients,
  StepOutcome,
  StockControlTeamMember,
  WorkflowStepAssignment,
  WorkflowStepConfig,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { roleLabel } from "../../lib/roleLabels";

const DEFAULT_STEP_OUTCOMES: Record<string, StepOutcome[]> = {
  manager_approval: [
    { key: "soh", label: "SOH", nextStepKey: null, notifyStepKey: null, style: "green" },
    { key: "req", label: "REQ", nextStepKey: null, notifyStepKey: null, style: "amber" },
  ],
  qa_review: [
    { key: "accept", label: "QA Accepted", nextStepKey: null, notifyStepKey: null, style: "green" },
    {
      key: "reject",
      label: "QA Rejected",
      nextStepKey: "qc_repairs",
      notifyStepKey: "qc_repairs",
      style: "red",
    },
  ],
};

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

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editField, setEditField] = useState<{ key: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [newStepIsBackground, setNewStepIsBackground] = useState(false);
  const [newStepTriggerAfter, setNewStepTriggerAfter] = useState("");
  const [newStepLineType, setNewStepLineType] = useState<"connect" | "loop">("connect");

  const [editingNotifyStep, setEditingNotifyStep] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [editEmails, setEditEmails] = useState<string[]>([]);

  const [editingOutcomesKey, setEditingOutcomesKey] = useState<string | null>(null);
  const [editingOutcomes, setEditingOutcomes] = useState<
    Array<{
      key: string;
      label: string;
      nextStepKey: string | null;
      notifyStepKey: string | null;
      style: string;
    }>
  >([]);

  const [editingPhaseLabelsKey, setEditingPhaseLabelsKey] = useState<string | null>(null);
  const [editingPhase1Label, setEditingPhase1Label] = useState("");
  const [editingPhase2Label, setEditingPhase2Label] = useState("");

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
    ...uniqueTeamUsers.map((m) => ({ id: m.id, name: m.name, role: m.role })),
  ];

  const resolvedOutcomes = useCallback(
    (step: WorkflowStepConfig): StepOutcome[] | null =>
      step.stepOutcomes || DEFAULT_STEP_OUTCOMES[step.key] || null,
    [],
  );

  const allSteps = useMemo(
    () => [...stepConfigs, ...backgroundSteps],
    [stepConfigs, backgroundSteps],
  );
  const allStepsByKey = useMemo(
    () =>
      allSteps.reduce<Record<string, WorkflowStepConfig>>((acc, s) => ({ ...acc, [s.key]: s }), {}),
    [allSteps],
  );

  const triggerKey = (s: WorkflowStepConfig) => s.triggerAfterStep || "";

  const followersByKey = useMemo(
    () =>
      allSteps.reduce<Record<string, WorkflowStepConfig[]>>((acc, s) => {
        const parent = triggerKey(s);
        if (parent) {
          return { ...acc, [parent]: [...(acc[parent] || []), s] };
        }
        return acc;
      }, {}),
    [allSteps],
  );

  const unifiedSteps = useMemo(() => {
    const result: WorkflowStepConfig[] = [];
    const inserted = new Set<string>();
    const visiting = new Set<string>();

    const insert = (step: WorkflowStepConfig) => {
      if (inserted.has(step.key)) return;
      if (visiting.has(step.key)) return;
      visiting.add(step.key);
      const parentKey = triggerKey(step);
      if (parentKey && allStepsByKey[parentKey]) {
        insert(allStepsByKey[parentKey]);
      }
      if (inserted.has(step.key)) return;
      inserted.add(step.key);
      result.push(step);
      const followers = [...(followersByKey[step.key] || [])].sort((a, b) => {
        if (a.isBackground !== b.isBackground) {
          return a.isBackground ? -1 : 1;
        }
        if (a.isBackground && b.isBackground) {
          const aColored = a.branchColor !== null;
          const bColored = b.branchColor !== null;
          if (aColored !== bColored) {
            return aColored ? -1 : 1;
          }
        }
        return a.sortOrder - b.sortOrder;
      });
      followers.forEach((f) => insert(f));
    };

    [...backgroundSteps, ...stepConfigs]
      .sort((a, b) => {
        if (a.isBackground !== b.isBackground) {
          return a.isBackground ? -1 : 1;
        }
        return a.sortOrder - b.sortOrder;
      })
      .forEach((s) => insert(s));

    return result;
  }, [stepConfigs, backgroundSteps, allStepsByKey, followersByKey]);

  const fgStepHasMultiPhase = useCallback(
    (fgKey: string) => {
      const bgForStep = backgroundSteps.filter((bg) => bg.triggerAfterStep === fgKey);
      const hasColored = bgForStep.some((bg) => bg.branchColor !== null);
      const hasNull = bgForStep.some((bg) => bg.branchColor === null);
      return hasColored && hasNull;
    },
    [backgroundSteps],
  );

  const savingFieldRef = useRef(false);
  const cancelledRef = useRef(false);
  const saveField = async (stepKey: string, field: string, value: string) => {
    if (savingFieldRef.current || cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    savingFieldRef.current = true;
    setSaving(true);
    setError("");
    try {
      if (field === "label") {
        await stockControlApiClient.updateWorkflowStepLabel(stepKey, value.trim());
      } else if (field === "actionLabel") {
        await stockControlApiClient.updateStepActionLabel(stepKey, value.trim() || null);
      }
      setEditField(null);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
      savingFieldRef.current = false;
    }
  };

  const handleToggleAssignment = async (userId: number, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds || [];
    const currentPrimary = assignment?.primaryUserId || null;
    const currentSecondary = assignment?.secondaryUserId || null;
    const isCurrentlyAssigned = currentIds.includes(userId);
    const newIds = isCurrentlyAssigned
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    const newPrimary = isCurrentlyAssigned && currentPrimary === userId ? null : currentPrimary;
    const newSecondary =
      isCurrentlyAssigned && currentSecondary === userId ? null : currentSecondary;

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowAssignments(
        step,
        newIds,
        newPrimary || undefined,
        newSecondary,
      );
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
    const currentSecondary = assignment?.secondaryUserId || null;

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowAssignments(step, newIds, userId, currentSecondary);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set primary user");
    } finally {
      setSaving(false);
    }
  };

  const handleSetSecondary = async (userId: number | null, step: string) => {
    const assignment = assignmentsByStep[step];
    const currentIds = assignment?.userIds || [];
    const currentPrimary =
      assignment?.primaryUserId || (currentIds.length === 1 ? currentIds[0] : null);

    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateWorkflowAssignments(
        step,
        currentIds,
        currentPrimary || undefined,
        userId,
      );
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set secondary user");
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

  const handleUpdateBranchColor = async (key: string, branchColor: string | null) => {
    setSaving(true);
    setError("");
    try {
      await stockControlApiClient.updateStepBranchColor(key, branchColor);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update line color");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBackground = async (key: string, toBackground: boolean) => {
    setSaving(true);
    setError("");
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

  const handleAddStep = async () => {
    if (!newStepLabel.trim()) return;
    if (newStepIsBackground && !newStepTriggerAfter) return;
    const afterKey = newStepIsBackground
      ? ""
      : stepConfigs.length > 0
        ? stepConfigs[stepConfigs.length - 1].key
        : "";
    if (!newStepIsBackground && !afterKey) return;

    setSaving(true);
    setError("");
    try {
      const newStep = await stockControlApiClient.addWorkflowStep({
        label: newStepLabel.trim(),
        afterStepKey: afterKey,
        isBackground: newStepIsBackground,
        triggerAfterStep: newStepIsBackground ? newStepTriggerAfter : undefined,
      });
      if (newStepIsBackground && newStepLineType === "loop") {
        await stockControlApiClient.updateStepBranchColor(newStep.key, "#3b82f6");
      }
      setShowAddStep(false);
      setNewStepLabel("");
      setNewStepIsBackground(false);
      setNewStepLineType("connect");
      setNewStepTriggerAfter("");
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add step");
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
  };

  const handleSaveNotify = async () => {
    if (!editingNotifyStep) return;
    setSaving(true);
    setError("");
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

  const handleSavePhaseLabels = async () => {
    if (!editingPhaseLabelsKey) return;
    setSaving(true);
    setError("");
    try {
      const p1 = editingPhase1Label.trim();
      const p2 = editingPhase2Label.trim();
      const labels = p1 || p2 ? { "1": p1 || "Phase 1", "2": p2 || "Phase 2" } : null;
      await stockControlApiClient.updatePhaseActionLabels(editingPhaseLabelsKey, labels);
      setEditingPhaseLabelsKey(null);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update phase labels");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOutcomes = async () => {
    if (!editingOutcomesKey) return;
    setSaving(true);
    setError("");
    try {
      const validOutcomes = editingOutcomes.filter((o) => o.key.trim() && o.label.trim());
      const outcomes = validOutcomes.length > 0 ? validOutcomes : null;
      await stockControlApiClient.updateStepOutcomes(editingOutcomesKey, outcomes);
      setEditingOutcomesKey(null);
      await loadData();
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update step outcomes");
    } finally {
      setSaving(false);
    }
  };

  const fgIndex = (key: string) => stepConfigs.findIndex((s) => s.key === key);

  const primaryName = (stepKey: string) => {
    const assignment = assignmentsByStep[stepKey];
    const assignedUsers = assignment?.users || [];
    const pId =
      assignment?.primaryUserId || (assignedUsers.length === 1 ? assignedUsers[0].id : null);
    const primary = assignedUsers.find((u) => u.id === pId);
    return primary?.name || null;
  };

  const secondaryName = (stepKey: string) => {
    const assignment = assignmentsByStep[stepKey];
    if (!assignment?.secondaryUserId) return null;
    const user = matrixUsers.find((u) => u.id === assignment.secondaryUserId);
    return user?.name || null;
  };

  const notifyNames = (stepKey: string) => {
    const r = recipientsByStep[stepKey];
    if (!r?.emails?.length) return null;
    return r.emails
      .map((email) => {
        const member = teamMembers.find((m) => m.email.toLowerCase() === email.toLowerCase());
        return member?.name || email;
      })
      .join(", ");
  };

  const lineLabel = (step: WorkflowStepConfig) => {
    if (!step.isBackground) return null;
    if (!step.branchColor) return "Amber";
    const map: Record<string, string> = {
      "#3b82f6": "Blue",
      "#22c55e": "Green",
      "#a855f7": "Purple",
      "#ef4444": "Red",
    };
    return map[step.branchColor] || "Colored";
  };

  const followsLabel = (step: WorkflowStepConfig) => {
    const tk = triggerKey(step);
    if (!tk) return null;
    const parent = allStepsByKey[tk];
    return parent ? `${parent.label}${parent.isBackground ? " (bg)" : ""}` : tk;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const isExpanded = (key: string) => expandedRow === key;
  const isEditing = (key: string, field: string) =>
    editField?.key === key && editField?.field === field;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => setSectionCollapsed(!sectionCollapsed)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${sectionCollapsed ? "-rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Workflow Configuration</h3>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAddStep(!showAddStep);
          }}
          className="text-xs text-teal-600 hover:text-teal-800 font-medium"
        >
          + Add Step
        </button>
      </div>

      {!sectionCollapsed && (
        <div className="px-5 py-3">
          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>
          )}
          {success && !error && (
            <div className="mb-3 text-xs text-green-600 bg-green-50 px-3 py-2 rounded">
              Saved successfully
              <button type="button" onClick={() => setSuccess(false)} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}

          {showAddStep && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Label</label>
                  <input
                    type="text"
                    value={newStepLabel}
                    onChange={(e) => setNewStepLabel(e.target.value)}
                    placeholder="Step name"
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded w-40 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={newStepIsBackground ? "bg" : "fg"}
                    onChange={(e) => setNewStepIsBackground(e.target.value === "bg")}
                    className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="fg">Foreground</option>
                    <option value="bg">Background</option>
                  </select>
                </div>
                {newStepIsBackground && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Triggered By</label>
                      <select
                        value={newStepTriggerAfter}
                        onChange={(e) => setNewStepTriggerAfter(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">Select step...</option>
                        {stepConfigs.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Line Type</label>
                      <select
                        value={newStepLineType}
                        onChange={(e) => setNewStepLineType(e.target.value as "connect" | "loop")}
                        className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="connect">Connect (amber)</option>
                        <option value="loop">Loop (blue)</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddStep}
                    disabled={saving || !newStepLabel.trim()}
                    className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStep(false)}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 uppercase tracking-wide">
                  <th className="py-2 pr-2 w-8" />
                  <th className="py-2 px-2 font-medium">Step</th>
                  <th className="py-2 px-2 font-medium">Type</th>
                  <th className="py-2 px-2 font-medium">Follows</th>
                  <th className="py-2 px-2 font-medium">Line</th>
                  <th className="py-2 px-2 font-medium">Action Label</th>
                  <th className="py-2 px-2 font-medium">Outcomes</th>
                  <th className="py-2 px-2 font-medium">Primary</th>
                  <th className="py-2 px-2 font-medium">Secondary</th>
                  <th className="py-2 px-2 font-medium">Notify</th>
                  <th className="py-2 pl-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {unifiedSteps.map((step) => {
                  const fi = fgIndex(step.key);
                  const isBg = step.isBackground;
                  const assignment = assignmentsByStep[step.key];
                  const assignedUsers = assignment?.users || [];
                  const pId =
                    assignment?.primaryUserId ||
                    (assignedUsers.length === 1 ? assignedUsers[0].id : null);

                  return (
                    <Fragment key={step.key}>
                      <tr
                        className={`border-b border-gray-100 transition-colors ${
                          !isBg
                            ? "bg-teal-50/60 hover:bg-teal-50"
                            : step.branchColor === "#3b82f6"
                              ? "bg-blue-50/50 hover:bg-blue-50/80"
                              : step.branchColor === "#22c55e"
                                ? "bg-green-50/50 hover:bg-green-50/80"
                                : step.branchColor === "#a855f7"
                                  ? "bg-purple-50/50 hover:bg-purple-50/80"
                                  : step.branchColor === "#ef4444"
                                    ? "bg-red-50/50 hover:bg-red-50/80"
                                    : "bg-amber-50/40 hover:bg-amber-50/70"
                        } ${step.branchColor ? "border-l-2" : !isBg ? "border-l-2 border-l-teal-400" : "border-l-2 border-l-amber-400"}`}
                        style={step.branchColor ? { borderLeftColor: step.branchColor } : undefined}
                      >
                        {/* Order */}
                        <td className="py-2 pr-2 text-center">
                          {!isBg && (
                            <div className="flex flex-col items-center gap-0.5">
                              {fi > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveStep(step.key, "up")}
                                  className="text-gray-300 hover:text-teal-600 leading-none"
                                >
                                  <svg
                                    className="w-3 h-3"
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
                              <span className="text-gray-400 font-semibold text-[10px]">
                                {fi + 1}
                              </span>
                              {fi < stepConfigs.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveStep(step.key, "down")}
                                  className="text-gray-300 hover:text-teal-600 leading-none"
                                >
                                  <svg
                                    className="w-3 h-3"
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
                            </div>
                          )}
                        </td>

                        {/* Step Name */}
                        <td className="py-2 px-2">
                          {isEditing(step.key, "label") ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveField(step.key, "label", editValue);
                                if (e.key === "Escape") {
                                  cancelledRef.current = true;
                                  setEditField(null);
                                }
                              }}
                              onBlur={() => saveField(step.key, "label", editValue)}
                              autoFocus
                              className="px-1.5 py-0.5 border border-teal-400 rounded text-xs w-full max-w-[140px] focus:ring-1 focus:ring-teal-500"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditField({ key: step.key, field: "label" });
                                setEditValue(step.label);
                              }}
                              className="font-medium text-gray-900 hover:text-teal-600 text-left truncate max-w-[140px] block"
                              title={`Click to rename: ${step.label}`}
                            >
                              {step.label}
                            </button>
                          )}
                        </td>

                        {/* Type badge */}
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() => handleToggleBackground(step.key, !isBg)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isBg
                                ? "bg-amber-100 text-amber-700 hover:bg-teal-100 hover:text-teal-700"
                                : "bg-teal-50 text-teal-600 hover:bg-amber-100 hover:text-amber-700"
                            }`}
                            title={`Click to make ${isBg ? "foreground" : "background"}`}
                          >
                            {isBg ? "BG" : "FG"}
                          </button>
                        </td>

                        {/* Follows */}
                        <td className="py-2 px-2">
                          <select
                            value={triggerKey(step)}
                            onChange={(e) => handleUpdateFollows(step.key, e.target.value || null)}
                            disabled={saving}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white cursor-pointer max-w-[120px] focus:ring-teal-500 focus:border-teal-500"
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
                        </td>

                        {/* Line color */}
                        <td className="py-2 px-2">
                          {isBg ? (
                            <select
                              value={step.branchColor || ""}
                              onChange={(e) =>
                                handleUpdateBranchColor(step.key, e.target.value || null)
                              }
                              disabled={saving}
                              className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white cursor-pointer focus:ring-teal-500 focus:border-teal-500"
                              style={
                                step.branchColor
                                  ? { borderColor: step.branchColor, color: step.branchColor }
                                  : undefined
                              }
                            >
                              <option value="">Amber</option>
                              <option value="#3b82f6">Blue</option>
                              <option value="#22c55e">Green</option>
                              <option value="#a855f7">Purple</option>
                              <option value="#ef4444">Red</option>
                            </select>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>

                        {/* Action Label */}
                        <td className="py-2 px-2">
                          {isEditing(step.key, "actionLabel") ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  saveField(step.key, "actionLabel", editValue);
                                if (e.key === "Escape") {
                                  cancelledRef.current = true;
                                  setEditField(null);
                                }
                              }}
                              onBlur={() => saveField(step.key, "actionLabel", editValue)}
                              autoFocus
                              className="px-1.5 py-0.5 border border-teal-400 rounded text-xs w-full max-w-[120px] focus:ring-1 focus:ring-teal-500"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditField({ key: step.key, field: "actionLabel" });
                                setEditValue(step.actionLabel || "");
                              }}
                              className="text-gray-600 hover:text-teal-600 text-left truncate max-w-[120px] block"
                              title={step.actionLabel || "Click to set action label"}
                            >
                              {step.actionLabel || <span className="text-gray-300 italic">--</span>}
                            </button>
                          )}
                        </td>

                        {/* Outcomes */}
                        <td className="py-2 px-2">
                          {(() => {
                            const outcomes = resolvedOutcomes(step);
                            const phaseLabels = step.phaseActionLabels;
                            const hasPhases =
                              !isBg && phaseLabels && Object.keys(phaseLabels).length > 0;
                            const hasOutcomes = outcomes && outcomes.length > 0;

                            if (hasPhases || hasOutcomes) {
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {hasPhases &&
                                    Object.entries(phaseLabels).map(([phase, label]) => (
                                      <span
                                        key={`phase-${phase}`}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium bg-teal-100 text-teal-700 border-teal-300"
                                        title={`Phase ${phase} action`}
                                      >
                                        P{phase}: {label}
                                      </span>
                                    ))}
                                  {hasOutcomes &&
                                    outcomes.map((o) => {
                                      const colorMap: Record<string, string> = {
                                        green: "bg-green-100 text-green-700 border-green-300",
                                        red: "bg-red-100 text-red-700 border-red-300",
                                        amber: "bg-amber-100 text-amber-700 border-amber-300",
                                        blue: "bg-blue-100 text-blue-700 border-blue-300",
                                      };
                                      const cls =
                                        colorMap[o.style] ||
                                        "bg-gray-100 text-gray-700 border-gray-300";
                                      const target = o.notifyStepKey
                                        ? backgroundSteps.find((bg) => bg.key === o.notifyStepKey)
                                        : null;
                                      return (
                                        <span
                                          key={o.key}
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${cls}`}
                                          title={
                                            target
                                              ? `Routes to: ${target.label}`
                                              : "Continues linearly"
                                          }
                                        >
                                          {o.label}
                                          {target ? (
                                            <span className="ml-0.5 opacity-60">
                                              {"\u2192"}
                                              {target.label}
                                            </span>
                                          ) : null}
                                        </span>
                                      );
                                    })}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedRow(step.key);
                                      if (hasOutcomes) {
                                        setEditingOutcomesKey(step.key);
                                        setEditingOutcomes((outcomes || []).map((o) => ({ ...o })));
                                      }
                                    }}
                                    className="text-[10px] text-gray-400 hover:text-teal-600"
                                    title="Edit"
                                  >
                                    edit
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedRow(step.key);
                                  setEditingOutcomesKey(step.key);
                                  setEditingOutcomes([
                                    {
                                      key: "",
                                      label: "",
                                      nextStepKey: null,
                                      notifyStepKey: null,
                                      style: "green",
                                    },
                                  ]);
                                }}
                                className="text-[10px] text-gray-400 hover:text-teal-600 border border-dashed border-gray-300 hover:border-teal-400 rounded px-1.5 py-0.5 transition-colors"
                                title="Add branching outcomes (e.g. accept/reject)"
                              >
                                + Add Paths
                              </button>
                            );
                          })()}
                        </td>

                        {/* Primary user */}
                        <td className="py-2 px-2">
                          <select
                            value={pId || ""}
                            onChange={(e) => {
                              const uid = Number(e.target.value);
                              if (uid) {
                                handleSetPrimary(uid, step.key);
                              }
                            }}
                            disabled={saving}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white cursor-pointer max-w-[110px] focus:ring-teal-500 focus:border-teal-500"
                          >
                            <option value="">--</option>
                            {matrixUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Secondary user */}
                        <td className="py-2 px-2">
                          <select
                            value={assignment?.secondaryUserId || ""}
                            onChange={(e) =>
                              handleSetSecondary(
                                e.target.value ? Number(e.target.value) : null,
                                step.key,
                              )
                            }
                            disabled={saving}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white cursor-pointer max-w-[110px] focus:ring-teal-500 focus:border-teal-500"
                          >
                            <option value="">--</option>
                            {matrixUsers
                              .filter((u) => u.id !== pId)
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                          </select>
                        </td>

                        {/* Notifications */}
                        <td className="py-2 px-2">
                          <select
                            value={recipientsByStep[step.key]?.emails?.[0] || ""}
                            onChange={async (e) => {
                              const email = e.target.value;
                              const emails = email ? [email] : [];
                              setSaving(true);
                              try {
                                await stockControlApiClient.updateNotificationRecipients(
                                  step.key,
                                  emails,
                                );
                                await loadData();
                              } catch (err) {
                                setError(
                                  err instanceof Error ? err.message : "Failed to save recipient",
                                );
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                            className="w-full text-xs border border-gray-200 rounded px-1 py-0.5 bg-transparent focus:ring-teal-500 focus:border-teal-500 max-w-[120px] truncate"
                          >
                            <option value="">--</option>
                            {matrixUsers.map((u) => {
                              const email =
                                teamMembers.find((m) => m.id === u.id)?.email?.toLowerCase() || "";
                              return email ? (
                                <option key={u.id} value={email}>
                                  {u.name}
                                </option>
                              ) : null;
                            })}
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedRow(isExpanded(step.key) ? null : step.key)}
                              className="text-gray-300 hover:text-teal-600 p-0.5"
                              title="Expand"
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform ${isExpanded(step.key) ? "rotate-180" : ""}`}
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
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(step.key)}
                              className="text-gray-300 hover:text-red-500 p-0.5"
                              title="Delete"
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
                          </div>
                        </td>
                      </tr>
                      {isExpanded(step.key) && (
                        <tr key={`${step.key}-detail`} className="bg-gray-50/80">
                          <td colSpan={11} className="p-3 text-xs border-b border-gray-200">
                            {(() => {
                              if (!step) return null;
                              const assignment = assignmentsByStep[step.key];
                              const assignedUsers = assignment?.users || [];
                              const pId =
                                assignment?.primaryUserId ||
                                (assignedUsers.length === 1 ? assignedUsers[0].id : null);

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-700">
                                      {step.label} — Details
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedRow(null)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      Close
                                    </button>
                                  </div>

                                  {/* Assigned users chips */}
                                  <div>
                                    <span className="text-gray-500 font-medium uppercase tracking-wide text-[10px]">
                                      Assigned Users
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {assignedUsers.map((u) => (
                                        <span
                                          key={u.id}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                                            u.id === pId
                                              ? "bg-teal-600 text-white"
                                              : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                                          }`}
                                          onClick={() => handleToggleAssignment(u.id, step.key)}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            handleSetPrimary(u.id, step.key);
                                          }}
                                          title={
                                            u.id === pId
                                              ? `${u.name} (primary) — click to unassign`
                                              : `${u.name} — click to unassign, right-click for primary`
                                          }
                                        >
                                          {u.id === pId && (
                                            <svg
                                              className="w-2.5 h-2.5"
                                              fill="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                            </svg>
                                          )}
                                          {u.name}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleAssignment(u.id, step.key);
                                            }}
                                            className={
                                              u.id === pId
                                                ? "text-teal-200 hover:text-white ml-0.5"
                                                : "text-teal-400 hover:text-teal-700 ml-0.5"
                                            }
                                          >
                                            &times;
                                          </button>
                                        </span>
                                      ))}
                                      <select
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleToggleAssignment(
                                              Number(e.target.value),
                                              step.key,
                                            );
                                          }
                                        }}
                                        disabled={saving}
                                        className="border border-dashed border-gray-300 rounded-full px-2 py-0.5 text-gray-400 hover:border-teal-400 hover:text-teal-600 cursor-pointer bg-transparent"
                                      >
                                        <option value="">+ Assign</option>
                                        {matrixUsers
                                          .filter(
                                            (u) => !assignedUsers.some((au) => au.id === u.id),
                                          )
                                          .map((u) => (
                                            <option key={u.id} value={u.id}>
                                              {u.name} ({roleLabel(u.role)})
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Notifications editing */}
                                  {editingNotifyStep === step.key && (
                                    <div>
                                      <span className="text-gray-500 font-medium uppercase tracking-wide text-[10px]">
                                        Notification Recipients
                                      </span>
                                      <div className="flex gap-2 mt-1">
                                        <select
                                          value={selectedEmail}
                                          onChange={(e) => setSelectedEmail(e.target.value)}
                                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                                        >
                                          <option value="">Select team member...</option>
                                          {teamMembers
                                            .filter(
                                              (m) => !editEmails.includes(m.email.toLowerCase()),
                                            )
                                            .map((member) => (
                                              <option
                                                key={member.id}
                                                value={member.email.toLowerCase()}
                                              >
                                                {member.name} ({member.email})
                                              </option>
                                            ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!selectedEmail) return;
                                            const trimmed = selectedEmail.trim().toLowerCase();
                                            if (!editEmails.includes(trimmed)) {
                                              setEditEmails((prev) => [...prev, trimmed]);
                                            }
                                            setSelectedEmail("");
                                          }}
                                          disabled={!selectedEmail}
                                          className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                                        >
                                          Add
                                        </button>
                                      </div>
                                      {editEmails.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                          {editEmails.map((email) => {
                                            const member = teamMembers.find(
                                              (m) => m.email.toLowerCase() === email,
                                            );
                                            return (
                                              <span
                                                key={email}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
                                              >
                                                {member?.name || email}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setEditEmails((prev) =>
                                                      prev.filter((e) => e !== email),
                                                    )
                                                  }
                                                  className="ml-1 text-blue-500 hover:text-blue-700"
                                                >
                                                  &times;
                                                </button>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                      <div className="mt-2 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={handleSaveNotify}
                                          disabled={saving}
                                          className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                                        >
                                          {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingNotifyStep(null)}
                                          className="px-3 py-1 text-gray-500 hover:text-gray-700"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Phase details for multi-phase fg steps */}
                                  {!step.isBackground &&
                                    fgStepHasMultiPhase(step.key) &&
                                    (() => {
                                      const bgForStep = backgroundSteps.filter(
                                        (bg) => bg.triggerAfterStep === step.key,
                                      );
                                      const phase1Steps = bgForStep.filter(
                                        (bg) => bg.branchColor !== null,
                                      );
                                      const phase2Steps = bgForStep.filter(
                                        (bg) => bg.branchColor === null,
                                      );

                                      return (
                                        <div>
                                          <span className="text-gray-500 font-medium uppercase tracking-wide text-[10px]">
                                            Phase Configuration
                                          </span>
                                          <div className="mt-1.5 grid grid-cols-2 gap-3">
                                            {/* Phase 1 */}
                                            <div className="border border-blue-200 rounded-lg p-2.5 bg-blue-50/50">
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-200 text-blue-800">
                                                  Phase 1
                                                </span>
                                                {editingPhaseLabelsKey === step.key ? (
                                                  <input
                                                    type="text"
                                                    value={editingPhase1Label}
                                                    onChange={(e) =>
                                                      setEditingPhase1Label(e.target.value)
                                                    }
                                                    placeholder="Phase 1 label"
                                                    className="px-2 py-0.5 border border-gray-300 rounded w-32 text-xs focus:ring-teal-500 focus:border-teal-500"
                                                  />
                                                ) : (
                                                  <span className="font-medium text-blue-800">
                                                    {step.phaseActionLabels?.["1"] || "Auto"}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-gray-500 mb-1.5">
                                                Triggers (coloured line tasks):
                                              </div>
                                              <div className="flex flex-wrap gap-1 mb-2">
                                                {phase1Steps.map((bg) => (
                                                  <span
                                                    key={bg.key}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 border border-blue-200"
                                                  >
                                                    {bg.label}
                                                  </span>
                                                ))}
                                              </div>
                                              <div className="text-[10px] text-gray-500 mb-0.5">
                                                Notify:
                                              </div>
                                              <div className="flex flex-wrap gap-1">
                                                {phase1Steps.map((bg) => {
                                                  const notifyEmail =
                                                    recipientsByStep[bg.key]?.emails?.[0] || "";
                                                  const notifyMember = notifyEmail
                                                    ? teamMembers.find(
                                                        (m) =>
                                                          m.email.toLowerCase() ===
                                                          notifyEmail.toLowerCase(),
                                                      )
                                                    : null;
                                                  return (
                                                    <span
                                                      key={bg.key}
                                                      className="inline-flex items-center gap-1 text-[10px] text-gray-600"
                                                    >
                                                      <span className="font-medium">
                                                        {bg.label}:
                                                      </span>
                                                      {notifyMember?.name || notifyEmail || (
                                                        <span className="italic text-gray-400">
                                                          none
                                                        </span>
                                                      )}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            {/* Phase 2 */}
                                            <div className="border border-amber-200 rounded-lg p-2.5 bg-amber-50/50">
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 text-amber-800">
                                                  Phase 2
                                                </span>
                                                {editingPhaseLabelsKey === step.key ? (
                                                  <input
                                                    type="text"
                                                    value={editingPhase2Label}
                                                    onChange={(e) =>
                                                      setEditingPhase2Label(e.target.value)
                                                    }
                                                    placeholder="Phase 2 label"
                                                    className="px-2 py-0.5 border border-gray-300 rounded w-32 text-xs focus:ring-teal-500 focus:border-teal-500"
                                                  />
                                                ) : (
                                                  <span className="font-medium text-amber-800">
                                                    {step.phaseActionLabels?.["2"] || "Auto"}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-gray-500 mb-1.5">
                                                Triggers (default line tasks):
                                              </div>
                                              <div className="flex flex-wrap gap-1 mb-2">
                                                {phase2Steps.map((bg) => (
                                                  <span
                                                    key={bg.key}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-200"
                                                  >
                                                    {bg.label}
                                                  </span>
                                                ))}
                                              </div>
                                              <div className="text-[10px] text-gray-500 mb-0.5">
                                                Notify:
                                              </div>
                                              <div className="flex flex-wrap gap-1">
                                                {phase2Steps.map((bg) => {
                                                  const notifyEmail =
                                                    recipientsByStep[bg.key]?.emails?.[0] || "";
                                                  const notifyMember = notifyEmail
                                                    ? teamMembers.find(
                                                        (m) =>
                                                          m.email.toLowerCase() ===
                                                          notifyEmail.toLowerCase(),
                                                      )
                                                    : null;
                                                  return (
                                                    <span
                                                      key={bg.key}
                                                      className="inline-flex items-center gap-1 text-[10px] text-gray-600"
                                                    >
                                                      <span className="font-medium">
                                                        {bg.label}:
                                                      </span>
                                                      {notifyMember?.name || notifyEmail || (
                                                        <span className="italic text-gray-400">
                                                          none
                                                        </span>
                                                      )}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Edit / Save phase labels */}
                                          <div className="mt-2 flex items-center gap-2">
                                            {editingPhaseLabelsKey === step.key ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={handleSavePhaseLabels}
                                                  disabled={saving}
                                                  className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                                                >
                                                  Save Labels
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingPhaseLabelsKey(null)}
                                                  className="text-gray-400 hover:text-gray-600"
                                                >
                                                  Cancel
                                                </button>
                                              </>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingPhaseLabelsKey(step.key);
                                                  setEditingPhase1Label(
                                                    step.phaseActionLabels?.["1"] || "",
                                                  );
                                                  setEditingPhase2Label(
                                                    step.phaseActionLabels?.["2"] || "",
                                                  );
                                                }}
                                                className="text-[10px] text-teal-600 hover:text-teal-800"
                                              >
                                                Edit Phase Labels
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                  {/* Branch configuration for coloured bg steps */}
                                  {step.isBackground && step.branchColor !== null && (
                                    <div>
                                      <span className="text-gray-500 font-medium uppercase tracking-wide text-[10px]">
                                        Branch Configuration
                                      </span>
                                      <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-gray-500">
                                            Branch Type:
                                          </span>
                                          <select
                                            value={step.branchType || "loop"}
                                            onChange={async (e) => {
                                              const val = e.target.value as "loop" | "connect";
                                              setSaving(true);
                                              try {
                                                await stockControlApiClient.updateStepBranchType(
                                                  step.key,
                                                  val,
                                                );
                                                await loadData();
                                                setSuccess(true);
                                              } catch (err) {
                                                setError(
                                                  err instanceof Error
                                                    ? err.message
                                                    : "Failed to update branch type",
                                                );
                                              } finally {
                                                setSaving(false);
                                              }
                                            }}
                                            disabled={saving}
                                            className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:ring-teal-500 focus:border-teal-500"
                                          >
                                            <option value="loop">
                                              Loop (returns to same step)
                                            </option>
                                            <option value="connect">
                                              Connect (rejoins main line)
                                            </option>
                                          </select>
                                        </div>
                                        {step.branchType === "connect" && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-500">
                                              Rejoin at:
                                            </span>
                                            <select
                                              value={step.rejoinAtStep || ""}
                                              onChange={async (e) => {
                                                const val = e.target.value || null;
                                                setSaving(true);
                                                try {
                                                  await stockControlApiClient.updateStepRejoinAtStep(
                                                    step.key,
                                                    val,
                                                  );
                                                  await loadData();
                                                  setSuccess(true);
                                                } catch (err) {
                                                  setError(
                                                    err instanceof Error
                                                      ? err.message
                                                      : "Failed to update rejoin point",
                                                  );
                                                } finally {
                                                  setSaving(false);
                                                }
                                              }}
                                              disabled={saving}
                                              className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:ring-teal-500 focus:border-teal-500"
                                            >
                                              <option value="">Select step...</option>
                                              {allSteps
                                                .filter((s) => s.key !== step.key)
                                                .map((s) => (
                                                  <option key={s.key} value={s.key}>
                                                    {s.label} {s.isBackground ? "(bg)" : "(fg)"}
                                                  </option>
                                                ))}
                                            </select>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Outcomes for bg steps */}
                                  {step.isBackground && (
                                    <div>
                                      <span className="text-gray-500 font-medium uppercase tracking-wide text-[10px]">
                                        Step Outcomes
                                      </span>
                                      {editingOutcomesKey === step.key ? (
                                        <div className="mt-1 space-y-1.5">
                                          {editingOutcomes.map((outcome, oi) => (
                                            <div
                                              key={oi}
                                              className="flex items-center gap-2 flex-wrap"
                                            >
                                              <input
                                                type="text"
                                                value={outcome.key}
                                                onChange={(e) => {
                                                  const updated = editingOutcomes.map((o, i) =>
                                                    i === oi
                                                      ? {
                                                          ...o,
                                                          key: e.target.value
                                                            .replace(/\s+/g, "_")
                                                            .toLowerCase(),
                                                        }
                                                      : o,
                                                  );
                                                  setEditingOutcomes(updated);
                                                }}
                                                placeholder="Key"
                                                className="px-1.5 py-0.5 border border-gray-300 rounded w-16"
                                              />
                                              <input
                                                type="text"
                                                value={outcome.label}
                                                onChange={(e) => {
                                                  const updated = editingOutcomes.map((o, i) =>
                                                    i === oi ? { ...o, label: e.target.value } : o,
                                                  );
                                                  setEditingOutcomes(updated);
                                                }}
                                                placeholder="Button Label"
                                                className="px-1.5 py-0.5 border border-gray-300 rounded flex-1 min-w-[100px]"
                                              />
                                              <select
                                                value={outcome.style}
                                                onChange={(e) => {
                                                  const updated = editingOutcomes.map((o, i) =>
                                                    i === oi ? { ...o, style: e.target.value } : o,
                                                  );
                                                  setEditingOutcomes(updated);
                                                }}
                                                className="px-1.5 py-0.5 border border-gray-300 rounded"
                                              >
                                                <option value="green">Green</option>
                                                <option value="red">Red</option>
                                                <option value="amber">Amber</option>
                                                <option value="blue">Blue</option>
                                              </select>
                                              <select
                                                value={outcome.notifyStepKey || ""}
                                                onChange={(e) => {
                                                  const val = e.target.value || null;
                                                  const updated = editingOutcomes.map((o, i) =>
                                                    i === oi
                                                      ? {
                                                          ...o,
                                                          notifyStepKey: val,
                                                          nextStepKey: val,
                                                        }
                                                      : o,
                                                  );
                                                  setEditingOutcomes(updated);
                                                }}
                                                className="px-1.5 py-0.5 border border-gray-300 rounded"
                                              >
                                                <option value="">Next (linear)</option>
                                                {backgroundSteps
                                                  .filter((bg) => bg.key !== step.key)
                                                  .map((bg) => (
                                                    <option key={bg.key} value={bg.key}>
                                                      {bg.label}
                                                    </option>
                                                  ))}
                                              </select>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setEditingOutcomes(
                                                    editingOutcomes.filter((_, i) => i !== oi),
                                                  )
                                                }
                                                className="text-red-400 hover:text-red-600"
                                              >
                                                &times;
                                              </button>
                                            </div>
                                          ))}
                                          <div className="flex items-center gap-2 mt-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingOutcomes([
                                                  ...editingOutcomes,
                                                  {
                                                    key: "",
                                                    label: "",
                                                    nextStepKey: null,
                                                    notifyStepKey: null,
                                                    style: "green",
                                                  },
                                                ])
                                              }
                                              className="text-teal-600 hover:text-teal-800"
                                            >
                                              + Add Outcome
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleSaveOutcomes}
                                              disabled={saving}
                                              className="px-2 py-0.5 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingOutcomesKey(null)}
                                              className="text-gray-400 hover:text-gray-600"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          {(() => {
                                            const outcomes = resolvedOutcomes(step);
                                            return outcomes && outcomes.length > 0 ? (
                                              <>
                                                {outcomes.map((o) => {
                                                  const colorMap: Record<string, string> = {
                                                    green: "bg-green-50 text-green-700",
                                                    red: "bg-red-50 text-red-700",
                                                    amber: "bg-amber-50 text-amber-700",
                                                    blue: "bg-blue-50 text-blue-700",
                                                  };
                                                  const cls =
                                                    colorMap[o.style] || "bg-gray-50 text-gray-700";
                                                  const target = o.notifyStepKey
                                                    ? backgroundSteps.find(
                                                        (bg) => bg.key === o.notifyStepKey,
                                                      )
                                                    : null;
                                                  return (
                                                    <span
                                                      key={o.key}
                                                      className={`px-2 py-0.5 rounded ${cls}`}
                                                    >
                                                      {o.label}
                                                      {target ? ` \u2192 ${target.label}` : ""}
                                                    </span>
                                                  );
                                                })}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingOutcomesKey(step.key);
                                                    setEditingOutcomes(
                                                      (outcomes || []).map((o) => ({
                                                        ...o,
                                                      })),
                                                    );
                                                  }}
                                                  className="text-teal-600 hover:text-teal-800"
                                                >
                                                  Edit
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-gray-400 italic">
                                                  Single outcome (default)
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingOutcomesKey(step.key);
                                                    setEditingOutcomes([
                                                      {
                                                        key: "",
                                                        label: "",
                                                        nextStepKey: null,
                                                        notifyStepKey: null,
                                                        style: "green",
                                                      },
                                                    ]);
                                                  }}
                                                  className="text-teal-600 hover:text-teal-800"
                                                >
                                                  Add Outcomes
                                                </button>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 text-[10px] text-gray-500 uppercase tracking-wide">
                  <th className="py-2 pr-2 w-8" />
                  <th className="py-2 px-2 font-medium text-left">Step</th>
                  <th className="py-2 px-2 font-medium text-left">Type</th>
                  <th className="py-2 px-2 font-medium text-left">Follows</th>
                  <th className="py-2 px-2 font-medium text-left">Line</th>
                  <th className="py-2 px-2 font-medium text-left">Action Label</th>
                  <th className="py-2 px-2 font-medium text-left">Outcomes</th>
                  <th className="py-2 px-2 font-medium text-left">Primary</th>
                  <th className="py-2 px-2 font-medium text-left">Secondary</th>
                  <th className="py-2 px-2 font-medium text-left">Notify</th>
                  <th className="py-2 pl-2 w-20" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400 border-t border-gray-100 pt-2">
            <span>Click name to rename</span>
            <span>Click type badge to toggle FG/BG</span>
            <span>
              <svg
                className="w-2.5 h-2.5 text-teal-600 inline"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>{" "}
              = Primary
            </span>
            <span>Right-click chip = set primary</span>
            <span>Expand row for full details</span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DateInput } from "@/app/components/ui/DateInput";
import type { OrbitTask } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCreateTask,
  useOrbitDeleteTask,
  useOrbitTasks,
  useOrbitUpdateTask,
} from "@/app/lib/query/hooks";

export default function RecruiterTasksPage() {
  const { data: tasks = [], isLoading, isError } = useOrbitTasks();
  const createMutation = useOrbitCreateTask();
  const updateMutation = useOrbitUpdateTask();
  const deleteMutation = useOrbitDeleteTask();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const addTask = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      showToast("Give the task a title.", "error");
      return;
    }
    try {
      await createMutation.mutateAsync({ title: trimmed, dueDate: dueDate || null });
      setTitle("");
      setDueDate("");
    } catch {
      showToast("Could not add the task. Please try again.", "error");
    }
  };

  const toggleDone = async (task: OrbitTask) => {
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        data: { title: task.title, done: !task.done },
      });
    } catch {
      showToast("Could not update the task. Please try again.", "error");
    }
  };

  const removeTask = async (task: OrbitTask) => {
    const confirmed = await confirm({
      title: "Delete this task?",
      message: `"${task.title}" will be removed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(task.id);
    } catch {
      showToast("Could not delete the task. Please try again.", "error");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A1B3D] dark:text-white">Tasks</h1>
        <p className="mt-1 text-gray-600 dark:text-[#c0c0eb]">
          Your follow-ups and reminders. Items due today appear on your dashboard.
        </p>
      </div>

      <div className="rounded-2xl border border-[#c0c0eb] bg-white dark:bg-white/5 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addTask();
            }}
            placeholder="e.g. Follow up with Anglo on the boilermaker shortlist"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <DateInput value={dueDate} onChange={setDueDate} ariaLabel="Due date" />
          <button
            type="button"
            onClick={addTask}
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-[#323288] text-white text-sm font-medium rounded-lg hover:bg-[#252560] disabled:opacity-50 whitespace-nowrap"
          >
            Add task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#323288]" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Something went wrong loading your tasks — please try again.
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c0c0eb] bg-white/60 dark:bg-white/5 p-10 text-center text-gray-600 dark:text-[#c0c0eb]">
          No tasks yet. Add your first follow-up above.
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2.5"
            >
              <label className="flex items-center gap-3 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleDone(task)}
                  className="rounded border-gray-300"
                />
                <span className="min-w-0">
                  <span
                    className={`block text-sm truncate ${task.done ? "line-through text-gray-400" : "text-[#252560] dark:text-white"}`}
                  >
                    {task.title}
                  </span>
                  {task.dueDate ? (
                    <span className="block text-xs text-gray-500">
                      Due {task.dueDate.slice(0, 10)}
                    </span>
                  ) : null}
                </span>
              </label>
              <button
                type="button"
                onClick={() => removeTask(task)}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {ConfirmDialog}
    </div>
  );
}

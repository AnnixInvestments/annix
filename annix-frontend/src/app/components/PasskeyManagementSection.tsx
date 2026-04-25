"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { formatDate } from "@/app/lib/datetime";
import { isPasskeySupported } from "@/app/lib/passkey";
import {
  useDeletePasskey,
  usePasskeys,
  useRegisterPasskey,
  useRenamePasskey,
} from "@/app/lib/query/hooks";

interface PasskeyManagementSectionProps {
  authHeaders?: Record<string, string>;
  title?: string;
}

export function PasskeyManagementSection(props: PasskeyManagementSectionProps) {
  const { authHeaders, title = "Passkeys" } = props;

  const supported = isPasskeySupported();
  const passkeys = usePasskeys({ authHeaders, enabled: supported });
  const register = useRegisterPasskey({ authHeaders });
  const rename = useRenamePasskey({ authHeaders });
  const remove = useDeletePasskey({ authHeaders });

  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);

  const handleAdd = async () => {
    setError(null);
    const deviceName = window.prompt("Optional: name this passkey (e.g. 'MacBook Touch ID')", "");
    if (deviceName === null) return;

    try {
      await register.mutateAsync(deviceName.trim() || null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not add passkey";
      setError(message);
    }
  };

  const handleRename = async (id: number) => {
    if (!renamingValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await rename.mutateAsync({ id, deviceName: renamingValue });
      setRenamingId(null);
      setRenamingValue("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not rename passkey";
      setError(message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      setConfirmingDelete(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not remove passkey";
      setError(message);
      setConfirmingDelete(null);
    }
  };

  if (!supported) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">
          This browser does not support passkeys. Try a modern Chrome, Edge, Safari, or Firefox on a
          device with biometrics or a security key.
        </p>
      </section>
    );
  }

  const data = passkeys.data;
  const list = data || [];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">
            Sign in with Face ID, Touch ID, Windows Hello, or a hardware key instead of your
            password.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={register.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400"
        >
          {register.isPending ? "Adding..." : "Add passkey"}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4">
        {passkeys.isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">
            No passkeys yet. Add one to sign in without your password.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {list.map((p) => {
              const renaming = renamingId === p.id;
              const name = p.deviceName;
              const display = name || "Unnamed passkey";
              return (
                <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {renaming ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={renamingValue}
                          onChange={(e) => setRenamingValue(e.target.value)}
                          className="flex-1 rounded border-gray-300 text-sm"
                          maxLength={120}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(p.id)}
                          className="px-3 py-1 text-sm font-medium text-white bg-teal-600 rounded hover:bg-teal-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(null);
                            setRenamingValue("");
                          }}
                          className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900 truncate">{display}</p>
                        <p className="text-xs text-gray-500">
                          Added {formatDate(p.createdAt)}
                          {p.lastUsedAt ? ` · Last used ${formatDate(p.lastUsedAt)}` : ""}
                          {p.backupState ? " · Synced" : " · Device-bound"}
                        </p>
                      </>
                    )}
                  </div>

                  {!renaming && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const currentName = p.deviceName;
                          setRenamingId(p.id);
                          setRenamingValue(currentName || "");
                        }}
                        className="text-sm text-teal-700 hover:text-teal-900"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(p.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirmingDelete !== null && (
        <ConfirmDeleteModal
          onConfirm={() => handleDelete(confirmingDelete)}
          onCancel={() => setConfirmingDelete(null)}
          isPending={remove.isPending}
        />
      )}
    </section>
  );
}

function ConfirmDeleteModal(props: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { onConfirm, onCancel, isPending } = props;

  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900">Remove this passkey?</h3>
        <p className="mt-2 text-sm text-gray-600">
          You will no longer be able to sign in with this passkey. If it is your only sign-in
          method, you will need a password to log in afterwards.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            {isPending ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useOrbitPortalAdapters } from "@/app/lib/query/hooks";

interface ChannelPickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

// Baseline channels (free careers page + Google for Jobs + jobs feed) always
// run for a live job; the picker only chooses EXTRA channels to add on top.
export function ChannelPicker({ value, onChange, disabled }: ChannelPickerProps) {
  const { data: channels, isLoading } = useOrbitPortalAdapters();

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading channels…</p>;
  }

  const available = (channels ?? []).filter((channel) => channel.available);
  const alwaysOn = available.filter(
    (channel) => channel.costTier === "free" && channel.postingMode !== "assisted",
  );
  const optional = available.filter(
    (channel) => !(channel.costTier === "free" && channel.postingMode !== "assisted"),
  );

  const toggle = (code: string) => {
    const set = new Set(value);
    if (set.has(code)) {
      set.delete(code);
    } else {
      set.add(code);
    }
    onChange(Array.from(set));
  };

  return (
    <div className="rounded-lg border border-[#252560]/20 bg-white p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#1a1a40]">Where to distribute</p>
        <p className="text-xs text-gray-500">
          Your careers page, Google for Jobs and the Orbit jobs feed are always included for free.
          Add extra channels below.
        </p>
      </div>

      {alwaysOn.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {alwaysOn.map((channel) => (
            <span
              key={channel.code}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
            >
              ✓ {channel.displayName}
            </span>
          ))}
        </div>
      ) : null}

      {optional.length > 0 ? (
        <div className="space-y-1.5">
          {optional.map((channel) => {
            const checked = value.includes(channel.code);
            const isPaid = channel.costTier === "paid";
            return (
              <label
                key={channel.code}
                className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(channel.code)}
                />
                <span>{channel.displayName}</span>
                <span className="text-xs text-gray-400">
                  {channel.postingMode === "assisted" ? "manual" : "automated"}
                  {isPaid ? " · paid" : ""}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No extra channels are available yet.</p>
      )}
    </div>
  );
}

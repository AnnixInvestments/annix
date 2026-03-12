"use client";

import { CheckCircle, ExternalLink, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Tab = "leave" | "hours" | "contracts";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "leave", label: "Leave Entitlements" },
  { key: "hours", label: "Working Hours" },
  { key: "contracts", label: "Contracts" },
];

const LEAVE_TYPES = [
  {
    type: "Annual Leave",
    entitlement: "21 consecutive days",
    notes: "Per annual leave cycle (12 months of employment)",
  },
  {
    type: "Sick Leave",
    entitlement: "30 days",
    notes: "Per 3-year cycle. First 6 months: 1 day per 26 worked",
  },
  {
    type: "Family Responsibility",
    entitlement: "3 days per year",
    notes: "Birth, illness, or death of close family member",
  },
  {
    type: "Maternity Leave",
    entitlement: "4 consecutive months",
    notes: "May start 4 weeks before expected due date",
  },
  {
    type: "Paternity Leave",
    entitlement: "10 days",
    notes: "After birth of employee's child",
  },
];

function LeaveTab() {
  const [startDate, setStartDate] = useState("");
  const [daysTaken, setDaysTaken] = useState("");

  const daysRemaining = startDate && daysTaken ? Math.max(0, 21 - Number(daysTaken)) : null;

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Leave Type
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">
                Entitlement
              </th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {LEAVE_TYPES.map((leave) => (
              <tr key={leave.type} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-sm text-white font-medium">{leave.type}</td>
                <td className="px-4 py-3 text-sm text-teal-400 font-semibold">
                  {leave.entitlement}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 hidden sm:table-cell">
                  {leave.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Annual Leave Balance Calculator</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Employment Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Days Taken This Cycle
            </label>
            <input
              type="number"
              value={daysTaken}
              onChange={(e) => setDaysTaken(e.target.value)}
              min={0}
              max={21}
              placeholder="0"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Days Remaining
            </label>
            <div className="h-[38px] flex items-center">
              {daysRemaining !== null ? (
                <span
                  className={`text-2xl font-bold ${
                    daysRemaining > 5
                      ? "text-green-400"
                      : daysRemaining > 0
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {daysRemaining}
                </span>
              ) : (
                <span className="text-sm text-slate-500">Enter details above</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkingHoursTab() {
  const [weeklyHours, setWeeklyHours] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");

  const hasInput = weeklyHours || overtimeHours;
  const weeklyNum = Number(weeklyHours) || 0;
  const overtimeNum = Number(overtimeHours) || 0;
  const weeklyCompliant = weeklyNum <= 45;
  const overtimeCompliant = overtimeNum <= 10;
  const allCompliant = weeklyCompliant && overtimeCompliant;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Ordinary Weekly Hours
          </label>
          <input
            type="number"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
            placeholder="e.g. 40"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Weekly Overtime Hours
          </label>
          <input
            type="number"
            value={overtimeHours}
            onChange={(e) => setOvertimeHours(e.target.value)}
            placeholder="e.g. 5"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {hasInput && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            {allCompliant ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400">
                <CheckCircle className="h-4 w-4" />
                Compliant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400">
                <XCircle className="h-4 w-4" />
                Non-Compliant
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-700/50">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400">Max Ordinary Hours</span>
              <span
                className={`text-sm font-medium ${weeklyCompliant ? "text-green-400" : "text-red-400"}`}
              >
                {weeklyNum}/45 hours per week
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400">Max Overtime</span>
              <span
                className={`text-sm font-medium ${overtimeCompliant ? "text-green-400" : "text-red-400"}`}
              >
                {overtimeNum}/10 hours per week
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400">Overtime Rate</span>
              <span className="text-sm font-medium text-teal-400">1.5x normal hourly rate</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400">Sunday/Public Holiday Rate</span>
              <span className="text-sm font-medium text-teal-400">2x normal hourly rate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Generate employment contracts using our document templates. Select from permanent or
        fixed-term contract templates.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/comply-sa/templates"
          className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-teal-500/50 transition-all group"
        >
          <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors flex items-center gap-2">
            Permanent Employment Contract
            <ExternalLink className="h-4 w-4" />
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Standard permanent employment contract compliant with the BCEA and LRA
          </p>
        </Link>

        <Link
          href="/comply-sa/templates"
          className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-teal-500/50 transition-all group"
        >
          <h3 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors flex items-center gap-2">
            Fixed-Term Employment Contract
            <ExternalLink className="h-4 w-4" />
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Fixed-term contract with automatic termination date and renewal provisions
          </p>
        </Link>
      </div>
    </div>
  );
}

const TAB_COMPONENTS: Record<Tab, React.FC> = {
  leave: LeaveTab,
  hours: WorkingHoursTab,
  contracts: ContractsTab,
};

export default function HrToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("leave");
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Users className="h-7 w-7 text-teal-400" />
          HR Tools
        </h1>
        <p className="text-slate-400 mt-1">Labour law reference tools and calculators</p>
      </div>

      <div className="border-b border-slate-700">
        <div className="flex overflow-x-auto -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}

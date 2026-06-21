"use client";

import {
  RUBBER_BONDING_AGENT_NOTES,
  RUBBER_BONDING_SELECTOR_GUIDE,
} from "@annix/product-data/rubber";
import { useState } from "react";

const TH_CLASS =
  "px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap";
const TD_CLASS = "px-3 py-2 text-sm text-gray-700 align-top";

export function BondingSelectorGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bonding selector guide</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Which adhesive system to use for each rubber type and cure state (Impilo HeroBond /
            HeroPrime).
          </p>
        </div>
        <span className="text-gray-400 text-sm">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6">
          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={TH_CLASS}>Rubber</th>
                  <th className={TH_CLASS}>Recommended products</th>
                  <th className={TH_CLASS}>Spread rate</th>
                  <th className={TH_CLASS}>Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {RUBBER_BONDING_SELECTOR_GUIDE.map((row) => (
                  <tr key={`${row.group}-${row.rubber}`} className="hover:bg-gray-50">
                    <td className={TD_CLASS}>
                      <div className="text-xs text-gray-400">{row.group}</div>
                      <div className="font-medium text-gray-900">{row.rubber}</div>
                    </td>
                    <td className={TD_CLASS}>
                      <ul className="list-disc list-inside space-y-0.5">
                        {row.products.map((product) => (
                          <li key={product}>{product}</li>
                        ))}
                      </ul>
                    </td>
                    <td className={`${TD_CLASS} text-gray-500`}>{row.spreadRate}</td>
                    <td className={`${TD_CLASS} text-gray-500`}>{row.application}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Adhesive notes</h3>
            <dl className="space-y-2">
              {RUBBER_BONDING_AGENT_NOTES.map((note) => (
                <div key={note.product} className="text-sm">
                  <dt className="font-medium text-gray-900">{note.product}</dt>
                  <dd className="text-gray-500">{note.notes}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

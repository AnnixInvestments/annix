"use client";

import type { RubricCriterion } from "@annix/product-data/teacher-assistant";

interface RubricTableProps {
  rubric: RubricCriterion[];
}

export function RubricTable(props: RubricTableProps) {
  const { rubric } = props;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-amber-50">
            <th className="text-left px-3 py-2 border border-amber-200 font-semibold text-amber-900">
              Criterion
            </th>
            <th className="text-left px-3 py-2 border border-amber-200 font-semibold text-amber-900">
              Excellent
            </th>
            <th className="text-left px-3 py-2 border border-amber-200 font-semibold text-amber-900">
              Good
            </th>
            <th className="text-left px-3 py-2 border border-amber-200 font-semibold text-amber-900">
              Satisfactory
            </th>
            <th className="text-left px-3 py-2 border border-amber-200 font-semibold text-amber-900">
              Needs Work
            </th>
          </tr>
        </thead>
        <tbody>
          {rubric.map((row) => (
            <tr key={row.criterion} className="hover:bg-gray-50">
              <td className="px-3 py-2 border border-gray-200 font-medium align-top">
                {row.criterion}
              </td>
              <td className="px-3 py-2 border border-gray-200 align-top text-gray-700">
                {row.excellent}
              </td>
              <td className="px-3 py-2 border border-gray-200 align-top text-gray-700">
                {row.good}
              </td>
              <td className="px-3 py-2 border border-gray-200 align-top text-gray-700">
                {row.satisfactory}
              </td>
              <td className="px-3 py-2 border border-gray-200 align-top text-gray-700">
                {row.needsWork}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

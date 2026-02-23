"use client";

import { statusColor } from "@annix/product-data/rubber/orderStatus";
import Link from "next/link";
import { memo, useCallback } from "react";
import type { RubberOrderDto } from "@/app/lib/api/rubberPortalApi";
import { formatDateZA } from "@/app/lib/datetime";

interface OrderRowProps {
  order: RubberOrderDto;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
}

function OrderRowComponent({ order, isSelected, onToggleSelect, onDelete }: OrderRowProps) {
  const handleToggleSelect = useCallback(() => {
    onToggleSelect(order.id);
  }, [onToggleSelect, order.id]);

  const handleDelete = useCallback(() => {
    onDelete(order.id);
  }, [onDelete, order.id]);

  return (
    <tr className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggleSelect}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Link
          href={`/admin/portal/rubber/orders/${order.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {order.orderNumber}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {order.companyOrderNumber || "-"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {order.companyName || "N/A"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}
        >
          {order.statusLabel}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.items.length}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateZA(order.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button onClick={handleDelete} className="text-red-600 hover:text-red-900 ml-4">
          Delete
        </button>
      </td>
    </tr>
  );
}

export const OrderRow = memo(OrderRowComponent);

"use client";

import Link from "next/link";
import { memo } from "react";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import type { CustomerAccountStatus } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";

interface CustomerData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  accountStatus: CustomerAccountStatus;
  deviceBound: boolean;
  createdAt: string;
}

interface CustomerRowProps {
  customer: CustomerData;
}

function CustomerRowComponent({ customer }: CustomerRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {customer.firstName} {customer.lastName}
          </div>
          <div className="text-sm text-gray-500">{customer.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900">{customer.companyName}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={customer.accountStatus} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {customer.deviceBound ? (
          <span className="inline-flex items-center text-green-600">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Bound
          </span>
        ) : (
          <span className="inline-flex items-center text-gray-400">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Not Bound
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDateZA(customer.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="text-blue-600 hover:text-blue-900"
        >
          View Details
        </Link>
      </td>
    </tr>
  );
}

export const CustomerRow = memo(CustomerRowComponent);

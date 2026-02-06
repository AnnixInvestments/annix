/**
 * Calloff Status Workflow
 *
 * A "calloff" represents a partial delivery request from a larger order.
 * Orders can have multiple calloffs, allowing customers to receive goods
 * in batches rather than all at once.
 *
 * Status Workflow:
 * ┌─────────────┐
 * │  REQUESTED  │  Customer requests delivery of a quantity
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │  APPROVED   │  Admin approves the calloff request
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌──────────────────┐
 * │  IN_PRODUCTION   │  Goods are being manufactured/prepared
 * └────────┬─────────┘
 *          │
 *          ▼
 * ┌─────────────┐
 * │ DISPATCHED  │  Goods have left the warehouse
 * └──────┬──────┘
 *        │
 *        ▼
 * ┌─────────────┐
 * │  DELIVERED  │  Customer has received the goods (terminal state)
 * └─────────────┘
 *
 * ┌─────────────┐
 * │  CANCELLED  │  Calloff was cancelled (can occur from any non-terminal state)
 * └─────────────┘
 *
 * Status Meanings:
 * - REQUESTED (1): Initial state when customer requests a calloff delivery
 * - APPROVED (2): Admin has verified and approved the calloff for processing
 * - IN_PRODUCTION (3): The rubber sheets are being manufactured or cut
 * - DISPATCHED (4): Goods have been shipped/dispatched from warehouse
 * - DELIVERED (5): Customer has received and acknowledged delivery (terminal)
 * - CANCELLED (6): Calloff was cancelled before completion (terminal)
 */
export const CALLOFF_STATUS = {
  REQUESTED: 1,
  APPROVED: 2,
  IN_PRODUCTION: 3,
  DISPATCHED: 4,
  DELIVERED: 5,
  CANCELLED: 6,
} as const;

export type CalloffStatus = (typeof CALLOFF_STATUS)[keyof typeof CALLOFF_STATUS];

export const CALLOFF_STATUS_LABELS: Record<CalloffStatus, string> = {
  [CALLOFF_STATUS.REQUESTED]: 'Requested',
  [CALLOFF_STATUS.APPROVED]: 'Approved',
  [CALLOFF_STATUS.IN_PRODUCTION]: 'In Production',
  [CALLOFF_STATUS.DISPATCHED]: 'Dispatched',
  [CALLOFF_STATUS.DELIVERED]: 'Delivered',
  [CALLOFF_STATUS.CANCELLED]: 'Cancelled',
};

export const CALLOFF_STATUS_COLORS: Record<CalloffStatus, string> = {
  [CALLOFF_STATUS.REQUESTED]: 'bg-yellow-100 text-yellow-800',
  [CALLOFF_STATUS.APPROVED]: 'bg-blue-100 text-blue-800',
  [CALLOFF_STATUS.IN_PRODUCTION]: 'bg-indigo-100 text-indigo-800',
  [CALLOFF_STATUS.DISPATCHED]: 'bg-purple-100 text-purple-800',
  [CALLOFF_STATUS.DELIVERED]: 'bg-green-100 text-green-800',
  [CALLOFF_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
};

export const CALLOFF_STATUS_VALUES = Object.values(CALLOFF_STATUS) as readonly CalloffStatus[];

export const isValidCalloffStatus = (status: number): status is CalloffStatus => {
  return CALLOFF_STATUS_VALUES.includes(status as CalloffStatus);
};

export const calloffStatusLabel = (status: number): string => {
  if (isValidCalloffStatus(status)) {
    return CALLOFF_STATUS_LABELS[status];
  }
  return 'Unknown';
};

export const calloffStatusColor = (status: number): string => {
  if (isValidCalloffStatus(status)) {
    return CALLOFF_STATUS_COLORS[status];
  }
  return 'bg-gray-100 text-gray-800';
};

export const CALLOFF_STATUS_OPTIONS = CALLOFF_STATUS_VALUES.map((value) => ({
  value,
  label: CALLOFF_STATUS_LABELS[value],
}));

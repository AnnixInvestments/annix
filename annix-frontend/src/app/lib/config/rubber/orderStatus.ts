export const RUBBER_ORDER_STATUS = {
  NEW: -1,
  DRAFT: 0,
  CANCELLED: 1,
  PARTIALLY_SUBMITTED: 2,
  SUBMITTED: 3,
  MANUFACTURING: 4,
  DELIVERING: 5,
  COMPLETE: 6,
} as const;

export type RubberOrderStatus = (typeof RUBBER_ORDER_STATUS)[keyof typeof RUBBER_ORDER_STATUS];

export const STATUS_LABELS: Record<RubberOrderStatus, string> = {
  [RUBBER_ORDER_STATUS.NEW]: 'New',
  [RUBBER_ORDER_STATUS.DRAFT]: 'Draft',
  [RUBBER_ORDER_STATUS.CANCELLED]: 'Cancelled',
  [RUBBER_ORDER_STATUS.PARTIALLY_SUBMITTED]: 'Partially Submitted',
  [RUBBER_ORDER_STATUS.SUBMITTED]: 'Submitted',
  [RUBBER_ORDER_STATUS.MANUFACTURING]: 'Manufacturing',
  [RUBBER_ORDER_STATUS.DELIVERING]: 'Delivering',
  [RUBBER_ORDER_STATUS.COMPLETE]: 'Complete',
};

export const STATUS_COLORS: Record<RubberOrderStatus, string> = {
  [RUBBER_ORDER_STATUS.NEW]: 'bg-gray-100 text-gray-800',
  [RUBBER_ORDER_STATUS.DRAFT]: 'bg-yellow-100 text-yellow-800',
  [RUBBER_ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
  [RUBBER_ORDER_STATUS.PARTIALLY_SUBMITTED]: 'bg-orange-100 text-orange-800',
  [RUBBER_ORDER_STATUS.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [RUBBER_ORDER_STATUS.MANUFACTURING]: 'bg-indigo-100 text-indigo-800',
  [RUBBER_ORDER_STATUS.DELIVERING]: 'bg-purple-100 text-purple-800',
  [RUBBER_ORDER_STATUS.COMPLETE]: 'bg-green-100 text-green-800',
};

export const statusLabel = (status: number): string => {
  return STATUS_LABELS[status as RubberOrderStatus] ?? 'Unknown';
};

export const statusColor = (status: number): string => {
  return STATUS_COLORS[status as RubberOrderStatus] ?? 'bg-gray-100 text-gray-800';
};

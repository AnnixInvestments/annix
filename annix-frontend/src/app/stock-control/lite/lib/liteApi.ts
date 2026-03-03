const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json" };
  }
  const token = localStorage.getItem("stock_control_token");
  if (token) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }
  return { "Content-Type": "application/json" };
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers ? options.headers : {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }
  return response.json();
}

export interface LiteStockItem {
  id: number;
  stockNumber: string;
  description: string;
  categoryName: string;
  currentQuantity: number;
  unit: string;
}

export interface LiteStaffMember {
  id: number;
  name: string;
  role: string;
}

export interface LiteJobCard {
  id: number;
  jobNumber: string;
  customerName: string;
  description: string;
}

export interface LiteDelivery {
  id: number;
  deliveryNoteNumber: string;
  supplierName: string;
  receivedAt: string;
}

export const liteApi = {
  async stockItems(): Promise<LiteStockItem[]> {
    const data = await fetchJson<{ items: LiteStockItem[] }>(
      `${API_BASE}/stock-control/stock-items?limit=1000`,
    );
    return data.items;
  },

  async staffMembers(): Promise<LiteStaffMember[]> {
    return fetchJson<LiteStaffMember[]>(`${API_BASE}/stock-control/staff`);
  },

  async activeJobCards(): Promise<LiteJobCard[]> {
    const data = await fetchJson<{ jobCards: LiteJobCard[] }>(
      `${API_BASE}/stock-control/job-cards?status=active&limit=500`,
    );
    return data.jobCards;
  },

  async pendingDeliveries(): Promise<LiteDelivery[]> {
    const data = await fetchJson<{ deliveries: LiteDelivery[] }>(
      `${API_BASE}/stock-control/deliveries?status=pending&limit=100`,
    );
    return data.deliveries;
  },

  async issueStock(payload: {
    issuerId: number;
    recipientId: number;
    jobCardId: number;
    items: Array<{ stockItemId: number; quantity: number }>;
  }): Promise<{ success: boolean; message: string }> {
    return fetchJson(`${API_BASE}/stock-control/batch-issuance`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async confirmDelivery(
    deliveryId: number,
    payload: {
      receivedById: number;
      items: Array<{ stockItemId: number; quantityReceived: number }>;
    },
  ): Promise<{ success: boolean; message: string }> {
    return fetchJson(`${API_BASE}/stock-control/deliveries/${deliveryId}/receive`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

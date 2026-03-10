export const WORK_ITEM_PROVIDER = Symbol("WORK_ITEM_PROVIDER");

export interface WorkItemLineItem {
  itemCode: string;
  description: string;
  jtNumber: string | null;
  quantity: number;
}

export interface IWorkItemProvider {
  lineItemsForWorkItem(companyId: number, workItemId: number): Promise<WorkItemLineItem[]>;
}

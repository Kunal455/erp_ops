export type Role = 'ADMIN' | 'OPERATIONS' | 'SALES';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  locationId?: string | null;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  address?: string | null;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  description?: string | null;
}

export interface InventoryRecord {
  id: string;
  itemId: string;
  item: Item;
  locationId: string;
  location: Location;
  batchNumber: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  updatedAt: string;
}

export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  locationId: string;
  location: Location;
  itemId: string;
  item: Item;
  requiredQuantity: number;
  assignedUserId?: string | null;
  assignedUser?: User | null;
  status: WorkOrderStatus;
  notes?: string | null;
  createdAt: string;
  availableStock?: number;
  shortage?: number;
  hasShortage?: boolean;
  stockCheck?: {
    availableQuantity: number;
    shortageQuantity: number;
    hasShortage: boolean;
    bomAnalysis?: Array<{
      componentItemId: string;
      componentName: string;
      componentSku: string;
      uom: string;
      quantityPerUnit: number;
      requiredQuantity: number;
      availableQuantity: number;
      shortageQuantity: number;
      hasShortage: boolean;
    }>;
  };
}

export type TransferStatus = 'REQUESTED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  sourceLocation: Location;
  destinationLocationId: string;
  destinationLocation: Location;
  itemId: string;
  item: Item;
  batchNumber: string;
  quantity: number;
  status: TransferStatus;
  createdById?: string;
  createdBy?: User;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
}

export type OrderStatus = 'DRAFT' | 'RESERVED' | 'FULFILLED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  itemId: string;
  item: Item;
  batchNumber?: string | null;
  quantity: number;
  reservedQuantity: number;
  unitPrice: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  locationId: string;
  location: Location;
  status: OrderStatus;
  totalAmount: number;
  createdById?: string;
  createdBy?: User;
  items: OrderItem[];
  createdAt: string;
}

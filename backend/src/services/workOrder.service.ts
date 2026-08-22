import { prisma } from '../config';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface CreateWorkOrderDto {
  locationId: string;
  itemId: string;
  requiredQuantity: number;
  assignedUserId?: string;
  notes?: string;
  materials?: Array<{
    materialItemId: string;
    requiredQuantity: number;
  }>;
}

export class WorkOrderService {
  /**
   * Calculate stock shortage for an item/materials at a specific location.
   */
  static async calculateMaterialStockCheck(locationId: string, itemId: string, requiredQuantity: number) {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        bomParents: {
          include: { componentItem: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundError(`Item with ID ${itemId} not found`);
    }

    // Check direct available stock of the target item at the location
    const directInventories = await prisma.inventory.findMany({
      where: { locationId, itemId },
    });

    const totalPhysical = directInventories.reduce((acc, inv) => acc + Number(inv.physicalQuantity), 0);
    const totalReserved = directInventories.reduce((acc, inv) => acc + Number(inv.reservedQuantity), 0);
    const totalAvailable = Math.max(0, totalPhysical - totalReserved);
    const directShortage = Math.max(0, requiredQuantity - totalAvailable);

    // If item has BOM components (e.g. manufacturing / assembly)
    const bomAnalysis = [];
    if (item.bomParents && item.bomParents.length > 0) {
      for (const bom of item.bomParents) {
        const componentNeeded = requiredQuantity * bom.quantityPerUnit;
        const compInventories = await prisma.inventory.findMany({
          where: { locationId, itemId: bom.componentItemId },
        });

        const compPhysical = compInventories.reduce((acc, inv) => acc + Number(inv.physicalQuantity), 0);
        const compReserved = compInventories.reduce((acc, inv) => acc + Number(inv.reservedQuantity), 0);
        const compAvailable = Math.max(0, compPhysical - compReserved);
        const compShortage = Math.max(0, componentNeeded - compAvailable);

        // Find surplus stock in other locations for this component
        const otherLocationStock = await prisma.inventory.findMany({
          where: {
            itemId: bom.componentItemId,
            locationId: { not: locationId },
          },
          include: { location: true },
        });

        const surplusLocations = otherLocationStock
          .map((inv) => ({
            locationId: inv.locationId,
            locationName: inv.location.name,
            batchNumber: inv.batchNumber,
            availableQuantity: Math.max(0, Number(inv.physicalQuantity) - Number(inv.reservedQuantity)),
          }))
          .filter((loc) => loc.availableQuantity > 0);

        bomAnalysis.push({
          componentItemId: bom.componentItemId,
          componentName: bom.componentItem.name,
          componentSku: bom.componentItem.sku,
          uom: bom.componentItem.uom,
          quantityPerUnit: bom.quantityPerUnit,
          requiredQuantity: componentNeeded,
          availableQuantity: compAvailable,
          shortageQuantity: compShortage,
          hasShortage: compShortage > 0,
          surplusLocations,
        });
      }
    }

    // Surplus locations for the primary item
    const otherLocations = await prisma.inventory.findMany({
      where: {
        itemId,
        locationId: { not: locationId },
      },
      include: { location: true },
    });

    const surplusLocationsForItem = otherLocations
      .map((inv) => ({
        locationId: inv.locationId,
        locationName: inv.location.name,
        locationCode: inv.location.code,
        batchNumber: inv.batchNumber,
        availableQuantity: Math.max(0, Number(inv.physicalQuantity) - Number(inv.reservedQuantity)),
      }))
      .filter((loc) => loc.availableQuantity > 0);

    return {
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      locationId,
      requiredQuantity,
      availableQuantity: totalAvailable,
      shortageQuantity: directShortage,
      hasShortage: directShortage > 0 || bomAnalysis.some((b) => b.hasShortage),
      bomAnalysis,
      surplusLocations: surplusLocationsForItem,
    };
  }

  /**
   * Create a new Work Order (Admin).
   */
  static async createWorkOrder(dto: CreateWorkOrderDto) {
    if (dto.requiredQuantity <= 0) {
      throw new BadRequestError('Required quantity must be greater than zero');
    }

    const item = await prisma.item.findUnique({
      where: { id: dto.itemId },
      include: { bomParents: true },
    });
    if (!item) throw new NotFoundError(`Item with ID ${dto.itemId} not found`);

    const location = await prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!location) throw new NotFoundError(`Location with ID ${dto.locationId} not found`);

    if (dto.assignedUserId) {
      const user = await prisma.user.findUnique({ where: { id: dto.assignedUserId } });
      if (!user) throw new NotFoundError(`User with ID ${dto.assignedUserId} not found`);
    }

    // Generate work order number: WO-YYYYMMDD-XXXX
    const count = await prisma.workOrder.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const workOrderNumber = `WO-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

    // Material requirements list
    let materialsToCreate: Array<{ materialItemId: string; requiredQuantity: number }> = [];

    if (dto.materials && dto.materials.length > 0) {
      materialsToCreate = dto.materials;
    } else if (item.bomParents && item.bomParents.length > 0) {
      materialsToCreate = item.bomParents.map((bom) => ({
        materialItemId: bom.componentItemId,
        requiredQuantity: dto.requiredQuantity * bom.quantityPerUnit,
      }));
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        locationId: dto.locationId,
        itemId: dto.itemId,
        requiredQuantity: dto.requiredQuantity,
        assignedUserId: dto.assignedUserId || null,
        notes: dto.notes || null,
        status: 'ASSIGNED',
        materials: {
          create: materialsToCreate,
        },
      },
      include: {
        item: true,
        location: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        materials: { include: { materialItem: true } },
      },
    });

    const stockCheck = await this.calculateMaterialStockCheck(
      workOrder.locationId,
      workOrder.itemId,
      workOrder.requiredQuantity
    );

    return {
      ...workOrder,
      availableStock: stockCheck.availableQuantity,
      shortage: stockCheck.shortageQuantity,
      hasShortage: stockCheck.hasShortage,
      stockCheck,
    };
  }

  /**
   * List all Work Orders with shortage info.
   */
  static async listWorkOrders(filters?: { locationId?: string; status?: string }) {
    const where: any = {};
    if (filters?.locationId) where.locationId = filters.locationId;
    if (filters?.status) where.status = filters.status.toUpperCase();

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        item: true,
        location: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        materials: { include: { materialItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach real-time stock check to each work order
    const results = await Promise.all(
      workOrders.map(async (wo) => {
        const stockCheck = await this.calculateMaterialStockCheck(
          wo.locationId,
          wo.itemId,
          wo.requiredQuantity
        );
        return {
          ...wo,
          availableStock: stockCheck.availableQuantity,
          shortage: stockCheck.shortageQuantity,
          hasShortage: stockCheck.hasShortage,
          stockCheck,
        };
      })
    );

    return results;
  }

  /**
   * Get single Work Order by ID.
   */
  static async getWorkOrderById(id: string) {
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        item: true,
        location: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        materials: { include: { materialItem: true } },
      },
    });

    if (!wo) throw new NotFoundError(`Work Order with ID ${id} not found`);

    const stockCheck = await this.calculateMaterialStockCheck(
      wo.locationId,
      wo.itemId,
      wo.requiredQuantity
    );

    return {
      ...wo,
      availableStock: stockCheck.availableQuantity,
      shortage: stockCheck.shortageQuantity,
      hasShortage: stockCheck.hasShortage,
      stockCheck,
    };
  }

  /**
   * Update Work Order Status with strict valid transition flow:
   * ASSIGNED -> IN_PROGRESS -> COMPLETED
   */
  static async updateStatus(id: string, status: string, userId?: string) {
    const normalized = status.toUpperCase();
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new NotFoundError(`Work Order with ID ${id} not found`);

    const validTransitions: Record<string, string[]> = {
      ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowedNext = validTransitions[wo.status] || [];
    if (!allowedNext.includes(normalized)) {
      throw new BadRequestError(
        `Invalid status transition from '${wo.status}' to '${normalized}'. Allowed next statuses: [${allowedNext.join(', ')}]`
      );
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data: { status: normalized },
      include: {
        item: true,
        location: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        materials: { include: { materialItem: true } },
      },
    });

    return updated;
  }
}

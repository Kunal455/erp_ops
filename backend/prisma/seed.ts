import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Mini Operations ERP...');

  // Clean existing records in reverse dependency order
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.customerOrderItem.deleteMany({});
  await prisma.customerOrder.deleteMany({});
  await prisma.stockTransfer.deleteMany({});
  await prisma.workOrderMaterial.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.billOfMaterial.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.location.deleteMany({});

  console.log('🧹 Cleared existing database tables.');

  // 1. Seed Locations
  const locNorth = await prisma.location.create({
    data: {
      code: 'WH-NORTH',
      name: 'Warehouse North (Main Depot)',
      address: '100 Industrial Parkway, North Sector',
    },
  });

  const locSouth = await prisma.location.create({
    data: {
      code: 'PLANT-SOUTH',
      name: 'Plant South (Assembly Facility)',
      address: '45 Manufacturing Drive, South Sector',
    },
  });

  const locCentral = await prisma.location.create({
    data: {
      code: 'HUB-CENTRAL',
      name: 'Central Logistics Hub',
      address: '88 Commerce Boulevard, Central Zone',
    },
  });

  console.log('📍 Seeded Locations:', locNorth.name, locSouth.name, locCentral.name);

  // 2. Seed Users with hashed passwords
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashOps = await bcrypt.hash('ops123', 10);
  const passwordHashSales = await bcrypt.hash('sales123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@fundsroom.com',
      name: 'Alice Admin',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
      locationId: locNorth.id,
    },
  });

  const opsUser = await prisma.user.create({
    data: {
      email: 'ops@fundsroom.com',
      name: 'Bob Operations',
      passwordHash: passwordHashOps,
      role: 'OPERATIONS',
      locationId: locSouth.id,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      email: 'sales@fundsroom.com',
      name: 'Charlie Sales',
      passwordHash: passwordHashSales,
      role: 'SALES',
      locationId: locCentral.id,
    },
  });

  console.log('👤 Seeded Users: Admin (admin@fundsroom.com), Ops (ops@fundsroom.com), Sales (sales@fundsroom.com)');

  // 3. Seed Items
  const itemSteel = await prisma.item.create({
    data: {
      sku: 'RAW-STEEL-01',
      name: 'High-Grade Steel Sheet',
      category: 'Raw Material',
      uom: 'KG',
      description: 'Industrial 5mm cold-rolled steel plate',
    },
  });

  const itemCopper = await prisma.item.create({
    data: {
      sku: 'COMP-COPPER-01',
      name: 'Copper Wiring Coil',
      category: 'Components',
      uom: 'MTR',
      description: 'High conductivity copper winding wire',
    },
  });

  const itemMotor = await prisma.item.create({
    data: {
      sku: 'PROD-MOTOR-X1',
      name: 'Industrial Electric Motor X1',
      category: 'Finished Goods',
      uom: 'PCS',
      description: 'Heavy duty 5HP 3-phase electric motor',
    },
  });

  const itemPump = await prisma.item.create({
    data: {
      sku: 'PROD-PUMP-V2',
      name: 'Hydraulic Fluid Pump V2',
      category: 'Finished Goods',
      uom: 'PCS',
      description: 'High pressure dual-chamber hydraulic pump',
    },
  });

  console.log('📦 Seeded Master Items:', itemSteel.name, itemCopper.name, itemMotor.name, itemPump.name);

  // 4. Seed Bill of Materials (BOM) for Electric Motor
  // 1 Motor = 15 KG Steel + 8 MTR Copper
  await prisma.billOfMaterial.create({
    data: {
      parentItemId: itemMotor.id,
      componentItemId: itemSteel.id,
      quantityPerUnit: 15,
    },
  });

  await prisma.billOfMaterial.create({
    data: {
      parentItemId: itemMotor.id,
      componentItemId: itemCopper.id,
      quantityPerUnit: 8,
    },
  });

  console.log('📐 Seeded BOM structure for Electric Motor (15kg Steel + 8m Copper per Motor).');

  // 5. Seed Inventory Batches
  // Warehouse North: Plenty of Steel (500), Copper (200), and Finished Motors (50 total, 10 reserved => 40 avail)
  const invSteelNorth = await prisma.inventory.create({
    data: {
      itemId: itemSteel.id,
      locationId: locNorth.id,
      batchNumber: 'BAT-ST-001',
      physicalQuantity: 500,
      reservedQuantity: 0,
    },
  });

  const invCopperNorth = await prisma.inventory.create({
    data: {
      itemId: itemCopper.id,
      locationId: locNorth.id,
      batchNumber: 'BAT-CP-001',
      physicalQuantity: 200,
      reservedQuantity: 0,
    },
  });

  const invMotorNorth = await prisma.inventory.create({
    data: {
      itemId: itemMotor.id,
      locationId: locNorth.id,
      batchNumber: 'BAT-MOT-001',
      physicalQuantity: 50,
      reservedQuantity: 10,
    },
  });

  // Plant South: Low on Steel (40), Finished Motors (20)
  const invSteelSouth = await prisma.inventory.create({
    data: {
      itemId: itemSteel.id,
      locationId: locSouth.id,
      batchNumber: 'BAT-ST-002',
      physicalQuantity: 40,
      reservedQuantity: 0,
    },
  });

  const invMotorSouth = await prisma.inventory.create({
    data: {
      itemId: itemMotor.id,
      locationId: locSouth.id,
      batchNumber: 'BAT-MOT-002',
      physicalQuantity: 20,
      reservedQuantity: 0,
    },
  });

  // Central Hub: Pumps (80)
  const invPumpCentral = await prisma.inventory.create({
    data: {
      itemId: itemPump.id,
      locationId: locCentral.id,
      batchNumber: 'BAT-PMP-001',
      physicalQuantity: 80,
      reservedQuantity: 0,
    },
  });

  console.log('📊 Seeded Multi-Location Inventory with Batches & Reservations.');

  // 6. Log Initial Inventory Transactions
  const initialStockLogs = [
    { itemId: itemSteel.id, locationId: locNorth.id, batchNumber: 'BAT-ST-001', quantity: 500, physical: 500, reserved: 0 },
    { itemId: itemCopper.id, locationId: locNorth.id, batchNumber: 'BAT-CP-001', quantity: 200, physical: 200, reserved: 0 },
    { itemId: itemMotor.id, locationId: locNorth.id, batchNumber: 'BAT-MOT-001', quantity: 50, physical: 50, reserved: 10 },
    { itemId: itemSteel.id, locationId: locSouth.id, batchNumber: 'BAT-ST-002', quantity: 40, physical: 40, reserved: 0 },
    { itemId: itemMotor.id, locationId: locSouth.id, batchNumber: 'BAT-MOT-002', quantity: 20, physical: 20, reserved: 0 },
    { itemId: itemPump.id, locationId: locCentral.id, batchNumber: 'BAT-PMP-001', quantity: 80, physical: 80, reserved: 0 },
  ];

  for (const log of initialStockLogs) {
    await prisma.inventoryTransaction.create({
      data: {
        itemId: log.itemId,
        locationId: log.locationId,
        batchNumber: log.batchNumber,
        type: 'STOCK_IN',
        quantity: log.quantity,
        physicalBalanceAfter: log.physical,
        reservedBalanceAfter: log.reserved,
        referenceType: 'MANUAL',
        performedById: adminUser.id,
        notes: 'Initial ERP warehouse balance onboarding',
      },
    });
  }

  // 7. Seed Sample Work Order
  const sampleWO = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-20260822-0001',
      locationId: locSouth.id,
      itemId: itemMotor.id,
      requiredQuantity: 10,
      assignedUserId: opsUser.id,
      status: 'ASSIGNED',
      notes: 'Assemble 10x Electric Motors for Q3 Distribution',
      materials: {
        create: [
          { materialItemId: itemSteel.id, requiredQuantity: 150 }, // 10 * 15kg
          { materialItemId: itemCopper.id, requiredQuantity: 80 },  // 10 * 8m
        ],
      },
    },
  });

  console.log('📋 Seeded Sample Work Order:', sampleWO.workOrderNumber);

  // 8. Seed Sample Stock Transfer
  const sampleTransfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-20260822-0001',
      sourceLocationId: locNorth.id,
      destinationLocationId: locSouth.id,
      itemId: itemSteel.id,
      batchNumber: 'BAT-ST-001',
      quantity: 50,
      status: 'REQUESTED',
      createdById: opsUser.id,
    },
  });

  console.log('🚚 Seeded Sample Stock Transfer:', sampleTransfer.transferNumber);

  // 9. Seed Sample Customer Order
  const sampleOrder = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-20260822-0001',
      customerName: 'Apex Machinery & Automation',
      locationId: locNorth.id,
      status: 'RESERVED',
      totalAmount: 15000,
      createdById: salesUser.id,
      items: {
        create: [
          {
            itemId: itemMotor.id,
            batchNumber: 'BAT-MOT-001',
            quantity: 10,
            reservedQuantity: 10,
            unitPrice: 1500,
          },
        ],
      },
    },
  });

  console.log('🛒 Seeded Sample Customer Order:', sampleOrder.orderNumber);
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

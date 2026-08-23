const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Mini Operations ERP (JavaScript)...');

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

  // 2. Seed Users with exact roles
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashOps = await bcrypt.hash('operations123', 10);
  const passwordHashSales = await bcrypt.hash('sales123', 10);

  const passwordHashKunal = await bcrypt.hash('12345678', 10);

  // Primary specification seed users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@erp.com',
      name: 'System Admin',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
      locationId: locNorth.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'kk6547015@gmail.com',
      name: 'Kunal Admin',
      passwordHash: passwordHashKunal,
      role: 'ADMIN',
      locationId: locNorth.id,
    },
  });

  const opsUser = await prisma.user.create({
    data: {
      email: 'operations@erp.com',
      name: 'Operations Manager',
      passwordHash: passwordHashOps,
      role: 'OPERATIONS_USER',
      locationId: locSouth.id,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      email: 'sales@erp.com',
      name: 'Sales Representative',
      passwordHash: passwordHashSales,
      role: 'SALES_USER',
      locationId: locCentral.id,
    },
  });

  // Secondary aliases for backwards compatibility
  await prisma.user.create({
    data: {
      email: 'admin@fundsroom.com',
      name: 'Alice Admin',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
      locationId: locNorth.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'ops@fundsroom.com',
      name: 'Bob Operations',
      passwordHash: passwordHashOps,
      role: 'OPERATIONS_USER',
      locationId: locSouth.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'sales@fundsroom.com',
      name: 'Charlie Sales',
      passwordHash: passwordHashSales,
      role: 'SALES_USER',
      locationId: locCentral.id,
    },
  });

  console.log('👤 Seeded Users:');
  console.log('   - Admin: admin@erp.com (Role: ADMIN)');
  console.log('   - Operations: operations@erp.com (Role: OPERATIONS_USER)');
  console.log('   - Sales: sales@erp.com (Role: SALES_USER)');

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
      sku: 'RAW-COPPER-01',
      name: 'Copper Wiring Coil',
      category: 'Raw Material',
      uom: 'METER',
      description: 'Heavy duty insulated copper wiring',
    },
  });

  const itemMotor = await prisma.item.create({
    data: {
      sku: 'FIN-MOTOR-X1',
      name: 'Industrial Electric Motor X1',
      category: 'Finished Goods',
      uom: 'PCS',
      description: 'High-torque 3-phase AC induction motor',
    },
  });

  const itemPump = await prisma.item.create({
    data: {
      sku: 'COMP-PUMP-V2',
      name: 'Hydraulic Fluid Pump V2',
      category: 'Components',
      uom: 'PCS',
      description: 'Rotary vane hydraulic pump mechanism',
    },
  });

  console.log('📦 Seeded Master Items:', itemSteel.sku, itemCopper.sku, itemMotor.sku, itemPump.sku);

  // 4. Seed Bill of Materials (BOM)
  await prisma.billOfMaterial.create({
    data: {
      parentItemId: itemMotor.id,
      componentItemId: itemSteel.id,
      quantityPerUnit: 15.0,
    },
  });

  await prisma.billOfMaterial.create({
    data: {
      parentItemId: itemMotor.id,
      componentItemId: itemCopper.id,
      quantityPerUnit: 8.0,
    },
  });

  console.log('📐 Seeded BOM structure for Electric Motor (15kg Steel + 8m Copper per Motor).');

  // 5. Seed Inventory with Batches & Reservations
  // North Warehouse
  await prisma.inventory.create({
    data: {
      itemId: itemSteel.id,
      locationId: locNorth.id,
      batchNumber: 'BAT-ST-001',
      physicalQuantity: 100.0,
      reservedQuantity: 20.0,
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: itemCopper.id,
      locationId: locNorth.id,
      batchNumber: 'BAT-CP-001',
      physicalQuantity: 250.0,
      reservedQuantity: 0.0,
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: itemMotor.id,
      locationId: locNorth.id,
      batchNumber: 'BAT-MO-001',
      physicalQuantity: 30.0,
      reservedQuantity: 5.0,
    },
  });

  // South Plant
  await prisma.inventory.create({
    data: {
      itemId: itemSteel.id,
      locationId: locSouth.id,
      batchNumber: 'BAT-ST-002',
      physicalQuantity: 10.0,
      reservedQuantity: 0.0,
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: itemPump.id,
      locationId: locSouth.id,
      batchNumber: 'BAT-PU-001',
      physicalQuantity: 50.0,
      reservedQuantity: 10.0,
    },
  });

  console.log('📊 Seeded Multi-Location Inventory with Batches & Reservations.');

  // 6. Seed Work Order
  const sampleWorkOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-20260822-0001',
      locationId: locSouth.id,
      itemId: itemMotor.id,
      requiredQuantity: 5,
      assignedUserId: adminUser.id,
      status: 'ASSIGNED',
      notes: 'Initial production batch for regional distribution.',
      materials: {
        create: [
          { materialItemId: itemSteel.id, requiredQuantity: 75.0, consumedQuantity: 0 },
          { materialItemId: itemCopper.id, requiredQuantity: 40.0, consumedQuantity: 0 },
        ],
      },
    },
  });

  console.log('📋 Seeded Sample Work Order:', sampleWorkOrder.workOrderNumber);

  // 7. Seed Stock Transfer
  const sampleTransfer = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-20260822-0001',
      sourceLocationId: locNorth.id,
      destinationLocationId: locSouth.id,
      itemId: itemSteel.id,
      batchNumber: 'BAT-ST-001',
      quantity: 25.0,
      status: 'REQUESTED',
      createdById: opsUser.id,
    },
  });

  console.log('🚚 Seeded Sample Stock Transfer:', sampleTransfer.transferNumber);

  // 8. Seed Customer Order
  const sampleOrder = await prisma.customerOrder.create({
    data: {
      orderNumber: 'ORD-20260822-0001',
      customerName: 'Apex Heavy Machinery Ltd',
      locationId: locNorth.id,
      status: 'DRAFT',
      totalAmount: 18500.0,
      createdById: salesUser.id,
      items: {
        create: [
          {
            itemId: itemMotor.id,
            batchNumber: 'BAT-MO-001',
            quantity: 5,
            unitPrice: 3500.0,
            reservedQuantity: 5.0,
          },
          {
            itemId: itemPump.id,
            quantity: 1,
            unitPrice: 1000.0,
            reservedQuantity: 0.0,
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
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

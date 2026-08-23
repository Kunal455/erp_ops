const app = require('./app');
const { config, prisma } = require('./config');
const bcrypt = require('bcryptjs');

const PORT = config.port || 5000;

async function bootstrapDatabase() {
  try {
    const inventoryCount = await prisma.inventory.count();
    const adminUser = await prisma.user.findUnique({ where: { email: 'kk6547015@gmail.com' } });

    if (inventoryCount === 0 || !adminUser) {
      console.log('⚡ Running full initial database bootstrap & seeding...');

      // 1. Locations
      let locNorth = await prisma.location.findUnique({ where: { code: 'WH-NORTH' } });
      if (!locNorth) {
        locNorth = await prisma.location.create({
          data: {
            code: 'WH-NORTH',
            name: 'Warehouse North (Main Depot)',
            address: '100 Industrial Parkway, North Sector',
          },
        });
      }

      let locSouth = await prisma.location.findUnique({ where: { code: 'PLANT-SOUTH' } });
      if (!locSouth) {
        locSouth = await prisma.location.create({
          data: {
            code: 'PLANT-SOUTH',
            name: 'Plant South (Assembly Facility)',
            address: '45 Manufacturing Drive, South Sector',
          },
        });
      }

      let locCentral = await prisma.location.findUnique({ where: { code: 'HUB-CENTRAL' } });
      if (!locCentral) {
        locCentral = await prisma.location.create({
          data: {
            code: 'HUB-CENTRAL',
            name: 'Central Logistics Hub',
            address: '88 Commerce Boulevard, Central Zone',
          },
        });
      }

      // 2. Users (Password: 12345678 for all)
      const passwordHashShared = await bcrypt.hash('12345678', 10);

      const kunalAdmin = await prisma.user.upsert({
        where: { email: 'kk6547015@gmail.com' },
        update: { passwordHash: passwordHashShared, role: 'ADMIN' },
        create: {
          email: 'kk6547015@gmail.com',
          name: 'Kunal Admin',
          passwordHash: passwordHashShared,
          role: 'ADMIN',
          locationId: locNorth.id,
        },
      });

      const opsUser = await prisma.user.upsert({
        where: { email: 'rohan@gmail.com' },
        update: { passwordHash: passwordHashShared, role: 'OPERATIONS_USER' },
        create: {
          email: 'rohan@gmail.com',
          name: 'Rohan Operations',
          passwordHash: passwordHashShared,
          role: 'OPERATIONS_USER',
          locationId: locSouth.id,
        },
      });

      const salesUser = await prisma.user.upsert({
        where: { email: 'rahul@gmail.com' },
        update: { passwordHash: passwordHashShared, role: 'SALES_USER' },
        create: {
          email: 'rahul@gmail.com',
          name: 'Rahul Sales',
          passwordHash: passwordHashShared,
          role: 'SALES_USER',
          locationId: locCentral.id,
        },
      });

      await prisma.user.upsert({
        where: { email: 'admin@erp.com' },
        update: { passwordHash: passwordHashShared, role: 'ADMIN' },
        create: {
          email: 'admin@erp.com',
          name: 'System Admin',
          passwordHash: passwordHashShared,
          role: 'ADMIN',
          locationId: locNorth.id,
        },
      });

      await prisma.user.upsert({
        where: { email: 'operations@erp.com' },
        update: { passwordHash: passwordHashShared, role: 'OPERATIONS_USER' },
        create: {
          email: 'operations@erp.com',
          name: 'Operations Manager',
          passwordHash: passwordHashShared,
          role: 'OPERATIONS_USER',
          locationId: locSouth.id,
        },
      });

      await prisma.user.upsert({
        where: { email: 'sales@erp.com' },
        update: { passwordHash: passwordHashShared, role: 'SALES_USER' },
        create: {
          email: 'sales@erp.com',
          name: 'Sales Representative',
          passwordHash: passwordHashShared,
          role: 'SALES_USER',
          locationId: locCentral.id,
        },
      });

      // 3. Items
      let itemSteel = await prisma.item.findUnique({ where: { sku: 'RAW-STEEL-01' } });
      if (!itemSteel) {
        itemSteel = await prisma.item.create({
          data: {
            sku: 'RAW-STEEL-01',
            name: 'High-Grade Steel Sheet',
            category: 'Raw Material',
            uom: 'KG',
            description: 'Industrial 5mm cold-rolled steel plate',
          },
        });
      }

      let itemCopper = await prisma.item.findUnique({ where: { sku: 'RAW-COPPER-01' } });
      if (!itemCopper) {
        itemCopper = await prisma.item.create({
          data: {
            sku: 'RAW-COPPER-01',
            name: 'Copper Wiring Coil',
            category: 'Raw Material',
            uom: 'METER',
            description: 'Heavy duty insulated copper wiring',
          },
        });
      }

      let itemMotor = await prisma.item.findUnique({ where: { sku: 'FIN-MOTOR-X1' } });
      if (!itemMotor) {
        itemMotor = await prisma.item.create({
          data: {
            sku: 'FIN-MOTOR-X1',
            name: 'Industrial Electric Motor X1',
            category: 'Finished Goods',
            uom: 'PCS',
            description: 'High-torque 3-phase AC induction motor',
          },
        });
      }

      let itemPump = await prisma.item.findUnique({ where: { sku: 'COMP-PUMP-V2' } });
      if (!itemPump) {
        itemPump = await prisma.item.create({
          data: {
            sku: 'COMP-PUMP-V2',
            name: 'Hydraulic Fluid Pump V2',
            category: 'Components',
            uom: 'PCS',
            description: 'Rotary vane hydraulic pump mechanism',
          },
        });
      }

      // 4. BOM
      const existingBom = await prisma.billOfMaterial.findFirst({
        where: { parentItemId: itemMotor.id },
      });
      if (!existingBom) {
        await prisma.billOfMaterial.create({
          data: { parentItemId: itemMotor.id, componentItemId: itemSteel.id, quantityPerUnit: 15.0 },
        });
        await prisma.billOfMaterial.create({
          data: { parentItemId: itemMotor.id, componentItemId: itemCopper.id, quantityPerUnit: 8.0 },
        });
      }

      // 5. Multi-Location Inventory
      await prisma.inventory.upsert({
        where: {
          itemId_locationId_batchNumber: {
            itemId: itemSteel.id,
            locationId: locNorth.id,
            batchNumber: 'BAT-ST-001',
          },
        },
        update: {},
        create: {
          itemId: itemSteel.id,
          locationId: locNorth.id,
          batchNumber: 'BAT-ST-001',
          physicalQuantity: 100.0,
          reservedQuantity: 20.0,
        },
      });

      await prisma.inventory.upsert({
        where: {
          itemId_locationId_batchNumber: {
            itemId: itemCopper.id,
            locationId: locNorth.id,
            batchNumber: 'BAT-CP-001',
          },
        },
        update: {},
        create: {
          itemId: itemCopper.id,
          locationId: locNorth.id,
          batchNumber: 'BAT-CP-001',
          physicalQuantity: 250.0,
          reservedQuantity: 0.0,
        },
      });

      await prisma.inventory.upsert({
        where: {
          itemId_locationId_batchNumber: {
            itemId: itemMotor.id,
            locationId: locNorth.id,
            batchNumber: 'BAT-MO-001',
          },
        },
        update: {},
        create: {
          itemId: itemMotor.id,
          locationId: locNorth.id,
          batchNumber: 'BAT-MO-001',
          physicalQuantity: 30.0,
          reservedQuantity: 5.0,
        },
      });

      await prisma.inventory.upsert({
        where: {
          itemId_locationId_batchNumber: {
            itemId: itemSteel.id,
            locationId: locSouth.id,
            batchNumber: 'BAT-ST-002',
          },
        },
        update: {},
        create: {
          itemId: itemSteel.id,
          locationId: locSouth.id,
          batchNumber: 'BAT-ST-002',
          physicalQuantity: 10.0,
          reservedQuantity: 0.0,
        },
      });

      await prisma.inventory.upsert({
        where: {
          itemId_locationId_batchNumber: {
            itemId: itemPump.id,
            locationId: locSouth.id,
            batchNumber: 'BAT-PU-001',
          },
        },
        update: {},
        create: {
          itemId: itemPump.id,
          locationId: locSouth.id,
          batchNumber: 'BAT-PU-001',
          physicalQuantity: 50.0,
          reservedQuantity: 10.0,
        },
      });

      // 6. Sample Work Orders
      const woCheck = await prisma.workOrder.findFirst();
      if (!woCheck) {
        await prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-20260822-0001',
            locationId: locSouth.id,
            itemId: itemMotor.id,
            requiredQuantity: 120,
            assignedUserId: opsUser.id,
            status: 'ASSIGNED',
            notes: 'Assembly of 120 units Electric Motors. Check material shortage at Plant South.',
            materials: {
              create: [
                { materialItemId: itemSteel.id, requiredQuantity: 1800.0, consumedQuantity: 0 },
                { materialItemId: itemCopper.id, requiredQuantity: 960.0, consumedQuantity: 0 },
              ],
            },
          },
        });

        await prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-20260822-0002',
            locationId: locNorth.id,
            itemId: itemPump.id,
            requiredQuantity: 45,
            assignedUserId: opsUser.id,
            status: 'IN_PROGRESS',
            notes: 'Industrial Pump V2 assembly batch in progress.',
          },
        });
      }

      console.log('✅ Full bootstrap completed: Admin, Users, Items, Multi-Location Inventory & Work Orders ready.');
    }
  } catch (err) {
    console.warn('⚠️ Auto-bootstrap notice:', err.message);
  }
}

const server = app.listen(PORT, async () => {
  console.log(`🚀 Mini Operations ERP Backend API running at: http://localhost:${PORT}`);
  console.log(`📑 Swagger Documentation available at: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check available at: http://localhost:${PORT}/health`);
  await bootstrapDatabase();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

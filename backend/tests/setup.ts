import { prisma } from '../src/config';
import bcrypt from 'bcryptjs';

export let adminToken: string;
export let opsToken: string;
export let salesToken: string;
export let adminUser: any;
export let opsUser: any;
export let salesUser: any;
export let locNorth: any;
export let locSouth: any;
export let itemSteel: any;
export let itemMotor: any;

beforeAll(async () => {
  // Ensure DB is clean and seeded for test execution
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

  locNorth = await prisma.location.create({
    data: { code: 'TEST-LOC-A', name: 'Location A North' },
  });

  locSouth = await prisma.location.create({
    data: { code: 'TEST-LOC-B', name: 'Location B South' },
  });

  const pwdHash = await bcrypt.hash('password123', 6);

  adminUser = await prisma.user.create({
    data: {
      email: 'admin.test@fundsroom.com',
      name: 'Admin Tester',
      passwordHash: pwdHash,
      role: 'ADMIN',
      locationId: locNorth.id,
    },
  });

  opsUser = await prisma.user.create({
    data: {
      email: 'ops.test@fundsroom.com',
      name: 'Ops Tester',
      passwordHash: pwdHash,
      role: 'OPERATIONS',
      locationId: locNorth.id,
    },
  });

  salesUser = await prisma.user.create({
    data: {
      email: 'sales.test@fundsroom.com',
      name: 'Sales Tester',
      passwordHash: pwdHash,
      role: 'SALES',
      locationId: locNorth.id,
    },
  });

  itemSteel = await prisma.item.create({
    data: {
      sku: 'TEST-RAW-STEEL',
      name: 'Test Steel Sheet',
      category: 'Raw Material',
      uom: 'KG',
    },
  });

  itemMotor = await prisma.item.create({
    data: {
      sku: 'TEST-PROD-MOTOR',
      name: 'Test Electric Motor',
      category: 'Finished Goods',
      uom: 'PCS',
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

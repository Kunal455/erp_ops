const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/config');
const setup = require('./setup');

describe('Mini Operations ERP - Role-Based Authorization & Verification Test Suite', () => {
  let adminToken;
  let opsToken;
  let salesToken;

  beforeAll(async () => {
    // Obtain JWT tokens for each seeded role
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.test@fundsroom.com', password: 'password123' });
    adminToken = adminRes.body.data.token;

    const opsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ops.test@fundsroom.com', password: 'password123' });
    opsToken = opsRes.body.data.token;

    const salesRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales.test@fundsroom.com', password: 'password123' });
    salesToken = salesRes.body.data.token;
  });

  beforeEach(async () => {
    // Reset inventory and transactions between test cases for clean state
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.customerOrderItem.deleteMany({});
    await prisma.customerOrder.deleteMany({});
    await prisma.stockTransfer.deleteMany({});
    await prisma.workOrderMaterial.deleteMany({});
    await prisma.workOrder.deleteMany({});
    await prisma.inventory.deleteMany({});
  });

  // ==========================================
  // ROLE PERMISSION MATRIX TESTS (14+ REQUIRED)
  // ==========================================
  describe('Permission Matrix: Role-Based Authorization Tests', () => {
    // 1. ADMIN can create Work Order
    it('1. ADMIN can create Work Order', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemMotor.id,
          requiredQuantity: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.workOrderNumber).toBeDefined();
    });

    // 2. OPERATIONS_USER cannot create Work Order (403)
    it('2. OPERATIONS_USER cannot create Work Order (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemMotor.id,
          requiredQuantity: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission');
    });

    // 3. SALES_USER cannot create Work Order (403)
    it('3. SALES_USER cannot create Work Order (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemMotor.id,
          requiredQuantity: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission');
    });

    // 4. OPERATIONS_USER can modify Inventory
    it('4. OPERATIONS_USER can modify Inventory (stock-in & adjust)', async () => {
      const stockInRes = await request(app)
        .post('/api/inventory/stock-in')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-OPS-01',
          quantity: 100,
        });

      expect(stockInRes.status).toBe(201);
      expect(stockInRes.body.data.physicalQuantity).toBe(100);

      const adjustRes = await request(app)
        .patch('/api/inventory/adjust')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-OPS-01',
          newPhysicalQuantity: 85,
        });

      expect(adjustRes.status).toBe(200);
      expect(adjustRes.body.data.physicalQuantity).toBe(85);
    });

    // 5. SALES_USER cannot modify Inventory (403)
    it('5. SALES_USER cannot modify Inventory (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/inventory/stock-in')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-SALES-TRY',
          quantity: 50,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // 6. OPERATIONS_USER can dispatch Transfer
    it('6. OPERATIONS_USER can dispatch Transfer', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-TRF-01',
          physicalQuantity: 100,
          reservedQuantity: 0,
        },
      });

      const trfRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BAT-TRF-01',
          quantity: 30,
        });

      const transferId = trfRes.body.data.id;

      const dispatchRes = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      expect(dispatchRes.status).toBe(200);
      expect(dispatchRes.body.data.status).toBe('DISPATCHED');
    });

    // 7. SALES_USER cannot dispatch Transfer (403)
    it('7. SALES_USER cannot dispatch Transfer (403 Forbidden)', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-TRF-02',
          physicalQuantity: 100,
          reservedQuantity: 0,
        },
      });

      const trfRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BAT-TRF-02',
          quantity: 20,
        });

      const transferId = trfRes.body.data.id;

      const dispatchRes = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(dispatchRes.status).toBe(403);
      expect(dispatchRes.body.success).toBe(false);
    });

    // 8. OPERATIONS_USER can receive Transfer
    it('8. OPERATIONS_USER can receive Transfer', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-TRF-03',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      const trfRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BAT-TRF-03',
          quantity: 20,
        });

      const transferId = trfRes.body.data.id;

      await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      const receiveRes = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);

      expect(receiveRes.status).toBe(200);
      expect(receiveRes.body.data.status).toBe('RECEIVED');
    });

    // 9. SALES_USER cannot receive Transfer (403)
    it('9. SALES_USER cannot receive Transfer (403 Forbidden)', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-TRF-04',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      const trfRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BAT-TRF-04',
          quantity: 20,
        });

      const transferId = trfRes.body.data.id;

      await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      const receiveRes = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(receiveRes.status).toBe(403);
      expect(receiveRes.body.success).toBe(false);
    });

    // 10. SALES_USER can create Customer Order
    it('10. SALES_USER can create Customer Order', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Global Enterprises Inc',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, quantity: 5, unitPrice: 3500 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBe('Global Enterprises Inc');
    });

    // 11. SALES_USER can reserve stock
    it('11. SALES_USER can reserve stock', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-RES-01',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Reserve Client',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BAT-RES-01', quantity: 15 }],
        });

      const orderId = orderRes.body.data.id;

      const reserveRes = await request(app)
        .post(`/api/orders/${orderId}/reserve`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(reserveRes.status).toBe(200);
      expect(reserveRes.body.data.status).toBe('RESERVED');
    });

    // 12. ADMIN cannot reserve stock (403)
    it('12. ADMIN cannot reserve stock (403 Forbidden)', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-RES-02',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Admin Reserve Test',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BAT-RES-02', quantity: 10 }],
        });

      const orderId = orderRes.body.data.id;

      const reserveRes = await request(app)
        .post(`/api/orders/${orderId}/reserve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reserveRes.status).toBe(403);
      expect(reserveRes.body.success).toBe(false);
    });

    // 13. Unauthenticated user receives 401
    it('13. Unauthenticated user receives 401 Unauthorized', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // 14. Authenticated user with wrong role receives 403
    it('14. Authenticated user with wrong role receives 403 Forbidden', async () => {
      // ADMIN trying to modify inventory
      const resAdminModify = await request(app)
        .post('/api/inventory/stock-in')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BAT-ADMIN-TRY',
          quantity: 10,
        });
      expect(resAdminModify.status).toBe(403);

      // OPERATIONS_USER trying to create Customer Order
      const resOpsOrder = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          customerName: 'Ops Trying Order',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, quantity: 5 }],
        });
      expect(resOpsOrder.status).toBe(403);
    });
  });

  // ==========================================
  // INVENTORY RESERVATION BOUNDS
  // ==========================================
  describe('Mandatory Test: Inventory Reservation Bounds', () => {
    it('should REJECT reservation when requested quantity exceeds available inventory', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-M-02',
          physicalQuantity: 50,
          reservedQuantity: 10,
        },
      });

      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Greedy Customer Ltd',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-M-02', quantity: 45 }],
        });

      const orderId = createOrderRes.body.data.id;

      const reserveRes = await request(app)
        .post(`/api/orders/${orderId}/reserve`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(reserveRes.status).toBe(400);
      expect(reserveRes.body.success).toBe(false);
      expect(reserveRes.body.message).toContain('Insufficient available inventory');
    });
  });

  // ==========================================
  // TRANSFER LIFECYCLE & DOUBLE RECEIPT
  // ==========================================
  describe('Mandatory Test: Transfer Lifecycle & Double-Receipt Prevention', () => {
    it('reduces source on dispatch, keeps destination untouched before receipt, and increases destination on receipt', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-TRF-TIMING',
          physicalQuantity: 100,
          reservedQuantity: 0,
        },
      });

      const createRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-TRF-TIMING',
          quantity: 40,
        });

      const transferId = createRes.body.data.id;

      // Dispatch
      await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      // Verify source reduced to 60
      const srcInv = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-TRF-TIMING',
          },
        },
      });
      expect(srcInv?.physicalQuantity).toBe(60);

      // Verify destination untouched
      const destBefore = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locSouth.id,
            batchNumber: 'BATCH-TRF-TIMING',
          },
        },
      });
      expect(destBefore).toBeNull();

      // Receive
      await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);

      const destAfter = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locSouth.id,
            batchNumber: 'BATCH-TRF-TIMING',
          },
        },
      });
      expect(destAfter?.physicalQuantity).toBe(40);
    });

    it('rejects double-receipt on already received transfer', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-TRF-DBL',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      const trfRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-TRF-DBL',
          quantity: 25,
        });

      const transferId = trfRes.body.data.id;

      await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      const firstRec = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);
      expect(firstRec.status).toBe(200);

      const secondRec = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);
      expect(secondRec.status).toBe(400);
    });
  });

  // ==========================================
  // CONCURRENCY & RACE CONDITIONS
  // ==========================================
  describe('Concurrency & Race-Condition Safety', () => {
    it('ensures two simultaneous reservation requests cannot exceed available inventory', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-RACE-01',
          physicalQuantity: 30,
          reservedQuantity: 0,
        },
      });

      const orderARes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Buyer A',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-RACE-01', quantity: 20 }],
        });

      const orderBRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Buyer B',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-RACE-01', quantity: 20 }],
        });

      const [resA, resB] = await Promise.all([
        request(app).post(`/api/orders/${orderARes.body.data.id}/reserve`).set('Authorization', `Bearer ${salesToken}`),
        request(app).post(`/api/orders/${orderBRes.body.data.id}/reserve`).set('Authorization', `Bearer ${salesToken}`),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      const invAfter = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemMotor.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-RACE-01',
          },
        },
      });

      expect(invAfter?.reservedQuantity).toBe(20);
      expect(invAfter?.physicalQuantity).toBe(30);
    });

    it('ensures two simultaneous dispatches cannot over-draw source physical inventory', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-RACE-TRF',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      const trfARes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-RACE-TRF',
          quantity: 40,
        });

      const trfBRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-RACE-TRF',
          quantity: 40,
        });

      const [resA, resB] = await Promise.all([
        request(app).post(`/api/transfers/${trfARes.body.data.id}/dispatch`).set('Authorization', `Bearer ${opsToken}`),
        request(app).post(`/api/transfers/${trfBRes.body.data.id}/dispatch`).set('Authorization', `Bearer ${opsToken}`),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      const srcInv = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-RACE-TRF',
          },
        },
      });
      expect(srcInv?.physicalQuantity).toBe(10);
    });
  });

  // ==========================================
  // WORK ORDER SHORTAGE & STATE MACHINE
  // ==========================================
  describe('Work Order Shortage Calculation & Status State Machine', () => {
    it('calculates shortage accurately: shortage = max(required - available, 0)', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-WO-SHORTAGE',
          physicalQuantity: 70,
          reservedQuantity: 0,
        },
      });

      const woRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemSteel.id,
          requiredQuantity: 100,
        });

      const woId = woRes.body.data.id;

      const getWoRes = await request(app)
        .get(`/api/work-orders/${woId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getWoRes.status).toBe(200);
      expect(getWoRes.body.data.requiredQuantity).toBe(100);
      expect(getWoRes.body.data.availableStock).toBe(70);
      expect(getWoRes.body.data.shortage).toBe(30);
      expect(getWoRes.body.data.hasShortage).toBe(true);
    });

    it('enforces sequential status transitions: ASSIGNED -> IN_PROGRESS -> COMPLETED', async () => {
      const createRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemMotor.id,
          requiredQuantity: 10,
        });

      const woId = createRes.body.data.id;

      // Invalid transition: ASSIGNED -> COMPLETED (skip IN_PROGRESS)
      const invalidJump = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' });

      expect(invalidJump.status).toBe(400);

      // Valid: ASSIGNED -> IN_PROGRESS
      const step1 = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(step1.status).toBe(200);

      // Valid: IN_PROGRESS -> COMPLETED
      const step2 = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' });
      expect(step2.status).toBe(200);
    });
  });

  // ==========================================
  // AUTHENTICATION & SIGNUP SECURITY
  // ==========================================
  describe('User Registration & Authentication Lifecycle', () => {
    it('should register a new user successfully and return a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'New Registered User',
          email: 'newuser@erp.com',
          password: 'password123',
          role: 'OPERATIONS_USER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('OPERATIONS_USER');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject public signup creating an ADMIN account (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Fake Admin Attacker',
          email: 'fakeadmin@erp.com',
          password: 'password123',
          role: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Admin accounts cannot be created via public signup');
    });

    it('should reject signup with duplicate email address (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Duplicate User',
          email: 'admin.test@fundsroom.com',
          password: 'password123',
          role: 'OPERATIONS_USER',
        });

      expect(res.status).toBe(409);
    });

    it('should reject signup with short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Short Pwd User',
          email: 'shortpwd@erp.com',
          password: '123',
        });

      expect(res.status).toBe(400);
    });
  });
});

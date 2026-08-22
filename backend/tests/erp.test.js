const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/config');
const setup = require('./setup');

describe('Mini Operations ERP - Mandatory Verification Test Suite (JavaScript)', () => {
  let adminToken;
  let opsToken;
  let salesToken;

  beforeAll(async () => {
    // Obtain JWT tokens for each role
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

  /**
   * TEST 1: Cannot reserve more than available inventory.
   */
  describe('Mandatory Test 1: Inventory Reservation Bounds', () => {
    it('should successfully reserve when requested quantity <= available inventory', async () => {
      // Set up inventory: Physical = 50, Reserved = 10 => Available = 40
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-M-01',
          physicalQuantity: 50,
          reservedQuantity: 10,
        },
      });

      // Sales user creates order for 30 units (Available is 40)
      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Valid Customer Ltd',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-M-01', quantity: 30 }],
        });

      expect(createOrderRes.status).toBe(201);
      const orderId = createOrderRes.body.data.id;

      // Reserve stock
      const reserveRes = await request(app)
        .post(`/api/orders/${orderId}/reserve`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(reserveRes.status).toBe(200);
      expect(reserveRes.body.data.status).toBe('RESERVED');

      // Verify DB state: Reserved should now be 10 + 30 = 40; Physical = 50; Available = 10
      const invAfter = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemMotor.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-M-01',
          },
        },
      });
      expect(invAfter?.reservedQuantity).toBe(40);
      expect(invAfter?.physicalQuantity).toBe(50);
    });

    it('should REJECT reservation when requested quantity exceeds available inventory', async () => {
      // Set up inventory: Physical = 50, Reserved = 10 => Available = 40
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-M-02',
          physicalQuantity: 50,
          reservedQuantity: 10,
        },
      });

      // Sales user creates order for 45 units (Available is only 40)
      const createOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Over-Order Corp',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-M-02', quantity: 45 }],
        });

      expect(createOrderRes.status).toBe(201);
      const orderId = createOrderRes.body.data.id;

      // Attempt to reserve stock
      const reserveRes = await request(app)
        .post(`/api/orders/${orderId}/reserve`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(reserveRes.status).toBe(400);
      expect(reserveRes.body.success).toBe(false);
      expect(reserveRes.body.message).toContain('Insufficient available inventory');

      // Verify DB state did NOT change
      const invAfter = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemMotor.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-M-02',
          },
        },
      });
      expect(invAfter?.reservedQuantity).toBe(10);
    });
  });

  /**
   * TEST 2: Cannot transfer more than available inventory.
   */
  describe('Mandatory Test 2: Transfer Quantity Validation', () => {
    it('should REJECT stock transfer request if quantity exceeds available inventory at source', async () => {
      // Source inventory: Physical = 100, Reserved = 80 => Available = 20
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-S-01',
          physicalQuantity: 100,
          reservedQuantity: 80,
        },
      });

      // Request transfer of 30 units (Available is only 20)
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-S-01',
          quantity: 30,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Available stock at source is only 20 units');
    });
  });

  /**
   * TEST 3: Destination stock increases only after transfer receipt.
   */
  describe('Mandatory Test 3: Transfer Lifecycle & Stock Timing', () => {
    it('reduces source on dispatch, keeps destination untouched before receipt, and increases destination on receipt', async () => {
      // 1. Initial State: Source has 100 units, Destination has 0 units
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-TRF-01',
          physicalQuantity: 100,
          reservedQuantity: 0,
        },
      });

      // 2. Request Transfer of 40 units
      const createRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-TRF-01',
          quantity: 40,
        });

      expect(createRes.status).toBe(201);
      const transferId = createRes.body.data.id;

      // 3. Dispatch Transfer
      const dispatchRes = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      expect(dispatchRes.status).toBe(200);
      expect(dispatchRes.body.data.status).toBe('DISPATCHED');

      // Verify: Source inventory has REDUCED to 60
      const sourceInvAfterDispatch = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-TRF-01',
          },
        },
      });
      expect(sourceInvAfterDispatch?.physicalQuantity).toBe(60);

      // Verify CRITICAL RULE: Destination inventory MUST NOT have increased yet!
      const destInvBeforeReceipt = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locSouth.id,
            batchNumber: 'BATCH-TRF-01',
          },
        },
      });
      expect(destInvBeforeReceipt).toBeNull();

      // 4. Receive Transfer
      const receiveRes = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);

      expect(receiveRes.status).toBe(200);
      expect(receiveRes.body.data.status).toBe('RECEIVED');

      // Verify CRITICAL RULE: Destination inventory is NOW increased to 40
      const destInvAfterReceipt = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locSouth.id,
            batchNumber: 'BATCH-TRF-01',
          },
        },
      });
      expect(destInvAfterReceipt).not.toBeNull();
      expect(destInvAfterReceipt?.physicalQuantity).toBe(40);
    });
  });

  /**
   * TEST 4: Same transfer cannot be received twice.
   */
  describe('Mandatory Test 4: Transfer Double-Receipt Prevention', () => {
    it('should reject a second receive call on an already received transfer', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-TRF-02',
          physicalQuantity: 50,
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
          batchNumber: 'BATCH-TRF-02',
          quantity: 25,
        });

      const transferId = createRes.body.data.id;

      // Dispatch
      await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${opsToken}`);

      // First receipt -> Success
      const firstReceiveRes = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);

      expect(firstReceiveRes.status).toBe(200);
      expect(firstReceiveRes.body.data.status).toBe('RECEIVED');

      // Second receipt -> MUST BE REJECTED
      const secondReceiveRes = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${opsToken}`);

      expect(secondReceiveRes.status).toBe(400);
      expect(secondReceiveRes.body.success).toBe(false);
      expect(secondReceiveRes.body.message).toContain('Duplicate receipt prevented');

      // Ensure destination quantity was NOT doubled (should remain 25, not 50)
      const destInv = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locSouth.id,
            batchNumber: 'BATCH-TRF-02',
          },
        },
      });
      expect(destInv?.physicalQuantity).toBe(25);
    });
  });

  /**
   * TEST 5: Unauthorized user cannot perform restricted operation.
   */
  describe('Mandatory Test 5: Role-Based Authorization Enforcement', () => {
    it('should reject Sales user trying to dispatch stock transfers (403 Forbidden)', async () => {
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-TRF-AUTH',
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
          batchNumber: 'BATCH-TRF-AUTH',
          quantity: 10,
        });

      const transferId = createRes.body.data.id;

      // Sales user tries to dispatch -> 403 Forbidden
      const res = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should reject Operations user trying to create Work Orders (403 Forbidden - Admin only)', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemMotor.id,
          requiredQuantity: 15,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/inventory');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  /**
   * TEST 6: Concurrency Race Condition Safety on Stock Reservation
   */
  describe('Concurrency Test: Simultaneous Reservations Preventing Over-Allocation', () => {
    it('ensures two simultaneous reservation requests cannot exceed available physical inventory', async () => {
      // Set up inventory: Total available = 30
      await prisma.inventory.create({
        data: {
          itemId: setup.itemMotor.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-RACE-01',
          physicalQuantity: 30,
          reservedQuantity: 0,
        },
      });

      // User A creates order for 20 units
      const orderARes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Buyer A',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-RACE-01', quantity: 20 }],
        });
      const orderAId = orderARes.body.data.id;

      // User B creates order for 20 units
      const orderBRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          customerName: 'Buyer B',
          locationId: setup.locNorth.id,
          items: [{ itemId: setup.itemMotor.id, batchNumber: 'BATCH-RACE-01', quantity: 20 }],
        });
      const orderBId = orderBRes.body.data.id;

      // Execute reservations simultaneously in parallel
      const [resA, resB] = await Promise.all([
        request(app).post(`/api/orders/${orderAId}/reserve`).set('Authorization', `Bearer ${salesToken}`),
        request(app).post(`/api/orders/${orderBId}/reserve`).set('Authorization', `Bearer ${salesToken}`),
      ]);

      const statuses = [resA.status, resB.status];
      // Exactly one must succeed (200) and one must fail (400) because 20 + 20 = 40 > 30 available
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Verify database invariant: reservedQuantity must NOT exceed physicalQuantity (30)
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
  });

  /**
   * TEST 7: Work Order Lifecycle, Status Transitions & Shortage Calculation
   */
  describe('Work Order Shortage Calculation & Status State Machine', () => {
    it('calculates shortage accurately: shortage = max(required - available, 0)', async () => {
      // Setup inventory: Physical = 70, Reserved = 0 => Available = 70
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-WO-SHORTAGE',
          physicalQuantity: 70,
          reservedQuantity: 0,
        },
      });

      // Work Order requires 100 units (Available is 70 => Shortage should be 30)
      const woRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemSteel.id,
          requiredQuantity: 100,
        });

      expect(woRes.status).toBe(201);
      const woId = woRes.body.data.id;

      // Fetch Work Order details and inspect shortage calculation
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
      // Create WO in ASSIGNED status
      const createRes = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemMotor.id,
          requiredQuantity: 10,
        });

      const woId = createRes.body.data.id;
      expect(createRes.body.data.status).toBe('ASSIGNED');

      // Attempt invalid jump ASSIGNED -> COMPLETED (must be rejected)
      const invalidJump = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' });

      expect(invalidJump.status).toBe(400);
      expect(invalidJump.body.success).toBe(false);
      expect(invalidJump.body.message).toContain('Invalid status transition');

      // Valid transition: ASSIGNED -> IN_PROGRESS
      const step1 = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(step1.status).toBe(200);
      expect(step1.body.data.status).toBe('IN_PROGRESS');

      // Valid transition: IN_PROGRESS -> COMPLETED
      const step2 = await request(app)
        .patch(`/api/work-orders/${woId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' });

      expect(step2.status).toBe(200);
      expect(step2.body.data.status).toBe('COMPLETED');
    });
  });

  /**
   * TEST 8: Input Validation & Negative Inventory Prevention
   */
  describe('Input Validation & Boundary Invariant Enforcement', () => {
    it('rejects login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin.test@fundsroom.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects work order with non-positive quantity', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          locationId: setup.locNorth.id,
          itemId: setup.itemSteel.id,
          requiredQuantity: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects stock transfer with source and destination as same location', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locNorth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-SAME-LOC',
          quantity: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Source and destination locations cannot be the same');
    });
  });

  /**
   * TEST 9: Concurrent Transfer Dispatch Protection
   */
  describe('Concurrency Test: Simultaneous Stock Transfer Dispatches', () => {
    it('ensures two simultaneous dispatches cannot over-draw source physical inventory', async () => {
      // Source available = 50
      await prisma.inventory.create({
        data: {
          itemId: setup.itemSteel.id,
          locationId: setup.locNorth.id,
          batchNumber: 'BATCH-TRF-RACE',
          physicalQuantity: 50,
          reservedQuantity: 0,
        },
      });

      // Transfer A: 40 units
      const trfARes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-TRF-RACE',
          quantity: 40,
        });
      const trfAId = trfARes.body.data.id;

      // Transfer B: 40 units
      const trfBRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${opsToken}`)
        .send({
          sourceLocationId: setup.locNorth.id,
          destinationLocationId: setup.locSouth.id,
          itemId: setup.itemSteel.id,
          batchNumber: 'BATCH-TRF-RACE',
          quantity: 40,
        });
      const trfBId = trfBRes.body.data.id;

      // Dispatch simultaneously in parallel
      const [dispA, dispB] = await Promise.all([
        request(app).post(`/api/transfers/${trfAId}/dispatch`).set('Authorization', `Bearer ${opsToken}`),
        request(app).post(`/api/transfers/${trfBId}/dispatch`).set('Authorization', `Bearer ${opsToken}`),
      ]);

      const statuses = [dispA.status, dispB.status];
      // Exactly one dispatch must succeed (200) and one must fail (400)
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);

      // Verify physical stock at source was decremented by only 40 (50 - 40 = 10), never negative
      const srcInv = await prisma.inventory.findUnique({
        where: {
          itemId_locationId_batchNumber: {
            itemId: setup.itemSteel.id,
            locationId: setup.locNorth.id,
            batchNumber: 'BATCH-TRF-RACE',
          },
        },
      });

      expect(srcInv?.physicalQuantity).toBe(10);
    });
  });
});

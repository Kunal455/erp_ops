# Mini Operations ERP — Production Full-Stack Technical Case Study

A production-oriented Operations ERP application engineered with a focus on relational database consistency, row-level concurrency control, strict role-based access control (RBAC), and automated business workflows.

---

## 1. Project Overview

The **Mini Operations ERP** is an end-to-end operations platform designed to simulate industrial manufacturing and multi-warehouse supply chain operations. It manages inventory across distributed facilities, schedules work orders, computes material shortages in real-time, executes atomic inter-warehouse stock transfers, and processes customer sales orders with race-condition-proof stock reservations.

---

## 2. Business Workflow

```
Inventory (Warehouse stock per item/location/batch)
    ↓
Work Order (Admin creates production assembly job)
    ↓
Material Stock Check (Backend computes available stock vs required)
    ↓
Enough Stock?
    ↓
YES ──→ Continue assembly (ASSIGNED → IN_PROGRESS → COMPLETED)
    ↓
NO  ──→ Calculate Shortage: Shortage = max(Required - Available, 0)
          ↓
     Internal Stock Transfer Request (Origin → Destination)
          ↓
      Dispatch (Source physical decreases; Destination remains unchanged)
          ↓
       Receive (Destination physical increases; prevents double receipt)
          ↓
    Destination Stock Ready
          ↓
Customer Order (Sales user enters customer line items)
          ↓
Stock Reservation (Atomic row-level locked transaction: reservedQuantity increases, available decreases)
```

---

## 3. Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router v6, Axios, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database & Persistence**: MySQL 8.0 / Relational DB via **Prisma ORM**.
- **Authentication & Security**: JWT (JSON Web Tokens), bcrypt password hashing, HTTP Bearer tokens.
- **Validation**: Zod (strict request payload, query, and parameter schema enforcement).
- **Testing**: Jest + Supertest (comprehensive integration, RBAC, lifecycle, and concurrency race condition test suites).
- **API Documentation**: OpenAPI 3.0 / Swagger UI mounted at `/api/docs`.
- **Infrastructure**: Docker & Docker Compose for containerized MySQL persistence and Adminer GUI.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React SPA (Vite + TypeScript)               │
│  - AuthContext (JWT)  - Role Guards  - Responsive Tailwind  │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / REST APIs (Axios)
┌──────────────────────────────▼──────────────────────────────┐
│              Express.js API Gateway & Middlewares           │
│  - JWT Authenticate  - Role RBAC  - Zod Request Validator   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Service Layer (Business Logic)             │
│  - InventoryService   - WorkOrderService   - TransferService│
│  - OrderService       - AuthService                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma Client / Transactions
┌──────────────────────────────▼──────────────────────────────┐
│                 MySQL 8.0 Relational Database                │
│  - ACID Transactions  - Row-Level Locking (SELECT FOR UPDATE)│
│  - Foreign Keys       - Unique Multi-Column Indexes         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Folder Structure

```
Fundsroom2/
├── docker-compose.yml             # MySQL 8.0 and Adminer container services
├── README.md                      # Complete system documentation
├── backend/
│   ├── .env.example
│   ├── .env                       # Local environment variables
│   ├── jest.config.js             # Jest test runner configuration
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma          # Relational Prisma schema
│   │   └── seed.ts                # Database seed script for roles, items, and stock
│   ├── src/
│   │   ├── config/                # Environment config and Prisma singleton
│   │   ├── controllers/           # HTTP Request/Response handlers
│   │   ├── middlewares/           # JWT, Role RBAC, Zod, and Error Handler
│   │   ├── routes/                # Express API route definitions
│   │   ├── services/              # Transactional business logic
│   │   ├── utils/                 # Structured errors and helpers
│   │   ├── swagger.ts             # Swagger OpenAPI 3.0 documentation
│   │   ├── app.ts                 # Express application pipeline
│   │   └── server.ts              # HTTP Server entrypoint
│   └── tests/
│       ├── setup.ts               # Test database seeding and teardown
│       └── erp.test.ts            # Integration and Concurrency test suite
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts             # Vite config with backend API proxy
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── api/                   # Axios HTTP client with JWT interceptor
        ├── context/               # AuthContext state and role helpers
        ├── components/common/     # Navbar, Sidebar, ProtectedRoute
        ├── layouts/               # DashboardLayout shell
        ├── pages/                 # 5 Core Screens (Login, Inventory, WO, Transfer, Order)
        ├── types/                 # Frontend domain TypeScript definitions
        ├── App.tsx                # Route tree
        └── main.tsx
```

---

## 6. Database Setup

The application uses **Prisma ORM** with a fully normalized relational schema. To initialize the database:

```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

---

## 7. MySQL Setup (Docker Compose)

Start the containerized MySQL 8.0 database and Adminer web interface using Docker Compose:

```bash
# From the project root
docker compose up -d
```

- **MySQL Port**: `3306`
- **Database**: `fundsroom_erp`
- **User**: `erp_user`
- **Password**: `erp_password123`
- **Adminer DB Tool**: `http://localhost:8080`

---

## 8. Environment Variables

Create `.env` in the `backend/` directory:

```env
PORT=5000
DATABASE_URL="file:./dev.db" # Or mysql://erp_user:erp_password123@localhost:3306/fundsroom_erp
JWT_SECRET="mini-operations-erp-super-secret-key-2026"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

---

## 9. Prisma Setup & 10. Migrations

```bash
# Push schema updates to database
cd backend
npx prisma db push

# (Optional) Generate a named migration
npx prisma migrate dev --name init
```

---

## 11. Seed Data

To populate the database with default locations, master items, BOM relations, inventory batches, and user roles:

```bash
cd backend
npm run prisma:seed
```

### Pre-configured Test Accounts:
| Role | Email | Password | Allowed Modules |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@fundsroom.com` | `admin123` | All modules, Work Order creation, Status management |
| **OPERATIONS** | `ops@fundsroom.com` | `ops123` | Inventory Stock-In, Internal Transfers Dispatch & Receive |
| **SALES** | `sales@fundsroom.com` | `sales123` | Customer Orders creation, Stock Reservations |

---

## 12. Running Backend

```bash
cd backend
npm run dev
# Backend server runs at http://localhost:5000
# Swagger docs at http://localhost:5000/api/docs
```

---

## 13. Running Frontend

```bash
cd frontend
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 14. Running Tests

The test suite runs with **Jest and Supertest**, verifying all mandatory business rules and race conditions:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Test 1**: Cannot reserve more than available inventory.
- **Test 2**: Cannot transfer more than available inventory.
- **Test 3**: Destination stock increases only after transfer receipt (source reduces on dispatch).
- **Test 4**: Same transfer cannot be received twice (double-receive protection).
- **Test 5**: Role-based authorization enforcement (403 Forbidden for restricted endpoints).
- **Test 6**: Simultaneous parallel reservation race condition safety (`SELECT FOR UPDATE`).
- **Test 7**: Work Order Shortage formula calculation $\max(\text{Required} - \text{Available}, 0)$ & sequential state machine transitions (`ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`).
- **Test 8**: Input validation and negative balance rejection.
- **Test 9**: Concurrent stock transfer dispatch race condition safety.

---

## 15. Swagger / OpenAPI Documentation

Interactive Swagger OpenAPI 3.0 documentation is served at:
`http://localhost:5000/api/docs`

---

## 16. Authentication & 17. Roles (RBAC Matrix)

| Endpoint | Method | Admin | Operations | Sales | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `POST /api/auth/login` | POST | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| `GET /api/auth/me` | GET | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: 401 |
| `GET /api/inventory` | GET | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: 401 |
| `POST /api/inventory/stock-in` | POST | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `GET /api/work-orders` | GET | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/work-orders` | POST | :white_check_mark: | :x: 403 | :x: 403 | :x: 401 |
| `PATCH /api/work-orders/:id/status`| PATCH | :white_check_mark: | :x: 403 | :x: 403 | :x: 401 |
| `GET /api/transfers` | GET | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/transfers` | POST | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/transfers/:id/dispatch` | POST | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `POST /api/transfers/:id/receive` | POST | :white_check_mark: | :white_check_mark: | :x: 403 | :x: 401 |
| `GET /api/orders` | GET | :white_check_mark: | :x: 403 | :white_check_mark: | :x: 401 |
| `POST /api/orders` | POST | :white_check_mark: | :x: 403 | :white_check_mark: | :x: 401 |
| `POST /api/orders/:id/reserve` | POST | :white_check_mark: | :x: 403 | :white_check_mark: | :x: 401 |

---

## 18. Inventory Calculation & Invariants

$$\text{availableQuantity} = \text{physicalQuantity} - \text{reservedQuantity}$$
$$\text{shortage} = \max(\text{requiredQuantity} - \text{availableQuantity}, 0)$$

- **Invariant 1**: $\text{physicalQuantity} \ge 0$
- **Invariant 2**: $\text{reservedQuantity} \ge 0$
- **Invariant 3**: $\text{reservedQuantity} \le \text{physicalQuantity} \implies \text{availableQuantity} \ge 0$

---

## 19. Transfer Transaction Strategy

1. **Requested**: Creates a record with status `REQUESTED`. No physical stock changes occur.
2. **Dispatched**: Executed inside `prisma.$transaction`. Locks source inventory, verifies available stock $\ge$ transfer quantity, decrements source `physicalQuantity`, and sets status to `DISPATCHED`. Destination inventory is **not** increased.
3. **Received**: Executed inside `prisma.$transaction`. Verifies transfer status is currently `DISPATCHED` (preventing double receipt), increments destination `physicalQuantity`, and sets status to `RECEIVED`.

---

## 20. Reservation Concurrency Strategy

### The Race Condition
When available stock is 100, and two sales users attempt to reserve 80 units simultaneously in parallel, naive read-then-write code would allow both requests to pass ($80 + 80 = 160 > 100$), corrupting warehouse stock.

### Database Row-Level Locking Implementation
Within `OrderService.reserveOrderStock`, each line item reservation is wrapped inside an atomic transaction with row locking:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Fetch and acquire exclusive lock on inventory record
  const inventory = await tx.inventory.findUnique({
    where: { itemId_locationId_batchNumber: { itemId, locationId, batchNumber } },
  });

  const available = inventory.physicalQuantity - inventory.reservedQuantity;
  if (available < requestedQuantity) {
    throw new BadRequestError(`Insufficient available inventory. Required: ${requestedQuantity}, Available: ${available}`);
  }

  // 2. Atomic increment of reservedQuantity
  await tx.inventory.update({
    where: { id: inventory.id },
    data: { reservedQuantity: { increment: requestedQuantity } },
  });

  // 3. Mark line item as reserved & record audit ledger
  await tx.customerOrderItem.update({
    where: { id: item.id },
    data: { reservedQuantity: requestedQuantity },
  });
});
```

---

## 21. ER Diagram

```mermaid
erDiagram
    User ||--o{ WorkOrder : "assignedUser"
    User ||--o{ StockTransfer : "createdBy"
    User ||--o{ CustomerOrder : "createdBy"
    User ||--o{ InventoryTransaction : "performedBy"

    Category ||--o{ Item : "classifies"
    
    Item ||--o{ Inventory : "stored"
    Item ||--o{ WorkOrder : "target"
    Item ||--o{ StockTransfer : "transferred"
    Item ||--o{ CustomerOrderItem : "ordered"
    Item ||--o{ InventoryTransaction : "audit"

    Location ||--o{ Inventory : "houses"
    Location ||--o{ WorkOrder : "executes"
    Location ||--o{ StockTransfer : "sourceLocation"
    Location ||--o{ StockTransfer : "destinationLocation"
    Location ||--o{ CustomerOrder : "fulfills"

    CustomerOrder ||--|{ CustomerOrderItem : "contains"
```

---

## 22. API Overview

- `POST /api/auth/login` — Log in and receive JWT token
- `GET /api/auth/me` — Return current authenticated profile
- `GET /api/auth/users` — List registered users
- `GET /api/inventory` — List inventory with live available stock calculation
- `POST /api/inventory/stock-in` — Inward stock batch
- `GET /api/work-orders` — List work orders with computed shortages
- `POST /api/work-orders` — Create work order (Admin only)
- `PATCH /api/work-orders/:id/status` — Advance status (`ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`)
- `GET /api/transfers` — List stock transfers
- `POST /api/transfers` — Request stock transfer
- `POST /api/transfers/:id/dispatch` — Dispatch transfer (atomic source stock reduction)
- `POST /api/transfers/:id/receive` — Receive transfer (atomic destination stock credit)
- `GET /api/orders` — List customer orders
- `POST /api/orders` — Create customer order (Sales user)
- `POST /api/orders/:id/reserve` — Concurrency-safe stock reservation
- `POST /api/orders/:id/fulfill` — Fulfill customer order and consume stock
- `POST /api/orders/:id/cancel` — Cancel order and release reserved stock

# ⚡ FundsERP — Operations & Supply Chain Management System

A production-grade, full-stack Operations ERP application engineered with a focus on relational database consistency, strict Role-Based Access Control (RBAC), atomic multi-warehouse stock transfers, real-time BOM shortage calculations, and race-condition-proof inventory reservations.

---

## 🌐 Live Deployments & Quick Links

| Component | Provider / Platform | Live URL / Endpoint |
| :--- | :--- | :--- |
| **Frontend Application** | **Vercel** | [https://erp-ops.vercel.app](https://erp-ops.vercel.app/) |
| **Backend REST API** | **Render** | [https://erp-ops.onrender.com](https://erp-ops.onrender.com) |
| **Postman Collection & Workspace** | **Postman** | [Kunal's Workspace - Postman Collection](https://kk6547015-4843383.postman.co/workspace/kunal's-Workspace~c0e1ca57-4a75-4ba8-80ea-130865150004/request/46950697-a5f4423b-9ff8-48e7-9c79-3f8f0ffbb853?action=share&creator=46950697) |
| **Cloud Database** | **TiDB Cloud** | Managed Serverless MySQL 8.0 |
| **GitHub Repository** | **GitHub** | [https://github.com/Kunal455/erp_ops](https://github.com/Kunal455/erp_ops) |

---

## 🔑 Demo & Test Accounts

The system comes pre-seeded with dedicated accounts representing the three distinct operational roles:

| Role | Email | Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `kk6547015@gmail.com` | `12345678` | Work Orders (Create, Assign, Status State Machine), Material Shortage Analysis, System Visibility |
| **`ADMIN` (Demo)** | `admin@erp.com` | `admin123` | Secondary Admin Account |
| **`OPERATIONS_USER`** | `operations@erp.com` | `operations123` | Inventory Management (Stock Inward, Adjust), Stock Transfers (Create, Dispatch, Receive), View Shortages |
| **`SALES_USER`** | `sales@erp.com` | `sales123` | Customer Orders (Create Challans, Line Items), Concurrency-Safe Stock Reservations |

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

The system enforces strict authorization at the backend route middleware layer via `requireAuth` and `requireRole(...)`. Unauthorized operations return `401 Unauthorized`, and unauthorized roles return `403 Forbidden`.

| Operational Action | `ADMIN` | `OPERATIONS_USER` | `SALES_USER` | Backend Route & Guard |
| :--- | :---: | :---: | :---: | :--- |
| **User Authentication** | ✅ | ✅ | ✅ | `POST /api/auth/login`, `GET /api/auth/me` |
| **View Inventory Breakdown** | ✅ | ✅ | ✅ | `GET /api/inventory` |
| **Modify Inventory (Inward / Adjust)** | ❌ 403 | ✅ | ❌ 403 | `POST /api/inventory/stock-in`, `PATCH /api/inventory/adjust` |
| **View Work Orders** | ✅ | ✅ | ❌ 403 | `GET /api/work-orders` |
| **Create Work Order** | ✅ | ❌ 403 | ❌ 403 | `POST /api/work-orders` |
| **Update Work Order Status** | ✅ | ❌ 403 | ❌ 403 | `PATCH /api/work-orders/:id/status` |
| **View Material Shortages** | ✅ | ✅ | ❌ 403 | `GET /api/work-orders/stock-check/calculate` |
| **View Internal Transfers** | ✅ | ✅ | ❌ 403 | `GET /api/transfers` |
| **Create Internal Transfer** | ❌ 403 | ✅ | ❌ 403 | `POST /api/transfers` |
| **Dispatch Stock Transfer** | ❌ 403 | ✅ | ❌ 403 | `POST /api/transfers/:id/dispatch` |
| **Receive Stock Transfer** | ❌ 403 | ✅ | ❌ 403 | `POST /api/transfers/:id/receive` |
| **View Customer Orders** | ✅ | ❌ 403 | ✅ | `GET /api/orders` |
| **Create Customer Order** | ❌ 403 | ❌ 403 | ✅ | `POST /api/orders` |
| **Reserve Customer Stock** | ❌ 403 | ❌ 403 | ✅ | `POST /api/orders/:id/reserve` |

---

## ⚙️ Core Architecture & Technical Highlights

```
┌─────────────────────────────────────────────────────────────┐
│              React SPA Frontend (Vite + Tailwind)           │
│  - AuthContext (JWT)  - Role Guards  - Responsive UI        │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / REST APIs (Axios)
┌──────────────────────────────▼──────────────────────────────┐
│           Express.js API Gateway & Middlewares              │
│  - JWT Bearer Auth   - Role RBAC   - Zod Schema Validation  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             Service Layer (Pure JS Business Logic)          │
│  - InventoryService   - WorkOrderService   - TransferService│
│  - OrderService       - AuthService                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma Client / Transactions
┌──────────────────────────────▼──────────────────────────────┐
│                MySQL 8.0 / TiDB Cloud Database              │
│  - ACID Transactions  - Compare-And-Swap (CAS) Concurrency  │
│  - Foreign Keys       - Unique Multi-Column Indexes         │
└─────────────────────────────────────────────────────────────┘
```

### 1. Concurrency & Race-Condition Safe Stock Reservations
When available stock is limited, simultaneous reservation requests by multiple sales representatives are handled safely through atomic transactions with Compare-And-Swap (CAS) bounds:
$$\text{availableQuantity} = \text{physicalQuantity} - \text{reservedQuantity}$$
Over-reservation is rejected with a descriptive error.

### 2. Two-Phase Verified Inter-Warehouse Stock Transfers
- **REQUESTED**: Transfer created. No inventory moves between warehouses.
- **DISPATCHED**: Source inventory `physicalQuantity` decreases atomically. Destination stock is untouched because materials are in transit.
- **RECEIVED**: Destination inventory `physicalQuantity` increases upon arrival. Double-receipt is rejected (`409 Conflict`).

### 3. Automated BOM Material Shortage Calculation
When an Admin schedules a production Work Order for finished goods (e.g. Electric Motor), the system calculates component requirements based on the Bill of Materials (BOM) and flags shortages:
$$\text{Shortage} = \max(\text{Required Quantity} - \text{Available Quantity}, 0)$$

---

## 🧪 Automated Testing Suite (25/25 Passing)

The backend includes a comprehensive Jest test suite verifying the complete RBAC permission matrix, lifecycle state machines, and concurrency safety:

```bash
cd backend
npm test
```

```text
PASS tests/erp.test.js
  Mini Operations ERP - Role-Based Authorization & Verification Test Suite
    Permission Matrix: Role-Based Authorization Tests
      √ 1. ADMIN can create Work Order
      √ 2. OPERATIONS_USER cannot create Work Order (403 Forbidden)
      √ 3. SALES_USER cannot create Work Order (403 Forbidden)
      √ 4. OPERATIONS_USER can modify Inventory (stock-in & adjust)
      √ 5. SALES_USER cannot modify Inventory (403 Forbidden)
      √ 6. OPERATIONS_USER can dispatch Transfer
      √ 7. SALES_USER cannot dispatch Transfer (403 Forbidden)
      √ 8. OPERATIONS_USER can receive Transfer
      √ 9. SALES_USER cannot receive Transfer (403 Forbidden)
      √ 10. SALES_USER can create Customer Order
      √ 11. SALES_USER can reserve stock
      √ 12. ADMIN cannot reserve stock (403 Forbidden)
      √ 13. Unauthenticated user receives 401 Unauthorized
      √ 14. Authenticated user with wrong role receives 403 Forbidden
    Mandatory Test: Inventory Reservation Bounds
      √ should REJECT reservation when requested quantity exceeds available inventory
    Mandatory Test: Transfer Lifecycle & Double-Receipt Prevention
      √ reduces source on dispatch, keeps destination untouched before receipt, and increases destination on receipt
      √ rejects double-receipt on already received transfer
    Concurrency & Race-Condition Safety
      √ ensures two simultaneous reservation requests cannot exceed available inventory
      √ ensures two simultaneous dispatches cannot over-draw source physical inventory
    Work Order Shortage Calculation & Status State Machine
      √ calculates shortage accurately: shortage = max(required - available, 0)
      √ enforces sequential status transitions: ASSIGNED -> IN_PROGRESS -> COMPLETED
    User Registration & Authentication Lifecycle
      √ should register a new user successfully and return a valid JWT token
      √ should reject public signup creating an ADMIN account (403 Forbidden)
      √ should reject signup with duplicate email address (409 Conflict)
      √ should reject signup with short password (< 6 chars)

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        2.075 s
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18+)
- MySQL 8.0 (Local instance, Docker, or TiDB Cloud)

### 1. Clone Repository
```bash
git clone https://github.com/Kunal455/erp_ops.git
cd erp_ops
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
# Create .env file with DATABASE_URL, JWT_SECRET, PORT

# Generate Prisma Client & Push Database Schema
npx prisma generate
npx prisma db push

# Seed initial users, locations, items, and sample orders
npm run prisma:seed

# Start development server
npm run dev
# Backend runs at http://localhost:5000
# Swagger API docs at http://localhost:5000/api/docs
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start development server
npm run dev
# Frontend runs at http://localhost:5173
```

---

## ☁️ Cloud Deployment Guide

### 1. Database: TiDB Cloud (Serverless MySQL)
1. Create a free cluster on [TiDB Cloud](https://tidbcloud.com/).
2. Select **Prisma** in the connection dialog and copy the connection string.
3. Use `/test` as the database name:
   ```text
   mysql://<user>.<prefix>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/test?sslaccept=strict
   ```

### 2. Backend: Render Web Service
1. Connect `Kunal455/erp_ops` on [Render](https://render.com/).
2. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push`
   - **Start Command**: `node src/server.js`
3. Environment Variables:
   - `DATABASE_URL`: *Your TiDB Cloud connection string*
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `fundsroom-erp-super-secure-production-jwt-secret-2026`
   - `JWT_EXPIRES_IN`: `7d`

### 3. Frontend: Vercel SPA
1. Import `Kunal455/erp_ops` on [Vercel](https://vercel.com/).
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework**: `Vite`
3. Environment Variables:
   - `VITE_API_URL`: `https://fundsroom-erp-backend.onrender.com` *(without trailing slash)*

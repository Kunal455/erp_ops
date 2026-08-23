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

The system is pre-seeded with dedicated accounts for each operational role (Password: `12345678` for all):

| Role | Email | Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `kk6547015@gmail.com` | `12345678` | Work Orders (Create, Assign, Status State Machine), Material Shortage Analysis, System Visibility |
| **`OPERATIONS_USER`** | `rohan@gmail.com` | `12345678` | Inventory Management (Stock Inward, Adjust), Stock Transfers (Create, Dispatch, Receive), View Shortages |
| **`SALES_USER`** | `rahul@gmail.com` | `12345678` | Customer Orders (Create Challans, Line Items), Concurrency-Safe Stock Reservations |

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router DOM v6.
- **Backend API**: Node.js, Express.js, REST API Architecture.
- **Database & ORM**: MySQL 8.0 / TiDB Cloud Serverless MySQL via **Prisma ORM**.
- **Authentication & Security**: JWT (JSON Web Tokens), bcryptjs password hashing, role middleware route guards (`requireRole`).
- **Validation**: Zod (strict request payload, query, and parameter schema enforcement).
- **Testing**: Jest + Supertest (comprehensive RBAC, lifecycle, shortage formula, and concurrency race condition test suites).

---

## 💻 Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Kunal455/erp_ops.git
cd erp_ops
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

---

## 🗄️ Database Setup

The project uses **Prisma ORM** with a relational MySQL schema.

```bash
cd backend

# 1. Generate Prisma Client
npx prisma generate

# 2. Push Schema to Database (Local MySQL or Cloud TiDB)
npx prisma db push

# 3. Seed Initial Users, Locations, Items, BOM & Inventory Batches
npm run prisma:seed
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL="mysql://<user>.<prefix>:<password>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict"
JWT_SECRET="fundsroom-erp-super-secure-production-jwt-secret-2026"
JWT_EXPIRES_IN="7d"
NODE_ENV="production"
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL="https://erp-ops.onrender.com"
```

---

## 🚀 How to Run

### 1. Start Backend Server
```bash
cd backend
npm run dev
# Server running at: http://localhost:5000
```

### 2. Start Frontend Application
```bash
cd ../frontend
npm run dev
# Application accessible at: http://localhost:5173
```

---

## 🧪 How to Test

### Automated Testing Suite (25/25 Tests Passing)

Run the full automated test suite using Jest:

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
Snapshots:   0 total
Time:        2.63 s
```

### Manual End-to-End Testing Flow

1. **Test 1 (Over-Reservation Rejection)**: Log in as `rahul@gmail.com` $\rightarrow$ Create Customer Order with quantity higher than available stock $\rightarrow$ Click **"Reserve Stock"** $\rightarrow$ Verify rejection with `"Insufficient available inventory"`.
2. **Test 2 (Over-Transfer Rejection)**: Log in as `rohan@gmail.com` $\rightarrow$ Go to **Stock Transfers** $\rightarrow$ Request transfer higher than source stock $\rightarrow$ Verify rejection.
3. **Test 3 (Two-Phase Transfer Timing)**: Create transfer of 20 units from Warehouse North to Plant South $\rightarrow$ Click **"Dispatch"** (Source stock drops by 20; Destination remains unchanged) $\rightarrow$ Click **"Receive"** (Destination stock increases by 20).
4. **Test 4 (Double-Receipt Prevention)**: Verify Receive button disappears after receipt and subsequent API calls return `400/409 Conflict`.
5. **Test 5 (RBAC Security)**: Verify Operations User cannot create Work Orders or Customer Orders (`403 Forbidden`), and Sales User cannot modify physical stock.

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

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

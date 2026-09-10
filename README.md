# Expense Splitter — Group Expense Management & Debt Simplification

A full-stack expense-splitting application (Splitwise-style) that lets groups track shared expenses, split them flexibly (equal, exact, or percentage-based), and settle up using a debt-simplification algorithm that minimizes the number of payments needed.

> ✅ **Status:** Completed — All 15 days of the build plan are complete (full backend, frontend UI, PDF export, testing, Tailwind UI polish, and deployment configuration).

---

## Problem

Splitting shared expenses within a group — trips, roommates, events — usually ends in a tangle of "who owes who" that's hard to track and even harder to settle efficiently. Manually reconciling who should pay whom often results in far more transactions than necessary.

**Expense Splitter** solves this by tracking every expense and its split, computing each member's real-time balance, and running a debt-simplification algorithm that reduces a group's tangled debts into the minimum number of payments required to settle everyone up.

---

## Features

- User authentication (JWT + bcrypt password hashing) <br>
- Groups with multiple members <br>
- Flexible expense splitting: **EQUAL**, **EXACT**, and **PERCENTAGE** split types, with full input validation <br>
- Real-time balance calculation per group member (`total_paid − total_owed`) <br>
- **Debt-simplification algorithm** — greedily matches the largest creditor with the largest debtor to minimize settlement transactions <br>
- Settlement recording with automatic balance adjustment <br>
- Settlement history per group <br>
- Route-protected frontend with persistent JWT sessions <br>

**Planned (see [Roadmap](#roadmap)):** group/expense/balance UI, PDF settlement export, deployment.

---

## Tech Stack

### Frontend
- React (Vite) <br>
- React Router <br>
- Fetch-based API client with JWT auto-attach <br>
- React Context for auth state <br>

### Backend
- Node.js + Express <br>
- PostgreSQL (via `pg`) <br>
- JSON Web Tokens (JWT) <br>
- Bcrypt (password hashing) <br>
- CORS + dotenv <br>

---

## Folder Structure

```
expense-splitter/
├── backend/
│   ├── schema.sql
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   └── db.js                  # Postgres connection pool
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── groupsController.js
│       │   ├── expensesController.js
│       │   ├── balancesController.js
│       │   └── settlementsController.js
│       ├── services/
│       │   └── balanceService.js      # shared balance-calculation logic
│       ├── utils/
│       │   └── debtSimplifier.js      # debt-simplification algorithm
│       ├── middleware/
│       │   └── auth.js                # JWT verification middleware
│       ├── routes/
│       │   ├── auth.js
│       │   ├── groups.js
│       │   └── settlements.js
│       └── index.js
│
└── frontend/
    ├── public/
    └── src/
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── ProtectedRoute.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   └── DashboardPage.jsx
        ├── api.js                     # fetch wrapper, attaches JWT
        ├── App.jsx
        └── main.jsx
```

---

## Database Schema

```sql
users            (id, name, email, password_hash, created_at)
groups           (id, name, created_by, created_at)
group_members    (id, group_id, user_id, joined_at)
expenses         (id, group_id, paid_by, description, amount, split_type, created_at)
expense_splits   (id, expense_id, user_id, share_amount)
settlements      (id, group_id, from_user, to_user, amount, status, settled_at)
```

`split_type` is one of `EQUAL`, `EXACT`, or `PERCENTAGE`. `settlements.status` is `PENDING` or `PAID`.

---

## API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in, returns JWT |
| GET | `/api/auth/me` | Get the logged-in user from their token |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | List the logged-in user's groups |
| POST | `/api/groups/:id/members` | Add a member to a group by email |
| POST | `/api/groups/:id/expenses` | Add an expense (EQUAL / EXACT / PERCENTAGE split) |
| GET | `/api/groups/:id/expenses` | List a group's expenses with splits |
| GET | `/api/groups/:id/balances` | Net balance per group member |
| GET | `/api/groups/:id/settlements` | Simplified settlement suggestions (debt-simplification output) |
| POST | `/api/settlements` | Record a settlement as paid |
| GET | `/api/groups/:id/settlements/history` | Settlement history for a group |
| GET | `/api/groups/:id/settlements/pdf` | *(planned)* Export settlement summary as PDF |

All routes except `/api/auth/register` and `/api/auth/login` require an `Authorization: Bearer <token>` header.

---

## Debt-Simplification Algorithm

The standout piece of this project — instead of everyone paying everyone, the group settles up with the minimum number of transactions:

1. Compute each member's net balance: `total_paid − total_owed` (adjusted for any settlements already paid).
2. Split members into **creditors** (positive balance — owed money) and **debtors** (negative balance — owe money).
3. Greedily match the largest creditor with the largest debtor, settle the smaller of the two amounts, and repeat until every balance is ~0.

This is the classic *minimum cash flow* heuristic: it collapses a tangle of pairwise debts (A owes B, B owes C, C owes A) into a small set of direct payments, and scales well for realistic group sizes.

---

## Installation & Setup — Locally

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL
- Git

### Clone the Repository

```bash
git clone https://github.com/<your-username>/expense-splitter.git
cd expense-splitter
```

### Set Up the Database

```bash
createdb expense_splitter
psql -d expense_splitter -f backend/schema.sql
```

### Set Up the Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
DATABASE_URL=postgres://your_user:your_password@localhost:5432/expense_splitter
JWT_SECRET=change_this_to_a_random_string
```

Run it:

```bash
npm run dev
```

Backend runs at `http://localhost:4000`. Confirm with `GET /api/health`.

### Set Up the Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

```
VITE_API_URL=http://localhost:4000/api
```

Run it:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Architecture

```
┌──────────────────────────┐
│   React Frontend         │
│   http://localhost:5173  │
└────────────┬──────────────┘
             │ REST API (JWT auth)
             ▼
┌──────────────────────────┐
│  Node.js + Express API   │
│  http://localhost:4000   │
└────────────┬──────────────┘
             │
             ▼
     ┌───────────────┐
     │  PostgreSQL   │
     └───────────────┘
```

---

## Roadmap

Built to a strict 15-day, 2-hours/day schedule. Completed so far:

- [x] Day 1 — Project skeleton, schema, Postgres connection
- [x] Day 2 — Auth backend (register/login, bcrypt, JWT)
- [x] Day 3 — Groups backend (create, list, add members)
- [x] Day 4 — Expenses backend (EQUAL split)
- [x] Day 5 — EXACT and PERCENTAGE splits + validation
- [x] Day 6 — Balance calculation
- [x] Day 7 — Debt-simplification algorithm
- [x] Day 8 — Settlement APIs (record, history, balance adjustment)
- [x] Day 9 — Frontend routing, auth pages, JWT context

- [x] Day 10 — Group creation/list/member UI
- [x] Day 11 — Expense form + list UI
- [x] Day 12 — Balances + simplified settlements UI
- [x] Day 13 — PDF settlement export
- [x] Day 14 — Integration testing, rounding/edge-case fixes
- [x] Day 15 — UI polish, deployment, final docs

**Explicitly out of scope** (kept out to preserve the timeline — future work): multi-currency support, push notifications, OAuth login.

---

## License

MIT

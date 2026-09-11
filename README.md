# Expense Splitter — Group Expense Management & Debt Simplification

**Expense Splitter** is a full-stack app that lets groups track shared expenses, split them flexibly (equal, exact, or percentage-based), and settle up using a debt-simplification algorithm that reduces a group's tangled debts into the minimum number of payments needed.

**LIVE:** [https://expense-splitter-weld-eight.vercel.app/](https://expense-splitter-weld-eight.vercel.app/) <br>
**API health check:** `https://expense-splitter-qr89.onrender.com/api/health`

---

## Problem

Splitting shared expenses within a group — trips, roommates, events — usually ends in a tangle of "who owes who" that's hard to track and even harder to settle efficiently. Manually reconciling who should pay whom often results in far more transactions than necessary.

Expense Splitter tracks every expense and its split, computes each member's real-time balance, and runs a debt-simplification algorithm that collapses a group's tangled debts into the minimum set of payments required to settle everyone up.

---

## Screenshots

**Log in**
![Login](./screenshots/login.png)

**Add a member / add an expense with a split-type selector**
![Add expense](./screenshots/add-expense.png)

**Expenses list with per-member split breakdown**
![Expenses](./screenshots/expenses.png)

**Balances — the personalized "you owe / you're owed" summary**
![Balances](./screenshots/balances.png)

**Settle up — the debt-simplification output, with a settle action and PDF export**
![Settle up](./screenshots/settle-up.png)

**Exported settlement summary PDF**
![PDF export](./screenshots/pdf-export.png)

---

## Features

User authentication (JWT + bcrypt password hashing) <br>
Groups with multiple members <br>
Flexible expense splitting — **EQUAL**, **EXACT**, and **PERCENTAGE**, with full input validation <br>
Real-time balance calculation per group member (`total_paid − total_owed`) <br>
**Debt-simplification algorithm** — greedily matches the largest creditor with the largest debtor to minimize settlement transactions <br>
Settlement recording with automatic balance adjustment <br>
Settlement history per group <br>
PDF export of the settlement summary <br>
Route-protected frontend with persistent JWT sessions <br>

---

## Usage Instructions

### Step 1
Go to the [live app](https://expense-splitter-weld-eight.vercel.app/) and register an account (or log in if you already have one).

### Step 2
Create a group from the dashboard, then add members by email — the person needs to already have an account, so have them register first if they don't.

### Step 3
Add expenses to the group. Pick a split type — **EQUAL** divides evenly, **EXACT** lets you enter each person's exact share, **PERCENTAGE** lets you enter each person's share as a percentage. The form shows a live "remaining" indicator so you can see the split balance before submitting.

### Step 4
Open the **Balances** section to see who owes what, and **Settle up** to see the minimum set of payments needed to close out the group. If you're the payer or recipient of a suggested payment, you can mark it as settled directly from the UI.

### Step 5
Use **Export PDF** to download a settlement summary you can share with the group.

---

## Tech Stack

### Frontend
- React (Vite) <br>
- React Router <br>
- Tailwind CSS (custom "ledger" design tokens) <br>
- Fetch-based API client with JWT auto-attach and authenticated blob downloads <br>

### Backend
- Node.js + Express <br>
- PostgreSQL (via `pg`) <br>
- JSON Web Tokens (JWT) <br>
- Bcrypt (password hashing) <br>
- pdfkit (PDF generation) <br>
- CORS + dotenv <br>

### Infrastructure
- **Frontend:** Vercel <br>
- **Backend:** Render <br>
- **Database:** Neon (serverless Postgres) <br>

---

## Folder Structure

```
expense-splitter/
├── backend/
│   ├── schema.sql
│   ├── package.json
│   ├── .env.example
│   ├── tests/
│   │   └── rounding.test.mjs           # pure unit tests, no DB required
│   └── src/
│       ├── config/
│       │   └── db.js                   # Postgres pool (SSL in production)
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── groupsController.js
│       │   ├── expensesController.js
│       │   ├── balancesController.js
│       │   └── settlementsController.js
│       ├── services/
│       │   └── balanceService.js       # shared balance-calculation query
│       ├── utils/
│       │   ├── splitCalculator.js      # EQUAL / EXACT / PERCENTAGE split math
│       │   └── debtSimplifier.js       # debt-simplification algorithm
│       ├── middleware/
│       │   └── auth.js                 # JWT verification
│       ├── routes/
│       │   ├── auth.js
│       │   ├── groups.js
│       │   └── settlements.js
│       └── index.js
│
└── frontend/
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── ProtectedRoute.jsx
        │   ├── ExpenseForm.jsx
        │   ├── ExpenseList.jsx
        │   ├── BalancesView.jsx
        │   └── SettlementsView.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   └── GroupDetailPage.jsx
        ├── api.js                      # fetch wrapper (JWT + blob downloads)
        ├── App.jsx
        └── main.jsx
```

---

## Debt-Simplification Algorithm

The standout piece of this project — instead of everyone paying everyone, the group settles up with the minimum number of transactions.

**It works by:**

Computing each member's net balance: `total_paid − total_owed`, adjusted for any settlements already paid <br>
Splitting members into **creditors** (owed money) and **debtors** (owe money) <br>
Greedily matching the largest creditor with the largest debtor, settling the smaller of the two amounts, and repeating until every balance is ~0 <br>

This is the classic *minimum cash flow* heuristic — it collapses a tangle of pairwise debts (A owes B, B owes C, C owes A) into a small set of direct payments. Worth noting: guaranteeing the mathematically absolute minimum transaction count in every possible case is an NP-hard problem, but greedy matching gets there or very close to it for realistic group sizes.

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

`split_type` is one of `EQUAL`, `EXACT`, or `PERCENTAGE`. `settlements.status` is `PENDING` or `PAID`. All monetary columns are `NUMERIC(10,2)`.

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
| GET | `/api/groups/:id/settlements` | Simplified settlement suggestions |
| POST | `/api/settlements` | Record a settlement as paid |
| GET | `/api/groups/:id/settlements/history` | Settlement history for a group |
| GET | `/api/groups/:id/settlements/pdf` | Export settlement summary as PDF |

All routes except `/api/auth/register` and `/api/auth/login` require an `Authorization: Bearer <token>` header.

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
```

Create a `.env` file in the `backend` directory:

```
PORT=4000
DATABASE_URL=postgres://your_user:your_password@localhost:5432/expense_splitter
JWT_SECRET=change_this_to_a_random_string
NODE_ENV=development
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
```

Create a `.env` file in the `frontend` directory:

```
VITE_API_URL=http://localhost:4000/api
```

Run it:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Run the Test Suite

```bash
cd backend
node tests/rounding.test.mjs
```

---

## Architecture

```
┌───────────────────────────┐
│   React Frontend (Vercel) │
│   expense-splitter-       │
│   weld-eight.vercel.app   │
└─────────────┬──────────────┘
              │ REST API (JWT auth, CORS-locked)
              ▼
┌───────────────────────────┐
│   Express API (Render)    │
└─────────────┬──────────────┘
              │ SSL connection
              ▼
     ┌──────────────────┐
     │  Postgres (Neon)  │
     └──────────────────┘
```

---

## Design Notes

The UI follows a deliberate "ledger, not dashboard" direction:

Lora (serif) for headings, IBM Plex Sans for body/UI — an editorial, statement-like feel <br>
Tabular numbers throughout so money figures align in columns <br>
A functional color system — emerald for money owed *to* you, brick red for money you owe, gold reserved as a single highlight per screen (the PDF export action) <br>
Thin borders over soft shadows, modest corner radii, sentence-case section labels <br>

---

## Build Log

Built to a strict 15-day, 2-hours/day schedule:

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
- [x] Day 11 — Expense form with split-type selector, expense list UI
- [x] Day 12 — Balances + simplified settlements UI (settle-up action)
- [x] Day 13 — PDF settlement export
- [x] Day 14 — Rounding/edge-case fixes, extracted + unit-tested split logic
- [x] Day 15 — Tailwind UI polish, deployment (Vercel/Render/Neon), final docs

**Explicitly out of scope** (kept out to preserve the timeline — future work): multi-currency support, push notifications, OAuth login, real-time updates, mobile app.

---

## License

MIT

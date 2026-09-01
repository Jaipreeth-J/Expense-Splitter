# Expense Splitter

15-day build, 2 hrs/day. Stack: React (Vite), Node/Express, PostgreSQL.

## Day 1 setup

### 1. Database
```bash
createdb expense_splitter
psql -d expense_splitter -f backend/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # then edit DATABASE_URL to match your Postgres user/password
npm run dev
```
Visit http://localhost:4000/api/health — you should see `{"status":"ok"}` and a "Postgres connected" log line in the terminal.

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Visit the URL Vite prints (usually http://localhost:5173).

## Scope (locked for the 15 days)
1. Groups + members
2. Add expenses with flexible splits (equal / exact / percentage)
3. Debt-simplification algorithm (minimizes settlement transactions — the interview talking point)
4. Settlement recording + PDF export

Not in scope: multi-currency, notifications, OAuth — list these as future work in the final README.

## Day-by-day plan
See the original 15-day plan for the full schedule. Day 1 is: finalize requirements, ER diagram, run schema, project skeleton — all done above.

-- Expense Splitter — Day 1 schema
-- Run with: psql -U your_user -d expense_splitter -f schema.sql

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  paid_by INTEGER REFERENCES users(id),
  description VARCHAR(255),
  amount NUMERIC(10,2) NOT NULL,
  split_type VARCHAR(20) DEFAULT 'EQUAL', -- EQUAL / EXACT / PERCENTAGE
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE expense_splits (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  share_amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE settlements (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id),
  from_user INTEGER REFERENCES users(id),
  to_user INTEGER REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING / PAID
  settled_at TIMESTAMP
);

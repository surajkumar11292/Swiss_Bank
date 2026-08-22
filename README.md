<div align="center">

# 🏦 Swiss Bank
### Private Banking & Wealth Management System

A session-authenticated, double-entry ledger banking application built on the **PERN stack (PostgreSQL, Express.js, React.js, Node.js)**.

<br/>

![Node.js](https://img.shields.io/badge/Node.js-v20+-68A063?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

</div>

<br/>

## 📌 About The Project

**Swiss Bank** is an institutional-grade, session-authenticated banking web application providing multi-account management, atomic transfers with row-level locks, double-entry ledger statements, automated card issuance, bill payments, and administrative fraud hold triage.

---

## ✨ Features

- 🔐 **Accounts & Security**:
  - Secure session-based authentication (`express-session` with PostgreSQL store).
  - BCrypt-hashed passwords and 4–6 digit transaction PINs.
  - Multi-account isolation per client with independent PIN protection.
  - Hardware / App-based 2FA TOTP (Google Authenticator, Authy).
- 💸 **Money Movement & Ledger**:
  - Double-entry ledger architecture: every money movement creates immutable `CREDIT` and `DEBIT` entries with running balance reconciliation.
  - Atomic transfer execution with deterministic account sequencing to prevent deadlocks and race conditions.
  - 2FA threshold enforcement for high-value transfers (≥ ₹50,000).
- 🧾 **Statements & Bill Payments**:
  - Paginated account statement with credit/debit color coding.
  - Full statement CSV export (unpaginated).
  - Direct ledger debits for utility bills (Electricity, Mobile, Broadband, Water, Gas).
- 💳 **Virtual Cards & Controls**:
  - Lazy card issuance on account creation.
  - Instant freeze/unfreeze, contactless NFC, and online shopping toggles.
  - Replacement debit card request workflow.
- 🛡️ **Executive Admin Console**:
  - Bank-wide telemetry & metrics.
  - User registry with instantaneous fraud hold / account freeze controls.
  - Support ticket triage and resolution queue.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Custom CSS Design System |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (Neon Cloud / Local) |
| **ORM** | Prisma ORM |
| **Authentication** | `express-session`, `connect-pg-simple`, `bcryptjs`, `otplib` (RFC 6238 TOTP) |
| **Testing** | Jest, Supertest |

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Environment Configuration

Create `server/.env` with your PostgreSQL database URL:

```env
DATABASE_URL="postgresql://username:password@ep-xyz.region.neon.tech/neondb?sslmode=require"
PORT=8080
SESSION_SECRET="swiss_bank_super_secret_session_key_2026"
NODE_ENV=development
```

### 3. Sync Database & Seed Demo Accounts

```bash
cd server
# Push schema to PostgreSQL
npx prisma db push

# Seed initial accounts
npm run seed
```

### 4. Run the Application

In two separate terminals:

```bash
# Terminal 1: Run Backend API (Port 8080)
cd server
npm run dev

# Terminal 2: Run Frontend UI (Port 5173)
cd client
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

---

## 🔑 Seeded Demo Credentials

| Role | Email | Password | PIN | Description |
|---|---|---|---|---|
| **Client** | `demo@bank.app` | `demo12345` | `1234` | 2 accounts (₹50,000 & ₹12,500), saved payee, bill history |
| **Recipient** | `priya@example.com` | `password123` | `5678` | ₹8,000 balance |
| **Admin** | `admin@bank.app` | `admin12345` | — | Access to `/admin` executive console |

---

## 🧪 Automated Testing

```bash
cd server
npm test
```

Runs the Supertest integration test suite covering:
- 401 Unauthenticated access rejection
- User registration, login, and account creation
- Atomic transfer and double-entry ledger verification
- Insufficient balance and invalid PIN rejections
- Cross-user ownership authorization guards

---

## 📄 License

Distributed under the **MIT License**.
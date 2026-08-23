# Swiss Bank — Modern PERN Banking Platform

A session-authenticated, enterprise-grade banking web application built with the **PERN stack (PostgreSQL, Express.js, React, Node.js)** featuring a double-entry ledger engine, ACID-compliant row-locked transfers, 2FA TOTP authentication, and a custom financial design system.

---

## 📌 Overview

**Swiss Bank** provides a secure, full-featured digital banking experience: user registration, session sign-in, opening and managing multiple accounts, instant peer-to-peer transfers, deposits, withdrawals, beneficiary management, utility bill payments, debit card controls, and customer support ticket tracking.

Every financial movement is recorded in an immutable **double-entry ledger** with calculated running balances, ensuring balance reconciliation and zero floating-point inaccuracies.

---

## ✨ Features

### 🔐 Accounts & Authentication
- **Session-Based Security**: Express sessions with HTTP-only, `SameSite` cookies and proxy trust configuration.
- **Cryptographic Protection**: Passwords and 4–6 digit transaction PINs hashed using **BCrypt**.
- **Multi-Account Ownership**: Users can open and manage multiple accounts under a single profile.
- **Two-Factor Authentication (2FA)**: Time-based One-Time Passwords (TOTP) supported via Google Authenticator or Authy.
- **Resource Ownership Verification**: Every account, card, payee, and transaction operation strictly validates session user ownership.

### 💸 Money Movement & Ledger Engine
- **Row-Level Transaction Locking**: Database transactions acquire row locks in deterministic order (lowest account number first) to prevent race conditions and deadlocks.
- **Double-Entry Bookkeeping**: Every transfer generates linked `DEBIT` and `CREDIT` legs with persisted `balanceAfter` snapshots.
- **Saved Beneficiaries**: Instant 1-click payee selection for recurring transfers.
- **Precision Calculations**: Uses decimal precision for all currency calculations.

### 🧾 Statements, Cards & Utilities
- **Paginated Statements & CSV Export**: Real-time transaction history with full CSV download capabilities.
- **Virtual Debit Cards**: Instant card issuance with real-time controls (card freeze toggle, contactless NFC toggle, online e-commerce toggle, and replacement ordering).
- **Bill Pay & Recharge**: Integrated payment portal for electricity, mobile recharges, water, and broadband bills.
- **Support Desk**: In-app ticketing system to submit and monitor customer service queries.

### 🎨 User Interface & Experience
- **Theme Switcher**: Instant switching between Light, Dark, and System modes with zero visual flash.
- **Responsive Layout**: Designed for seamless usage across desktop, tablet, and mobile devices.
- **Real-Time Calculators**: In-browser calculators for Fixed/Recurring Deposits (FD/RD) and Loan EMI instalments.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router, Custom CSS Design System |
| **Backend** | Node.js (v20+), Express.js |
| **Database & ORM** | PostgreSQL (hosted on Neon), Prisma ORM |
| **Authentication & Security** | express-session, BCrypt, TOTP (speakeasy), Helmet, CORS |
| **Testing** | Jest, Supertest integration suite |
| **Deployment** | Frontend on Vercel · Backend API on Render |

---

## 🏗️ Architecture

```
┌─────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│  React Client   │ ────> │  Express.js API Layer │ ────> │  Prisma ORM & Services  │ ────> │  PostgreSQL Database   │
│  (Vite + CSS)   │ <──── │  (Session & Routing)  │ <──── │  (Double-Entry Ledger) │ <──── │  (Neon Cloud Instance) │
└─────────────────┘       └───────────────────────┘       └────────────────────────┘       └────────────────────────┘
```

---

## 📂 Project Structure

```
Swiss_Bank/
├── client/
│   ├── src/
│   │   ├── components/      # Common UI components, modals, toasts
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── pages/           # LoginPage, DashboardPage, AdminPage
│   │   ├── services/        # api.js client wrapper & utilities
│   │   └── styles/          # bank.css, admin.css
│   ├── index.html
│   ├── package.json
│   ├── vercel.json          # Reverse proxy rewrites for /api
│   └── vite.config.js
├── server/
│   ├── controllers/         # authController, accountController, cardController...
│   ├── middleware/          # authMiddleware, session
│   ├── prisma/              # schema.prisma, migrations, seed.js
│   ├── routes/              # apiRouter endpoints
│   ├── services/            # accountService, ledgerService, 2faService...
│   ├── tests/               # banking.test.js integration suite
│   ├── app.js
│   ├── server.js
│   └── package.json
├── .env.example
├── README.md
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js (v20 or higher)**
- **npm** (v10+)
- **PostgreSQL Database** (Neon or local instance)

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/surajkumar11292/Swiss_Bank.git
   cd Swiss_Bank
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root or `server/` directory based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://username:password@ep-sample.neon.tech/neondb?sslmode=require"
   SESSION_SECRET="your-secure-session-secret"
   NODE_ENV="development"
   PORT=5000
   ```

3. **Install & Initialize Backend**:
   ```bash
   cd server
   npm install
   npx prisma generate
   npx prisma db push
   node prisma/seed.js
   npm run dev
   ```

4. **Install & Start Frontend** (in a separate terminal):
   ```bash
   cd client
   npm install
   npm run dev
   ```

5. **Open Application**:
   Navigate to `http://localhost:5173/` in your browser.

---

## 🔑 Demo Credentials

A pre-populated account is available for testing:

- **Email**: `demo@bank.app`
- **Password**: `demo12345`
- **Security PIN**: `1234`
- *(Includes pre-configured balance, cards, saved beneficiaries, and recent activity)*

---

## 📡 API Reference

All routes under `/api/**` (except registration and login) require an active authenticated session.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user profile |
| `POST` | `/api/auth/login` | Authenticate user and initiate session |
| `POST` | `/api/auth/logout` | Terminate active user session |
| `GET` | `/api/auth/me` | Fetch authenticated user details |
| `GET` | `/api/accounts` | List accounts owned by current user |
| `POST` | `/api/accounts` | Open a new bank account |
| `GET` | `/api/accounts/:number/history` | Paginated ledger statement |
| `GET` | `/api/accounts/:number/statement.csv` | Export statement as CSV file |
| `POST` | `/api/accounts/credit` | Deposit funds |
| `POST` | `/api/accounts/debit` | Withdraw funds (PIN verified) |
| `POST` | `/api/accounts/transfer` | Atomic double-entry transfer (PIN & row-locked) |
| `GET` | `/api/beneficiaries` | List saved beneficiaries |
| `POST` | `/api/beneficiaries` | Save a new beneficiary |
| `DELETE` | `/api/beneficiaries/:id` | Remove a saved beneficiary |
| `GET` | `/api/cards` | Retrieve virtual debit cards |
| `PATCH` | `/api/cards/:accountNumber` | Toggle freeze, NFC, and online status |
| `POST` | `/api/billpay` | Pay utility bill / mobile recharge |
| `GET` | `/api/support/tickets` | List user support tickets |
| `POST` | `/api/support/tickets` | Submit a customer support inquiry |

---

## 🧪 Testing

Execute the automated integration test suite:

```bash
cd server
npm test
```

The test suite validates:
- User registration and authentication workflows.
- Account opening and initial deposit.
- Atomic transfer money movements and double-entry ledger reconciliation.
- Rejection of insufficient balances and invalid PIN attempts (403/400).
- Unauthorized access controls (401).

---

## 📄 License

Distributed under the **MIT License**.

---

## 👤 Author

**Suraj Kumar**
- GitHub: [@surajkumar11292](https://github.com/surajkumar11292)
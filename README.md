<div align="center">

<img src="https://readme-typing-svg.demolab.com/?font=Space+Mono&size=30&duration=2600&pause=900&color=16B083&center=true&vCenter=true&width=720&lines=Swiss+Bank;PERN+Stack+%2B+PostgreSQL+%2B+Prisma;Accounts+%C2%B7+Transfers+%C2%B7+Double-Entry+Ledger;Java+Console+App+%E2%86%92+Cloud+Web+Bank" alt="Swiss Bank" />

### A session-authenticated banking service — rebuilt from a console/JDBC Java app into a production **PERN (PostgreSQL + Express + React + Node.js)** web application with a real double-entry ledger, row-locked transfers, and precision money.

<br/>

![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

<br/>

**[🚀 Live Demo](https://swiss-bank-zeta.vercel.app)** &nbsp;·&nbsp; **[📖 API Reference](#-api-reference)** &nbsp;·&nbsp; **[⚙️ Run Locally](#-getting-started)** &nbsp;·&nbsp; **[🏗️ Architecture](#-architecture)** &nbsp;·&nbsp; **[🗺️ Roadmap](#-roadmap)**

<br/>

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="70%">

</div>

<br/>

## 📌 About The Project

**Swiss Bank** is a session-authenticated banking web application: register, sign in, open one or more accounts, deposit, withdraw, transfer between accounts, save beneficiaries, pay bills, manage a debit card, and raise support tickets — all backed by a real **double-entry ledger** instead of a single mutable balance column.

It's a ground-up rebuild of a **console-based JDBC banking app** that used to run in a `Scanner` loop against MySQL. This version replaces every one of that original's structural weaknesses:

| 🗿 Original Console App | ✨ This Rebuild |
|---|---|
| Terminal `Scanner` loop | Session-authenticated web app + REST API |
| Balances stored as `double` | Precision `Decimal` money — no floating-point drift |
| Passwords & PINs in plaintext | BCrypt-hashed passwords **and** transaction PINs |
| Hardcoded DB credentials in source | 100% environment-driven configuration |
| No transaction history | Immutable **double-entry ledger** with running balance |
| Transfer never checked the receiver existed | Receiver verified; atomic two-leg transfer |
| No locking — concurrent transfers could corrupt a balance | **Row-level database locks**, acquired in a deterministic order |
| "Login" just returned an email in a loop | Real Express sessions with cookie isolation |

<br/>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🔐 Accounts & Security
- Register / sign in via **Express session cookies**
- **BCrypt**-hashed passwords and per-account transaction PINs
- **Multiple accounts** per user, each with its own PIN
- **Ownership isolation** — every operation re-resolves the current user from the session; an account number in a URL is never trusted alone
- **Change password** from the Profile page, verified against the current hash

</td>
<td width="50%" valign="top">

### 💸 Money Movement
- **Deposit, withdraw, transfer** between accounts
- Transfers are **atomic and row-locked** — both accounts are locked lowest-account-number-first, so opposing transfers can't deadlock or corrupt a balance
- **Double-entry ledger** — every movement writes a `DEBIT` leg and a `CREDIT` leg under one shared reference, each storing the balance *after* it
- **Beneficiaries** — save payees for faster future transfers

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🧾 Statements & Bills
- **Paginated account statement**, credit/debit columns, running balance
- **Full CSV export** of a statement — not limited to the loaded page
- **Bill Pay / Recharge** — debits a real owned account through the same ledger and keeps a persisted history

</td>
<td width="50%" valign="top">

### 💳 Cards & Support
- **One card per account**, issued on first request
- **Freeze / unfreeze**, contactless and online-payment toggles, replacement requests — all persisted server-side
- **Support tickets** — messages are stored and listed back with a ticket number

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎨 Frontend
- **Light / Dark / System** theme, persisted, applied pre-paint (no flash)
- Custom design system with exact visual typography (`Poppins`, `Inter`, `IBM Plex Mono`)

</td>
<td width="50%" valign="top">

### 🛡️ Ops & Developer Experience
- Hardened headers: **CSP**, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- HTTP-only, `SameSite` session cookie with proxy trust
- 🧪 Supertest integration suite · 💓 Health checks · 🔁 Automated CI/CD

</td>
</tr>
</table>

<br/>

## 🧰 Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v20+) |
| **Backend** | Express.js, Prisma ORM, express-session |
| **Database** | PostgreSQL (hosted on Neon) |
| **Frontend** | React 18, Vite, Vanilla CSS Design System |
| **Security** | BCrypt, TOTP 2FA, Helmet, CORS |
| **Deployment** | Frontend on Vercel · Backend on Render · Neon PostgreSQL |

</div>

<br/>

## 🏗️ Architecture

```
                 ┌──────────────────┐     ┌─────────────┐     ┌──────────┐     ┌────────────┐     ┌─────────┐
  HTTP Request → │  Session Cookie  │ →   │ Express API │ →   │ Service  │ →   │ Prisma ORM │ →   │  Model  │ → PostgreSQL (Neon)
                 │  (Auth Check)    │     │ Controllers │     │  Layer   │     │   Client   │     │ (Tables)│
                 │                  │  ←  │             │  ←  │          │  ←  │            │  ←  │         │
                 └──────────────────┘     └─────────────┘     └──────────┘     └────────────┘     └─────────┘
                                                                     ↓
                                                    money rules · row locking · ledger entries
```

**Key design decisions**

- 💰 **Precision Decimal everywhere for money** — the original used `double`, which is unsafe for currency arithmetic.
- 🔒 **Transfers lock both accounts** in database transactions, acquired **lowest-account-number first**, so two opposing transfers can never deadlock each other or read a stale balance.
- 🧾 **Double-entry ledger** — a transfer writes a `DEBIT` leg on the sender and a `CREDIT` leg on the receiver under one shared reference; each entry records the balance *after* it, so a statement always reconciles independently of the account's current balance column.
- 🧍 **Per-user isolation enforced server-side** — every account, card, beneficiary, and bill-pay lookup re-checks ownership against the session user; nothing is authorized by trusting an ID in the URL.
- 🔑 **No secrets in source** — all credentials and connection strings come from environment variables.
- 🎫 **Support and billing history are persisted**, not just fire-and-forget requests, so a user's past tickets and payments are always retrievable.

<br/>

## 📂 Project Structure

```
Swiss_Bank/
├── client/
│   ├── src/
│   │   ├── components/      # Common UI, Modals, Navbar, ToastContainer
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── pages/           # LoginPage, DashboardPage, AdminPage
│   │   ├── services/        # api.js client wrapper
│   │   └── styles/          # bank.css, admin.css
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
├── server/
│   ├── controllers/         # authController, accountController, cardController...
│   ├── middleware/          # authMiddleware, session
│   ├── prisma/              # schema.prisma, migrations, seed.js
│   ├── routes/              # apiRouter
│   ├── services/            # accountService, ledgerService...
│   ├── tests/               # banking.test.js
│   ├── app.js
│   ├── server.js
│   └── package.json
├── .env.example
├── README.md
└── package.json
```

<br/>

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+**
- **PostgreSQL Database** (Neon or local)

### Run it

```bash
git clone https://github.com/surajkumar11292/Swiss_Bank.git
cd Swiss_Bank

# Install dependencies
npm install

# Start backend server
cd server
npm install
npx prisma generate
npm run dev

# Start frontend client (in separate terminal)
cd ../client
npm install
npm run dev
```

Open `http://localhost:5173/` and sign in with the seeded demo login:

> **demo@bank.app** · password **demo12345** — two accounts, PIN **1234**

| URL | What you'll find |
|---|---|
| `http://localhost:5173/` | 🏦 The banking dashboard |
| `http://localhost:5173/login` | 🔐 Sign in / create account |
| `http://localhost:5000/health` | 💓 Health check endpoint |

<br/>

## ⚙️ Configuration

Production configuration is 100% environment-variable driven — see `.env.example`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `SESSION_SECRET` | Secret key for signing session cookies |
| `NODE_ENV` | `production` or `development` |
| `PORT` | Backend server port (default `5000`) |

<br/>

## 📡 API Reference

All `/api/**` routes other than register/login require an authenticated session.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a user |
| `POST` | `/api/auth/login` | Start a session |
| `POST` | `/api/auth/logout` | End the session |
| `GET` | `/api/auth/me` | Current signed-in user |
| `POST` | `/api/auth/change-password` | Change the signed-in user's password |
| `GET` | `/api/accounts` | List **your** accounts |
| `POST` | `/api/accounts` | Open an account |
| `GET` | `/api/accounts/{number}` | Account detail (owner only) |
| `GET` | `/api/accounts/{number}/history` | Paginated statement |
| `GET` | `/api/accounts/{number}/statement.csv` | Full statement export (CSV) |
| `POST` | `/api/accounts/credit` | Deposit |
| `POST` | `/api/accounts/debit` | Withdraw |
| `POST` | `/api/accounts/transfer` | Transfer between accounts (PIN-verified, row-locked) |
| `GET` | `/api/beneficiaries` | List your saved beneficiaries |
| `POST` | `/api/beneficiaries` | Save a beneficiary |
| `DELETE` | `/api/beneficiaries/{id}` | Remove a beneficiary |
| `GET` | `/api/billpay/history` | Paginated bill payment history |
| `POST` | `/api/billpay` | Pay a bill / recharge (debits an owned account) |
| `GET` | `/api/cards` | List your cards (issued lazily, one per account) |
| `PATCH` | `/api/cards/{accountNumber}` | Update freeze / contactless / online toggles |
| `POST` | `/api/cards/{accountNumber}/request-replacement` | Request a replacement card |
| `GET` | `/api/support/tickets` | List your support tickets |
| `POST` | `/api/support/tickets` | Raise a new support ticket |

<br/>

## 🧪 Testing

```bash
cd server
npm test
```

`banking.test.js` is a full integration test suite (Jest + Supertest) covering:

- ✅ Register and login flows
- ✅ Account opening
- ✅ A transfer that moves money **and** writes both ledger legs correctly
- ✅ Insufficient-balance and wrong-PIN rejections
- ✅ Unauthenticated access is rejected (**401**)
- ✅ Cross-user access to another user's account is forbidden (**403**)

<br/>

## 🔐 Security

- 🔒 Session-based authentication with HTTP-only cookies; no tokens to leak in client storage
- 🧂 **BCrypt** hashing for both account passwords and transaction PINs
- 🔢 **Deterministic database transactions** on transfers to prevent deadlocks and race conditions
- 🧍 **Ownership checks on every request** — accounts, cards, beneficiaries, and bills are always re-verified against the session user
- 🧱 Hardened response headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- 🍪 HTTP-only, `SameSite` session cookie with proxy trust
- 🙈 No credentials ever committed — configuration is fully environment-driven

<br/>

## ☁️ Deployment

Deployed as a modern cloud application on **[Vercel](https://vercel.com)** (Frontend) and **[Render](https://render.com)** (Backend), backed by a **[Neon](https://neon.tech)** serverless PostgreSQL database.

```
GitHub push → Vercel (React Frontend) + Render (Node.js API) → Neon PostgreSQL
```

<br/>

## 🗺️ Roadmap

- [ ] Two-factor authentication for login and high-value transfers
- [ ] Scheduled / recurring transfers
- [ ] Admin console for support-ticket triage
- [ ] Rate limiting on authentication and transfer endpoints
- [ ] Downloadable PDF statements alongside the existing CSV export
- [ ] Multi-currency accounts

<br/>

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

```bash
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
# open a PR
```

<br/>

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

<br/>

## 👤 Author

<div align="center">

**Suraj Kumar**

[![GitHub](https://img.shields.io/badge/GitHub-surajkumar11292-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/surajkumar11292)

<br/>

⭐ **If this project helped you, consider giving it a star!** ⭐

<img src="https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" width="100%">

</div>
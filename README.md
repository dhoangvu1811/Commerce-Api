# 🛒 Commerce API (PostgreSQL + Prisma)

> A high-performance, type-safe RESTful API for e-commerce applications built with TypeScript, Express 5, PostgreSQL, and Prisma ORM.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Express](https://img.shields.io/badge/Express-5.2-black?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-7.2-black?logo=prisma)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Key Features

### 🔐 Advanced Authentication

- **JWT Provider**: Secure Access & Refresh token rotation.
- **Session Management**: Database-backed sessions with device tracking and IP logging.
- **OAuth 2.0**: Seamless integration with Google and Facebook.
- **Account Security**: Role-based access control (RBAC), email verification, and password hashing (Bcrypt).
- **Rate Limiting**: Protection against brute force and DDoS attacks.

### 🛍️ E-Commerce Engine

- **Atomic Transactions**: Prisma-powered transactions for complex order creation.
- **Order Lifecycle**: Robust status management (Pending → Confirmed → Shipping → Delivered/Cancelled).
- **Snapshot Pattern**: Preservation of product and voucher data at the time of order placement.
- **Flexible Vouchers**: Support for percentage and fixed-amount discounts with usage limits.
- **Intelligent Stock**: Automated inventory management during order processing.

### 🛡️ Design & Security

- **Zod Validation**: Strict input validation for all API endpoints.
- **Generic Error Handling**: Centralized middleware for consistent API responses.
- **Clean Architecture**: Decoupled Controller-Service-Model layers.
- **Decimal Precision**: Precise financial calculations using `Decimal.js` via Prisma.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.x
- **pnpm**: Fast, disk space efficient package manager.
- **PostgreSQL**: Local instance or hosted provider (Supabase, Neon, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Commerce-Api.git
cd Commerce-Api

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
```

### Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Sync schema with your PostgreSQL database
pnpm db:push
```

### Running the App

```bash
# Development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## ⚙️ Environment Variables

| Variable             | Description                             |
| :------------------- | :-------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string (Required) |
| `JWT_ACCESS_SECRET`  | Secret key for access tokens            |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens           |
| `CLOUDINARY_*`       | Credentials for image storage           |
| `BREVO_API_KEY`      | For transactional email delivery        |
| `GOOGLE_*`           | Client ID/Secret for Google OAuth       |
| `FACEBOOK_*`         | Client ID/Secret for Facebook OAuth     |

---

## 📁 Project Architecture

```
src/
├── config/          # PostgreSQL (Prisma), CORS, Env configs
├── controllers/     # Express route handlers
├── middlewares/     # Auth, Errors, Multer, Rate-limiting
├── models/          # Data Access Object Layer (DAO) using Prisma
├── providers/       # Email (Brevo), Cloud, JWT, Passport providers
├── routes/          # API route definitions (V1)
├── services/        # Core Business Logic Layer
├── types/           # TypeScript interface & enum definitions
├── utils/           # Shared utility functions & constants
├── validations/     # Zod validation schemas
└── server.ts        # Application entry point
```

---

## 🔗 Main API Endpoints

### 👤 User & Auth

- `POST /V1/users/register` - New account creation
- `POST /V1/users/login` - Authenticate and get tokens
- `POST /V1/users/logout` - Invalidate session
- `GET /V1/users/me` - Profile overview
- `GET /V1/users/auth/google` - Initiate Google OAuth
- `GET /V1/users/auth/facebook` - Initiate Facebook OAuth

### 📦 Products

- `GET /V1/products/getAll` - Paginated & filtered product list
- `GET /V1/products/details/:id` - Detailed product information
- `POST /V1/products/create` - (Admin) Add new product

### 🧾 Orders

- `POST /V1/orders/create` - Place a new order with stock reservation
- `GET /V1/orders/my-orders` - User order history
- `PUT /V1/orders/admin/update/:id` - (Admin) Status management

### 🎟️ Vouchers

- `POST /V1/vouchers/verify` - Check voucher validity & discount
- `GET /V1/vouchers/active` - List all valid public vouchers

---

## 🧪 Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript 5.9
- **Framework**: Express 5.2
- **ORM**: Prisma 7.2
- **Database**: PostgreSQL 16
- **Validation**: Zod 3
- **Security**: JWT, Passport.js, Bcrypt
- **Email**: Brevo API
- **Storage**: Cloudinary

---

## 👨‍💻 Author

**DHVuxDev**

---

<p align="center">
  Built with ❤️ for High Scalability and Performance
</p>

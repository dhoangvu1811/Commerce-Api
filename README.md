# 🛒 MERNCommerce API

> A modern, full-featured RESTful API for e-commerce applications built with TypeScript, Express 5, and MongoDB.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Express](https://img.shields.io/badge/Express-5.2-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-6.20-green?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🔐 Authentication & Authorization

- **JWT-based authentication** with Access & Refresh tokens
- **Session management** with device tracking and IP logging
- **OAuth 2.0** integration (Google & Facebook)
- **Email verification** with secure token links
- **Rate limiting** to prevent brute force attacks
- **Role-based access control** (Admin/User)
- **User activation/deactivation** system

### 🛍️ E-Commerce Core

- **Product Management** - CRUD operations with image upload
- **Order System** - Complete order lifecycle with status tracking
- **Voucher System** - Discount codes with usage limits and expiration
- **Payment Handling** - Multiple payment methods with status tracking

### 🛡️ Security

- Password hashing with bcrypt
- CORS configuration
- Request validation with Zod
- Centralized error handling
- Graceful shutdown

### 📦 Infrastructure

- **Cloudinary** for image storage
- **Brevo** for transactional emails
- **MongoDB transactions** for data integrity

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **Yarn** package manager
- **MongoDB** (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/MERNCommerce-Api.git
cd MERNCommerce-Api

# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env

# Configure your .env file with your credentials
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=your_database_name

# Server Configuration
AUTHOR=YourName
LOCAL_DEV_APP_HOST=localhost
LOCAL_DEV_APP_PORT=3000
BUILD_MODE=dev

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=5m
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Brevo Email Configuration
BREVO_API_KEY=your_brevo_api_key
ADMIN_EMAIL_ADDRESS=admin@example.com
ADMIN_EMAIL_NAME=Admin

# Website Domains
WEBSITE_DOMAIN_DEVELOPMENT=http://localhost:5173
WEBSITE_DOMAIN_PRODUCTION=https://your-production-domain.com

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/V1/users/auth/google/callback

# Facebook OAuth Configuration
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/V1/users/auth/facebook/callback
```

### Running the Server

```bash
# Development (with hot reload)
yarn dev

# Production build
yarn build

# Production start
yarn start

# Or build and start together
yarn production
```

---

## 📁 Project Structure

```
src/
├── config/          # Configuration (MongoDB, CORS, Environment)
├── controllers/     # Route handlers
│   ├── orderController.ts
│   ├── productController.ts
│   ├── userController.ts
│   └── voucherController.ts
├── middlewares/     # Express middlewares
│   ├── authMiddleware.ts        # JWT & session verification
│   ├── errorHandlingMiddleware.ts
│   ├── multerUploadMiddleware.ts
│   └── rateLimitMiddleware.ts
├── models/          # MongoDB models with Zod validation
│   ├── orderModel.ts
│   ├── productModel.ts
│   ├── sessionModel.ts
│   ├── userModel.ts
│   └── voucherModel.ts
├── providers/       # Third-party integrations
│   ├── BrevoProvider.ts     # Email service
│   ├── CloudinaryProvider.ts # Image upload
│   ├── JwtProvider.ts       # Token management
│   └── passport.ts          # OAuth strategies
├── routes/          # API route definitions
│   └── V1/
│       ├── index.ts
│       ├── orderRouter.ts
│       ├── productRouter.ts
│       ├── userRouter.ts
│       └── voucherRouter.ts
├── services/        # Business logic layer
│   ├── oAuthService.ts
│   ├── orderService.ts
│   ├── productService.ts
│   ├── sessionService.ts
│   ├── userService.ts
│   └── voucherService.ts
├── types/           # TypeScript type definitions
├── utils/           # Utility functions & constants
├── validations/     # Zod validation schemas
└── server.ts        # Application entry point
```

---

## 🔗 API Endpoints

Base URL: `/V1`

### Health Check

| Method | Endpoint  | Description               |
| ------ | --------- | ------------------------- |
| GET    | `/status` | API status check          |
| GET    | `/health` | Health check with DB ping |

### 👤 Users & Authentication

#### Public Routes

| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| POST   | `/users/register`                | Register new user       |
| POST   | `/users/login`                   | User login              |
| POST   | `/users/refresh-token`           | Refresh access token    |
| POST   | `/users/send-verification-email` | Send verification email |
| GET    | `/users/verify-account`          | Verify email account    |

#### OAuth Routes

| Method | Endpoint                        | Description             |
| ------ | ------------------------------- | ----------------------- |
| GET    | `/users/auth/google`            | Google OAuth login      |
| GET    | `/users/auth/google/callback`   | Google OAuth callback   |
| GET    | `/users/auth/facebook`          | Facebook OAuth login    |
| GET    | `/users/auth/facebook/callback` | Facebook OAuth callback |

#### Protected User Routes

| Method | Endpoint               | Description         |
| ------ | ---------------------- | ------------------- |
| POST   | `/users/logout`        | User logout         |
| GET    | `/users/me`            | Get current user    |
| PUT    | `/users/me`            | Update current user |
| PUT    | `/users/me/password`   | Update password     |
| POST   | `/users/upload-avatar` | Upload avatar       |

#### Session Management (User)

| Method | Endpoint                   | Description         |
| ------ | -------------------------- | ------------------- |
| GET    | `/users/my-sessions`       | Get user's sessions |
| POST   | `/users/revoke-my-session` | Revoke own session  |

#### Admin Routes

| Method | Endpoint                             | Description                    |
| ------ | ------------------------------------ | ------------------------------ |
| GET    | `/users/all`                         | Get all users                  |
| GET    | `/users/overview`                    | Get users with session summary |
| POST   | `/users/create`                      | Create user by admin           |
| GET    | `/users/details/:id`                 | Get user details               |
| PUT    | `/users/update/:id`                  | Update user                    |
| DELETE | `/users/delete/:id`                  | Delete user                    |
| POST   | `/users/delete-multiple`             | Delete multiple users          |
| PATCH  | `/users/activate/:userId`            | Activate user                  |
| PATCH  | `/users/deactivate/:userId`          | Deactivate user                |
| POST   | `/users/revoke-session`              | Revoke user session            |
| DELETE | `/users/revoke-all-sessions/:userId` | Revoke all user sessions       |
| GET    | `/users/sessions/:userId`            | Get user sessions              |

---

### 📦 Products

#### Public Routes

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| GET    | `/products/getAll`      | Get all products      |
| GET    | `/products/getAllType`  | Get all product types |
| GET    | `/products/details/:id` | Get product details   |

#### Admin Routes (Protected)

| Method | Endpoint                   | Description              |
| ------ | -------------------------- | ------------------------ |
| POST   | `/products/create`         | Create product           |
| PUT    | `/products/update/:id`     | Update product           |
| DELETE | `/products/delete/:id`     | Delete product           |
| POST   | `/products/deleteSelected` | Delete multiple products |
| POST   | `/products/upload-image`   | Upload product image     |

---

### 🧾 Orders

#### User Routes (Protected)

| Method | Endpoint              | Description       |
| ------ | --------------------- | ----------------- |
| POST   | `/orders/create`      | Create order      |
| GET    | `/orders/my-orders`   | Get user's orders |
| GET    | `/orders/details/:id` | Get order details |
| POST   | `/orders/cancel/:id`  | Cancel order      |

#### Admin Routes

| Method | Endpoint                           | Description               |
| ------ | ---------------------------------- | ------------------------- |
| GET    | `/orders/all`                      | Get all orders            |
| GET    | `/orders/admin/details/:id`        | Get order details (admin) |
| PUT    | `/orders/admin/update/:id`         | Update order status       |
| PUT    | `/orders/admin/update-payment/:id` | Update payment status     |
| POST   | `/orders/admin/mark-paid/:id`      | Mark order as paid        |
| POST   | `/orders/admin/cancel/:id`         | Cancel order (admin)      |
| GET    | `/orders/admin/logs/:id`           | Get order logs            |

---

### 🎟️ Vouchers

#### Public Routes

| Method | Endpoint           | Description         |
| ------ | ------------------ | ------------------- |
| POST   | `/vouchers/verify` | Verify voucher code |
| GET    | `/vouchers/active` | Get active vouchers |

#### Admin Routes (Protected)

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/vouchers/all`             | Get all vouchers         |
| GET    | `/vouchers/details/:id`     | Get voucher details      |
| POST   | `/vouchers/create`          | Create voucher           |
| PUT    | `/vouchers/update/:id`      | Update voucher           |
| DELETE | `/vouchers/delete/:id`      | Delete voucher           |
| POST   | `/vouchers/delete-multiple` | Delete multiple vouchers |

---

## 🛠️ Scripts

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `yarn dev`         | Start development server with hot reload |
| `yarn build`       | Build for production                     |
| `yarn start`       | Start production server                  |
| `yarn production`  | Build and start production               |
| `yarn lint`        | Run ESLint                               |
| `yarn lint:fix`    | Fix ESLint issues                        |
| `yarn lint:strict` | Run ESLint with zero warnings            |
| `yarn type-check`  | TypeScript type checking                 |
| `yarn test`        | Run tests                                |
| `yarn clean`       | Clean build directory                    |

---

## 🧪 Tech Stack

| Category         | Technology       |
| ---------------- | ---------------- |
| **Runtime**      | Node.js          |
| **Language**     | TypeScript 5.9   |
| **Framework**    | Express 5.2      |
| **Database**     | MongoDB 6.20     |
| **Validation**   | Zod 3            |
| **Auth**         | JWT, Passport.js |
| **Email**        | Brevo API        |
| **Image Upload** | Cloudinary       |
| **Build Tool**   | tsup             |
| **Linting**      | ESLint           |

---

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- **Authentication**: `simplified-access-control.md`
- **OAuth Setup**: `google-oauth-setup.md`, `facebook-oauth-setup.md`
- **Email Verification**: `EMAIL_VERIFICATION_API.md`
- **Session Management**: `SESSION_MANAGEMENT_API.md`
- **Order System**: `order-test-cases.md`, `payment-method-logic.md`
- **MongoDB Transactions**: `mongodb-transactions-implementation.md`

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**DHVuxDev**

---

<p align="center">
  Made with ❤️ using TypeScript & Express
</p>

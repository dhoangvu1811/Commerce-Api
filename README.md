<p align="center">
  <img src="./docs/images/logo.svg" alt="NextCommerce Logo" width="220" />
</p>

# NextCommerce — Commerce API

> Core backend services powering the NextCommerce platform. Built with Express 5, TypeScript, PostgreSQL, and Prisma ORM, featuring robust HttpOnly cookie session management, granular Role-Based Access Control (RBAC), real-time WebSockets, transactional shipping & payment integrations, and specialized AI/recommendation hooks.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D_18.x-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-black?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.2-black?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io)](https://socket.io/)

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Architecture & Ecosystem](#-architecture--ecosystem)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup & Schema](#-database-setup--schema)
- [Running the App](#-running-the-app)
- [API Documentation](#-api-documentation)
- [Authentication & Session Lifecycle](#-authentication--session-lifecycle)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Transactional Outbox Pattern](#-transactional-outbox-pattern)
- [Third-Party Integrations](#-third-party-integrations)
- [AI & Recommendation Subsystems](#-ai--recommendation-subsystems)
- [Testing](#-testing)
- [Deployment (Docker)](#-deployment-docker)

---

## 🎯 Overview
**NextCommerce Commerce API** is the monolithic hub of the NextCommerce platform. It serves as the unified transactional REST gateway under `/V1` routes for both the customer storefront client (`clientEC`) and the administrative dashboard client (`AdminDashboard`).

By combining Express 5's async routing optimizations with Prisma 7, it handles low-latency CRUD, transactional checkout routines, real-time alert dispatching, and acts as the secure gateway to external logistics (Giao Hàng Nhanh), checkout providers (PayPal), and the background AI RAG system.

---

## 🌐 Architecture & Ecosystem

```mermaid
flowchart TD
  subgraph ClientApps [Client Applications]
    clientEC["Storefront (clientEC)<br/>Next.js 16 / Redux / Socket.IO"]
    Admin["Admin Dashboard (AdminDashboard)<br/>Next.js 14 / MUI / Socket.IO"]
  end

  subgraph CoreBackend [Core Backend & Database]
    API["Commerce Backend (Commerce-Api)<br/>Express 5 / Node.js REST API"]
    DB[("PostgreSQL DB<br/>Prisma ORM")]
    API <--> DB
  end

  subgraph AISubsystem [AI & Recommendation Subsystems]
    n8n["n8n AI Agent<br/>RAG Chatbot Orchestrator"]
    Embeddings["Embeddings Engine (ecommerce-Embeddings)<br/>Python / SentenceTransformers"]
    Recommender["Recommendation Service (ecommerce-recomendation)<br/>Python / Hybrid Recommendations"]
    Qdrant[("Qdrant Vector DB")]
  end

  %% ClientEC Interactions
  clientEC -- "HTTP /V1 REST Requests" --> API
  clientEC -- "WebSockets (real-time order toasts)" --> API
  
  %% AdminDashboard Interactions
  Admin -- "HTTP /V1 REST Requests" --> API
  Admin -- "WebSockets (real-time order alerts)" --> API
  
  %% Backend to AI Connections
  API -- "Proxy chatbot queries & context" --> n8n
  API -- "Vector search & image processing" --> Embeddings
  API -- "Track recommendation-events" --> Recommender
  
  %% DB Connections
  Embeddings <--> Qdrant
  n8n <--> Qdrant
  
  %% Styling nodes
  style clientEC fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
  style Admin fill:#faf5ff,stroke:#7e22ce,stroke-width:2px
  style API fill:#ecfdf5,stroke:#059669,stroke-width:2px
  style DB fill:#f3f4f6,stroke:#4b5563,stroke-width:2px
  style n8n fill:#fff7ed,stroke:#ea580c,stroke-width:2px
  style Embeddings fill:#fff1f2,stroke:#e11d48,stroke-width:2px
  style Recommender fill:#fff1f2,stroke:#e11d48,stroke-width:2px
  style Qdrant fill:#f0fdf4,stroke:#15803d,stroke-width:2px
```

---

## 🛠️ Tech Stack

| Category | Technology | Version | Description |
|----------|------------|---------|-------------|
| **Runtime** | Node.js | `>= 18.x` | Server runtime environment |
| **Framework** | Express.js | `^5.2.0` | Async routing structure engine |
| **Language** | TypeScript | `^5.9.3` | System typing definitions compilation |
| **ORM** | Prisma | `^7.2.0` | Node.js type-safe ORM |
| **Database** | PostgreSQL | `^16` | Transactional data storage |
| **Auth Engine**| JWT + Bcrypt | `^9.0` / `^6.0` | Session signing and password crypt hashing |
| **Passport** | Passport.js | `^0.7.0` | Multi-strategy OAuth (Google & Facebook) handler |
| **Realtime** | Socket.IO | `^4.8.3` | Bidirectional WebSocket server |
| **Validation** | Zod | `^3.x` | Request validation schema parsing |
| **Testing** | Vitest | `^4.1.2` | Lightning-fast test runner |
| **Image Storage**| Multer + Cloudinary | `^2.0` / `^2.7` | Image upload and management service |
| **Emailing** | Brevo SDK | `^3.0.1` | Transactional SMTP mail provider |

---

## 📁 Project Structure

```
Commerce-Api/
├── prisma/
│   ├── schema.prisma        # Prisma Data models and DB relations mapping
│   ├── seed.ts              # System database seed script (Roles, Users, Products)
│   └── migrations/          # Schema changes version control files
├── src/
│   ├── server.ts            # Bootstraps database, Socket.IO, Outbox loop, and starts HTTP server
│   ├── config/              # Environment parser, DB adapter, CORS, and Socket.IO initialization
│   ├── routes/
│   │   └── V1/              # Versioned API routes mapping (Express Routers)
│   ├── controllers/         # Extract request parameters, query services, write responses
│   ├── services/            # Main core business logic, third party integrations, tasks
│   │   ├── outboxProcessor.ts  # Worker polling the outbox tables for notification webhooks
│   │   ├── recommendation.service.ts # Communicates with Python FastAPI recommendations
│   │   └── aiChat.service.ts   # Chat agent bridge invoking n8n workflow
│   ├── models/              # Prisma DB access helper methods
│   ├── middlewares/         # JWT parsing, Session validation, RBAC checks, rate limiters
│   ├── validations/         # Request body validation schemas (Zod)
│   ├── providers/           # Third-party integrations (Cloudinary, Brevo, Passport OAuth strategies)
│   ├── helpers/             # Custom payment and calculation utilities (PayPal)
│   ├── constants/           # Static constants (Permissions, order structures)
│   ├── types/               # Custom TypeScript interface/type extensions
│   ├── utils/               # Common helper utilities (Slugifier, ApiError classes)
│   └── tests/               # Unit and integration test suites (Vitest)
├── docs/                    # Developer setup details (session policies, PayPal docs)
├── tsup.config.ts           # Build bundle optimizer rules
├── tsconfig.json
├── vitest.config.ts         # Testing execution properties
└── package.json
```

---

## ✅ Prerequisites

- **Node.js**: Version `>= 18.x` (Recommended Node 20)
- **PostgreSQL**: Version `>= 16`
- **Package Manager**: `pnpm` (`npm` / `yarn` compatible)

---

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Commerce-Api
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   *Open `.env` and fill in your database details, JWT secrets, and API integration tokens.*

4. **Generate Prisma Client:**
   ```bash
   pnpm db:generate
   ```

---

## 🔐 Environment Variables

Setup the following keys in your `.env` configuration file:

| Group | Variable | Required | Description | Example / Default |
|-------|----------|----------|-------------|-------------------|
| **Database** | `DATABASE_URL` | ✅ | PostgreSQL connection URL | `postgresql://user:pass@localhost:5432/db?schema=public` |
| | `DATABASE_DIRECT_URL`| ✅ | Bypass connection pooling URL | `postgresql://user:pass@localhost:5432/db?schema=public` |
| **Server** | `LOCAL_DEV_APP_HOST` | ❌ | Local server hostname | `localhost` |
| | `LOCAL_DEV_APP_PORT` | ✅ | Express HTTP port in development | `8017` |
| | `BUILD_MODE` | ✅ | Execution stage environment | `dev` / `production` |
| | `AUTHOR` | ❌ | Author name identifier | `DHVuxDev` |
| **JWT** | `JWT_ACCESS_SECRET` | ✅ | Secret key to encrypt access token | *random_long_string* |
| | `JWT_ACCESS_EXPIRES_IN`| ✅ | Expiration duration for Access JWT | `5m` |
| | `JWT_REFRESH_SECRET` | ✅ | Secret key to encrypt refresh token | *random_long_string* |
| | `JWT_REFRESH_EXPIRES_IN`| ✅| Expiration duration for Refresh JWT | `7d` |
| **Recommender**| `RECOMMENDER_API_URL` | ❌ | FastAPI recommendations microservice URL| `http://localhost:8020` |
| | `RECOMMENDER_REINDEX_ENABLED`| ❌| Triggers reindexing webhook on product CRUD | `false` |
| | `RECOMMENDER_REINDEX_SECRET`| ❌| Must match REINDEX_SECRET on recommender | *secret_token* |
| | `RECOMMENDER_HF_TOKEN`| ❌ | Token to authenticate HF Space requests | *hf_token* |
| **AI RAG** | `N8N_AI_CHAT_WEBHOOK_URL`| ❌| Webhook triggers n8n RAG workflow | `http://localhost:5678/webhook-test/ai-chat-rag` |
| | `AI_CHAT_WEBHOOK_TIMEOUT_MS`| ❌| Timeout for AI chat webhook | `120000` |
| | `AI_CHAT_INTERNAL_SECRET`| ❌| Internal auth key for n8n API | *secret_token* |
| | `EMBEDDINGS_SERVICE_URL`| ❌ | Python embeddings model engine URL | `http://localhost:8030` |
| | `EMBEDDINGS_REINDEX_ENABLED`| ❌| Triggers embeddings reindexing on product CRUD| `false` |
| | `EMBEDDINGS_REINDEX_SECRET`| ❌| Secret header for embeddings reindex API | *secret_token* |
| | `EMBEDDINGS_IMAGE_SEARCH_URL`| ❌| Qdrant-based visual search endpoint | `http://localhost:8030/v1/search-by-image` |
| | `EMBEDDINGS_HF_TOKEN`| ❌ | Hugging Face token for embeddings | *hf_token* |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME`| ❌ | Cloudinary storage identifier | *your_cloudinary_name* |
| | `CLOUDINARY_API_KEY` | ❌ | Cloudinary API credentials key | *your_api_key* |
| | `CLOUDINARY_API_SECRET`| ❌ | Cloudinary API credentials secret | *your_api_secret* |
| **Brevo** | `BREVO_API_KEY` | ❌ | API key to trigger Brevo transactional SMTP| *your_brevo_api_key* |
| | `BREVO_SENDER_EMAIL` | ❌ | Sender email for transactional messages | `noreply@your-domain.com` |
| | `BREVO_SENDER_NAME` | ❌ | Sender name for transactional messages | `Your Store` |
| | `ADMIN_NOTIFICATION_EMAIL`| ❌| Receives system-level admin notifications | `admin@your-domain.com` |
| **Domains & CORS**| `WEBSITE_DOMAIN_DEVELOPMENT`| ❌| Allowed dev client web domain | `http://localhost:3000` |
| | `WEBSITE_DOMAIN_PRODUCTION`| ❌| Allowed production client web domain | `https://your-production-domain.com` |
| | `CORS_WHITELIST` | ❌ | Comma-separated list of allowed origins | `http://localhost:3000,http://localhost:4000` |
| **GHN Shipping**| `GHN_API_BASE_URL` | ❌ | GHN public API endpoint | `https://online-gateway.ghn.vn/shiip/public-api` |
| | `GHN_TOKEN` | ❌ | Token to query GHN shipping quotes | *your_ghn_token* |
| | `GHN_SHOP_ID` | ❌ | GHN merchant shop account ID | *your_ghn_shop_id* |
| | `GHN_FROM_DISTRICT_ID`| ❌ | Distrct ID where store warehouse is located | *your_from_district_id* |
| | `GHN_FROM_WARD_ID` | ❌ | Ward code where store warehouse is located | *your_from_ward_code* |
| | `GHN_DEFAULT_WEIGHT` | ❌ | Default weight (grams) for shipping package | `500` |
| | `GHN_DEFAULT_LENGTH` | ❌ | Default length (cm) for shipping package | `20` |
| | `GHN_DEFAULT_WIDTH` | ❌ | Default width (cm) for shipping package | `15` |
| | `GHN_DEFAULT_HEIGHT` | ❌ | Default height (cm) for shipping package | `5` |
| | `GHN_FALLBACK_FEE` | ❌ | Fallback delivery cost if GHN API errors | `25000` |
| **OAuth Login**| `GOOGLE_CLIENT_ID` | ❌ | Google Developers portal Client ID | *your_google_client_id* |
| | `GOOGLE_CLIENT_SECRET`| ❌ | Google Developers portal Client Secret | *your_google_client_secret* |
| | `GOOGLE_CALLBACK_URL` | ❌ | OAuth callback URL processed by backend router| `http://localhost:8017/V1/users/auth/google/callback`|
| | `FACEBOOK_CLIENT_ID` | ❌ | Facebook Apps Developer Client ID | *your_facebook_app_id* |
| | `FACEBOOK_CLIENT_SECRET`| ❌| Facebook Apps Developer Client Secret | *your_facebook_app_secret* |
| | `FACEBOOK_CALLBACK_URL`| ❌ | OAuth callback URL processed by backend router| `http://localhost:8017/V1/users/auth/facebook/callback`|
| **PayPal** | `PAYPAL_CLIENT_ID` | ❌ | PayPal API credentials Client ID | *your_client_id* |
| | `PAYPAL_CLIENT_SECRET`| ❌| PayPal API credentials Client Secret | *your_client_secret* |
| | `PAYPAL_ENV` | ❌ | Current SDK target environment | `sandbox` / `production` |
| | `PAYPAL_WEBHOOK_ID` | ❌ | Webhook ID verifying payment capture hooks | *your_paypal_webhook_id* |
| | `PAYPAL_CURRENCY` | ❌ | Base currency for invoice capture | `USD` |
| | `PAYPAL_SOURCE_CURRENCY`| ❌| Local currency stored in DB catalog | `VND` |
| | `PAYPAL_VND_TO_USD_RATE`| ❌| Exchange rate used to convert checkout rates | `26000` |
| **Outbox & Alert**| `N8N_TELEGRAM_WEBHOOK_URL`| ❌| Webhook URL of n8n routing to Telegram bot | `http://localhost:5678/webhook/telegram-order-notification` |
| | `OUTBOX_PROCESSOR_ENABLED`| ✅ | Enables transactional outbox polling daemon | `true` |
| | `OUTBOX_BATCH_SIZE` | ❌ | Number of outbox events processed per poll | `10` |
| | `OUTBOX_POLL_INTERVAL_MS`| ❌| Interval (ms) between outbox queue polls | `5000` |
| | `OUTBOX_MAX_RETRIES` | ❌ | Max failures before marking event as FAILED | `5` |
| | `OUTBOX_HTTP_TIMEOUT_MS`| ❌ | Timeout (ms) for HTTP requests calling n8n | `8000` |

---

## 🗄️ Database Setup & Schema

1. **Deploy database migrations:**
   ```bash
   pnpm db:migrate
   ```
2. **Seed the database:**
   ```bash
   pnpm db:seed
   ```
3. **Normalize existing product slugs (Optional):**
   ```bash
   pnpm db:fix-slugs
   ```
4. **Open visual database explorer:**
   ```bash
   pnpm db:studio
   ```

### 📐 Database Models Summary
- **WebhookOutbox**: Transactional outbox records to safely queue system events (e.g. order placement notifications) and poll them for processing.
- **User / Session**: Customer & staff accounts mapping, along with dynamic tracking of active device sessions and revocation flags.
- **Role / Permission / RolePermission**: Junction tables forming the system-wide RBAC matrix.
- **Product / Category / ProductImage**: Catalog hierarchy tracking price discounts, storage stocks, slugs, and gallery uploads.
- **CartItem / Wishlist**: Persisted customer bag elements and personal wishlist.
- **Order / OrderItem / OrderLog / OrderVoucher**: Customer sales records storing snapshots of items bought, historical status logs, and voucher discounts applied.
- **Payment**: Tracks transactional statuses of COD invoices or online PayPal checkouts.
- **Voucher**: Stores public and private promotional codes, discounts, usage limits, and active date boundaries.
- **Contact / Notification**: Support forms and user real-time notifications.
- **ShippingAddress**: Stores province, district, ward details linked to GHN IDs.
- **RecommendationEvent**: Telemetry events recording product impression clicks.

---

## ▶️ Running the App

```bash
# Start development server with hot-reload (tsx)
pnpm dev

# Build the project into JS production bundles (tsup)
pnpm build

# Start the production server
pnpm start

# Run typescript compilation validation
pnpm type-check

# Run linter checks
pnpm lint

# Format codebase (Prettier)
pnpm format
```

---

## 📡 API Documentation

All request URLs are prefixed by `/V1`.

### 🔑 Authentication & Users (`/users`)
| Method | Route | Auth | Limiters | Description |
|--------|-------|------|----------|-------------|
| **POST** | `/users/register` | ❌ | `authLimiter` | Registers new customer account |
| **POST** | `/users/login` | ❌ | `authLimiter` | Credentials verification; sets HttpOnly cookies |
| **POST** | `/users/refresh-token` | ❌ | None | Refreshes expired Access Token cookie |
| **POST** | `/users/logout` | ❌ * | None | Clears sessions in DB and wipes client cookies |
| **POST** | `/users/send-verification-email`| ❌ | `emailLimiter`| Dispatches Brevo activation email link |
| **GET** | `/users/verify-account` | ❌ | None | Validates activation token in DB |
| **POST** | `/users/forgot-password` | ❌ | `emailLimiter`| Dispatches password recovery link |
| **POST** | `/users/reset-password` | ❌ | `emailLimiter`| Updates password via validation token |
| **GET** | `/users/auth/google` | ❌ | None | Starts Google OAuth Passport flow |
| **GET** | `/users/auth/facebook` | ❌ | None | Starts Facebook OAuth Passport flow |
| **GET** | `/users/me` | ✅ | None | Returns profile info of authenticated user |
| **PUT** | `/users/me` | ✅ (Active) | None | Updates profile data and uploads avatar |
| **GET** | `/users/my-sessions` | ✅ (Active) | None | Returns list of logged-in sessions |
| **POST** | `/users/revoke-my-session` | ✅ (Active) | None | Destroys selected session owned by user |
| **GET** | `/users/all` | 🛠️ Admin | None | List all users |
| **GET** | `/users/overview` | 🛠️ Admin | None | Detailed grid list of users with sessions |
| **GET** | `/users/stats` | 🛠️ Admin | None | Aggregated registration statistics |
| **POST** | `/users/create` | 🛠️ Admin | None | Administrative user creation |
| **GET** | `/users/details/:id` | ✅ Owner/Admin| None | Returns specific user profiles |
| **PUT** | `/users/update/:id` | 🛠️ Admin | None | Administrative user details updater |
| **DELETE**| `/users/delete/:id` | 🛠️ Admin | None | Deletes user from database |
| **POST** | `/users/delete-multiple` | 🛠️ Admin | None | Bulk delete users |
| **PATCH** | `/users/activate/:userId` | 🛠️ Admin | None | Activates deactivated account |
| **PATCH** | `/users/deactivate/:userId` | 🛠️ Admin | None | Suspends account activity |
| **PATCH** | `/users/:id/role` | 🛠️ Admin | None | Changes user's system role |
| **POST** | `/users/revoke-session` | 🛠️ Admin | None | Destroys administrative session |
| **DELETE**| `/users/revoke-all-sessions/:userId`| 🛠️ Admin| None| Revokes all active logins for user |
| **GET** | `/users/sessions/:userId` | 🛠️ Admin | None | List all sessions of target user |

*\* Note: `/users/logout` bypasses access token expiry checks so users can successfully clean cookies even if their access token is expired.*

### 📦 Product Catalog (`/products`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **GET** | `/products/getAll` | ❌ | Fetch paginated product list with search, sorting, and price range filters |
| **GET** | `/products/details/:identifier`| ❌ | Retrieve details by numeric ID or slug string |
| **GET** | `/products/similar/:id` | ❌ (Opt Auth)| Fetch similar products (microservice proxy + DB fallback) |
| **POST** | `/products/create` | 🛠️ Admin/Staff| Creates product (triggers recommender/embeddings indexer) |
| **PUT** | `/products/update/:id` | 🛠️ Admin/Staff| Updates product (triggers recommender/embeddings indexer) |
| **DELETE**| `/products/delete/:id` | 🛠️ Admin/Staff| Deletes product (triggers index cleanup) |
| **POST** | `/products/deleteSelected` | 🛠️ Admin/Staff| Bulk delete products |
| **POST** | `/products/upload-image` | 🛠️ Admin/Staff| Uploads image file to Cloudinary and returns CDN URL |

### 📂 Categories (`/categories`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **GET** | `/categories` | ❌ | List all active product categories |
| **GET** | `/categories/:id` | ❌ | Fetch category detail and descriptions |
| **POST** | `/categories` | 🛠️ Admin/Staff| Creates category (supports multipart/form-data image upload) |
| **PUT** | `/categories/:id` | 🛠️ Admin/Staff| Updates category metadata and images |
| **DELETE**| `/categories/:id` | 🛠️ Admin/Staff| Deletes category |
| **DELETE**| `/categories/delete-many` | 🛠️ Admin/Staff| Bulk deletes categories |

### 🛒 Cart & Wishlist (`/cart` & `/wishlist`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **GET** | `/cart` | ✅ | Fetch customer's current shopping cart items |
| **POST** | `/cart/add` | ✅ | Add item and count to cart |
| **PUT** | `/cart/update` | ✅ | Update item quantity in cart |
| **DELETE**| `/cart/remove/:productId` | ✅ | Remove product from cart |
| **POST** | `/cart/sync` | ✅ | Syncs guest storage items after authentication |
| **DELETE**| `/cart/clear` | ✅ | Empty cart |
| **GET** | `/wishlist` | ✅ | Get wishlist items |
| **POST** | `/wishlist/toggle` | ✅ | Toggle item in wishlist |

### 🏷️ Vouchers (`/vouchers`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **POST** | `/vouchers/verify` | ❌ | Verify voucher validity and calculate discount on cart |
| **GET** | `/vouchers/active` | ❌ | List active public vouchers |
| **GET** | `/vouchers/all` | 🛠️ Admin/Staff| List all system vouchers |
| **GET** | `/vouchers/details/:id` | 🛠️ Admin/Staff| Fetch specific voucher details |
| **POST** | `/vouchers/create` | 🛠️ Admin/Staff| Create promotional voucher code |
| **PUT** | `/vouchers/update/:id` | 🛠️ Admin/Staff| Update voucher rules |
| **DELETE**| `/vouchers/delete/:id` | 🛠️ Admin/Staff| Delete voucher |
| **POST** | `/vouchers/delete-multiple` | 🛠️ Admin/Staff| Bulk delete vouchers |

### 💳 Orders & Payments (`/orders` & `/payments`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **POST** | `/orders/create` | ✅ (Active) | Checkout cart (initiates COD, momo, VNPay, or PayPal payment) |
| **GET** | `/orders/my-orders` | ✅ (Active) | List orders placed by current customer |
| **GET** | `/orders/details/:id` | ✅ (Active) | Retrieves specific order details and tracking codes |
| **POST** | `/orders/cancel/:id` | ✅ (Active) | Cancel order (Only valid if order status is `PENDING`) |
| **GET** | `/orders/all` | 🛠️ Admin/Staff| Fetch system-wide orders list |
| **GET** | `/orders/dashboard-summary`| 🛠️ Admin/Staff| Fetch sales charts aggregation and general metrics |
| **GET** | `/orders/admin/details/:id`| 🛠️ Admin/Staff| Detailed order tracking |
| **PUT** | `/orders/admin/update/:id`| 🛠️ Admin/Staff| Update order shipping state machine status |
| **PUT** | `/orders/admin/update-payment/:id`| 🛠️ Admin/Staff| Update order payment state |
| **POST** | `/orders/admin/mark-paid/:id`| 🛠️ Admin/Staff| Manually register order as paid |
| **POST** | `/orders/admin/cancel/:id`| 🛠️ Admin/Staff| Administrative order cancellation |
| **GET** | `/orders/admin/logs/:id` | 🛠️ Admin/Staff| Retrieve order transition log history |
| **POST** | `/payments/paypal/create-order`| ✅ (Active) | Set up a transaction on PayPal |
| **POST** | `/payments/paypal/capture-order`| ✅ (Active) | Capture payment, deduct stock, and finalize order |

### 🚚 Shipping & GHN (`/shipping`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **GET** | `/shipping/locations/provinces`| ✅ | Queries province list from Giao Hàng Nhanh |
| **GET** | `/shipping/locations/districts`| ✅ | Queries district list for province ID |
| **GET** | `/shipping/locations/wards` | ✅ | Queries ward list for district ID |
| **GET** | `/shipping/services` | ✅ | Queries available delivery methods for route |
| **POST** | `/shipping/quote` | ✅ | Calculates shipping cost based on GHN rules |

### 💬 AI Chatbot (`/ai-chat`)
| Method | Route | Auth | Limiters | Description |
|--------|-------|------|----------|-------------|
| **POST** | `/ai-chat` | ❌ | `aiChatLimiter` | Handles AI chat requests. Accepts optional multipart `image` payload for image search + text RAG pipeline |

### 📊 Telemetry, Reviews, Contacts & Notifications
| Method | Route | Auth | Limiters | Description |
|--------|-------|------|----------|-------------|
| **POST** | `/recommendation-events` | ❌ (Opt Auth)| `recommendationEventLimiter` | Ingests impression & click telemetry events |
| **GET** | `/reviews/products/:id` | ❌ | None | Lists reviews for product |
| **GET** | `/reviews/products/:id/summary`| ❌ | None | Calculates review aggregations |
| **GET** | `/reviews/products/:id/me` | ✅ | None | Returns if user is eligible to write review |
| **POST** | `/reviews` | ✅ | None | Submits product rating & comment |
| **POST** | `/contacts` | ❌ | `contactLimiter` | Submits support ticket |
| **GET** | `/contacts` | 🛠️ Admin | None | List contact tickets |
| **POST** | `/contacts/:id/reply` | 🛠️ Admin | None | Sends support reply email to contact |
| **GET** | `/notifications` | ✅ | None | Fetch user notification center |
| **PATCH** | `/notifications/read-all` | ✅ | None | Mark all notifications as read |
| **PATCH** | `/notifications/:id/read`| ✅ | None | Mark single notification as read |
| **DELETE**| `/notifications/delete-read`| ✅ | None | Delete all read notifications |
| **DELETE**| `/notifications/:id` | ✅ | None | Delete notification |

### 🛠️ Role & Permission Administrative REST (`/roles` & `/permissions`)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| **GET** | `/roles` | 🛠️ Admin | Lists system roles (manage_roles or manage_users required) |
| **GET** | `/roles/:id` | 🛠️ Admin | Fetch role details |
| **POST** | `/roles` | 🛠️ Admin | Create new role |
| **PUT** | `/roles/:id` | 🛠️ Admin | Update role display name |
| **DELETE**| `/roles/:id` | 🛠️ Admin | Delete role from database |
| **GET** | `/roles/:id/permissions`| 🛠️ Admin| Fetch permissions assigned to role |
| **POST** | `/roles/:id/permissions`| 🛠️ Admin| Assign permission to role |
| **POST** | `/roles/:id/permissions/bulk`| 🛠️ Admin| Bulk sync permissions list to role |
| **DELETE**| `/roles/:id/permissions/:permissionId`| 🛠️ Admin| Revoke permission from role |
| **GET** | `/permissions/me` | ✅ | Get permission keys assigned to current user role |
| **GET** | `/permissions` | 🛠️ Admin | List all system permission tokens |
| **GET** | `/permissions/:id` | 🛠️ Admin | Fetch permission details |
| **POST** | `/permissions` | 🛠️ Admin | Create system permission token |
| **PUT** | `/permissions/:id` | 🛠️ Admin | Update permission display name |
| **DELETE**| `/permissions/:id` | 🛠️ Admin | Delete permission |

---

## 🔒 Authentication & Session Lifecycle

NextCommerce Backend uses a stateless JWT strategy paired with db-tracked sessions for verification.

### 🔑 Key Cryptographic Design
- **Access Token**: Short-lived (default `5m`) JWT, containing user ID, role, and permission flags. Sent to the client via secure cookies.
- **Refresh Token**: Long-lived (default `7d`) JWT, stored in a db-tracked `Session` record. Sent via a secure HttpOnly cookie.
- **Active Session Revocation**: On every protected request, `authMiddleware.verifySession` verifies if the current session ID has been marked inactive or revoked in the database. If revoked, the request is rejected with `401 Unauthorized` and cookies are cleared.

---

## 🛡️ Role-Based Access Control (RBAC)

NextCommerce implements custom RBAC middleware checks:
- **System Permissions**: Defined inside `src/constants/rbac.ts` (e.g., `manage_users`, `manage_products`, `manage_orders`, `manage_vouchers`, `manage_contacts`, `manage_roles`).
- **Middleware Gating**:
  - `authMiddleware.requirePermission(permissionName)`: Grants entry only if the token contains the specific permission flag.
  - `authMiddleware.requireAnyPermission([perm1, perm2])`: Grants entry if the user holds at least one of the listed permissions.
- **Admin Bypass**: Users holding the default role `admin` automatically bypass all permission verifications.

---

## 📬 Transactional Outbox Pattern

To ensure reliable communication with external services (like sending orders alerts to Telegram channels), NextCommerce implements the **Transactional Outbox Pattern**:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant API as "Commerce-Api (Main Thread)"
    participant DB as "PostgreSQL DB"
    participant Outbox as "Outbox Processor (Background)"
    participant n8n as "n8n Webhook"
    participant Telegram as "Telegram Bot API"

    Customer->>API: POST /V1/orders/create
    activate API
    Note over API: Start DB Transaction
    API->>DB: Save Order & OrderItems
    API->>DB: Save WebhookOutbox record (status: PENDING, event: ORDER_CREATED)
    Note over API: Commit DB Transaction
    API-->>Customer: HTTP 201 Created (Order Code)
    deactivate API

    Note over Outbox: Polls DB every 5 seconds
    loop Outbox Processor polling
        Outbox->>DB: Fetch WebhookOutbox records (status: PENDING or nextRetryAt <= Now)
        DB-->>Outbox: Returns list of outbox events
        
        alt Outbox record found
            Outbox->>n8n: POST N8N_TELEGRAM_WEBHOOK_URL (Order Payload)
            activate n8n
            n8n->>Telegram: Send Alert message
            n8n-->>Outbox: HTTP 200 OK
            deactivate n8n
            Outbox->>DB: Update WebhookOutbox (status: SENT, sentAt: Now)
            
        else Post to n8n fails (Timeout / Error)
            Outbox->>DB: Increment retryCount, update status: PENDING, set nextRetryAt (backoff)
            alt retryCount > OUTBOX_MAX_RETRIES
                Outbox->>DB: Update status: FAILED, log lastError
            end
        end
    end
```

### ⚙️ Outbox Daemon Properties
- **Location**: `src/services/outboxProcessor.ts`
- **Polling interval**: 5 seconds (configurable via `OUTBOX_POLL_INTERVAL_MS`).
- **Reliability guarantee**: At-least-once delivery to n8n webhooks. If n8n crashes, requests are retried with exponential backoff up to `OUTBOX_MAX_RETRIES`.

---

## 🔌 Third-Party Integrations

- **Cloudinary**: Handles avatar and product image storage. Files uploaded via Multer are piped to Cloudinary.
- **Brevo SMTP**: Handles transactional emails (OTP verification, contact replies).
- **Giao Hàng Nhanh (GHN)**: Connects to GHN APIs for province/district lookup and shipping fee calculations.
- **PayPal Checkout**: Generates checkout bills and captures funding via the PayPal API.
- **Google & Facebook Social Login**: Handled via Passport strategies configured in `src/providers/passport.ts`.

---

## 🧠 AI & Recommendation Subsystems

- **Similarity Recommender**: When fetching similar products, `recommendation.service.ts` calls a Python-based recommendation service (`RECOMMENDER_API_URL`). If the service is offline, it falls back to category-based matching.
- **RAG Chatbot Proxy**: Handles user messages through `/ai-chat`. If an image is provided:
  1. The API calls the vector embedding service (`EMBEDDINGS_IMAGE_SEARCH_URL`) to find similar products in Qdrant.
  2. The matches are added to the query context.
  3. The request is proxied to n8n (`N8N_AI_CHAT_WEBHOOK_URL`) which formats the response.
- **Automated Reindexing**: Product additions or updates trigger debounced webhooks to reindex Python recommendation engines and Qdrant vector databases.

---

## 🔊 Socket.IO Real-Time Channels

The WebSocket server is mounted on the core HTTP server during bootstrap:

| Event | Direction | Description |
|-------|-----------|-------------|
| `ORDER_NEW` | Server ➡️ Admin | Dispatches real-time alerts to the admin panel |
| `ORDER_STATUS_UPDATED`| Server ➡️ Client | Updates order status screens in real-time |
| `join-room` | Client ➡️ Server | Join order tracking rooms |

---

## 🧪 Testing

Run tests using Vitest:

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run order and payment specific flows
pnpm test:order
```

---

## 🐳 Deployment (Docker)

To run the project in a Docker container:

### 📄 Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env

EXPOSE 8017
CMD ["pnpm", "start"]
```

### 📄 docker-compose.yml
```yaml
version: '3.8'

services:
  commerce-api:
    build: .
    container_name: commerce_backend_api
    ports:
      - "8017:8017"
    environment:
      - NODE_ENV=production
      - PORT=8017
    env_file:
      - .env
    restart: always
```

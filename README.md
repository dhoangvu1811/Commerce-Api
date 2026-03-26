# 🛒 Commerce API

> RESTful API hiệu năng cao, type-safe cho nền tảng thương mại điện tử — xây dựng với TypeScript, Express 5, PostgreSQL và Prisma ORM.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Express](https://img.shields.io/badge/Express-5.2-black?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-7.2-black?logo=prisma)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black?logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📑 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Kiến trúc dự án](#-kiến-trúc-dự-án)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Biến môi trường](#-biến-môi-trường)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints-103-endpoints)
- [Xác thực & Phân quyền](#-xác-thực--phân-quyền)
- [Realtime Socket.IO](#-realtime-socketio)
- [Tài liệu bổ sung](#-tài-liệu-bổ-sung)

---

## ✨ Tính năng chính

### 🔐 Xác thực nâng cao

- **JWT Access & Refresh Token** — Rotation tự động, lưu HttpOnly cookie
- **Session Management** — Quản lý phiên đăng nhập trong DB, theo dõi thiết bị & IP
- **OAuth 2.0** — Đăng nhập qua Google và Facebook
- **Email Verification** — Xác thực tài khoản qua email (Brevo)
- **Rate Limiting** — Chống brute force (login: 100 req/15 phút, email: 3 req/giờ)

### 🛡️ Phân quyền RBAC

- **3 Role**: Admin, Staff, User
- **8 Permission**: `MANAGE_PRODUCTS`, `MANAGE_USERS`, `MANAGE_ROLES`, `MANAGE_ORDERS`, `MANAGE_VOUCHERS`, `MANAGE_CONTACTS`, `VIEW_ANALYTICS`, `MANAGE_SYSTEM`
- **Dynamic RBAC**: Gán/thu hồi permission theo role linh hoạt qua API
- **Admin bypass**: Admin tự động có tất cả quyền

### 🛍️ E-Commerce Engine

- **Đặt hàng Atomic**: Transaction Prisma đảm bảo tính toàn vẹn dữ liệu
- **Order Lifecycle**: `PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED / CANCELLED`
- **Snapshot Pattern**: Lưu snapshot giá sản phẩm & voucher tại thời điểm đặt hàng
- **Voucher linh hoạt**: Hỗ trợ giảm giá theo % và cố định, giới hạn lượt dùng, giá trị đơn tối thiểu
- **Quản lý tồn kho tự động**: Trừ/hoàn stock khi đặt/hủy đơn
- **Order Logs**: Audit trail đầy đủ mọi thay đổi trạng thái đơn hàng
- **Payment tracking**: Hỗ trợ COD, Bank Transfer, MoMo, VNPay, ZaloPay

### 🔔 Realtime Notifications (Socket.IO)

- **6 Socket Events**: Thông báo realtime cho order lifecycle
- **Room-based**: `user:{id}` (cá nhân) + `admin` (tất cả admin/staff)
- **Anti self-notification**: Admin thao tác không nhận notification chính mình
- **DB persistence**: Notification lưu vào DB + emit socket song song

### 📦 Quản lý sản phẩm

- **CRUD sản phẩm** với upload multi-ảnh qua Cloudinary
- **Danh mục** (Category) với ảnh đại diện
- **Đánh giá sản phẩm** (Review) với rating 1-5 sao
- **Slug tự động** cho SEO-friendly URLs

### 🛒 Giỏ hàng & Wishlist

- **Cart**: Thêm/sửa/xóa, đồng bộ giỏ hàng guest sau đăng nhập
- **Wishlist**: Toggle yêu thích sản phẩm

### 👤 Quản lý User (Admin)

- **CRUD users**: Tạo, sửa, xóa, xóa hàng loạt
- **Kích hoạt/Vô hiệu hóa** tài khoản
- **Đổi role** cho user
- **Quản lý Sessions**: Xem, thu hồi session đơn lẻ hoặc toàn bộ

### 📮 Tiện ích khác

- **Shipping Address**: CRUD địa chỉ giao hàng, đặt mặc định
- **Contact Form**: Gửi liên hệ (public) + Admin xem danh sách
- **Health Check**: Kiểm tra trạng thái API + DB connection

---

## 🧪 Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|:---|:---|:---|
| Runtime | Node.js | >= 18 |
| Language | TypeScript (strict mode) | 5.9 |
| Framework | Express.js | 5.2 |
| Database | PostgreSQL | 16 |
| ORM | Prisma (adapter-pg) | 7.2 |
| Realtime | Socket.IO | 4.8 |
| Validation | Zod | 3 |
| Auth | JWT + Passport.js + Bcrypt | — |
| Email | Brevo (Sendinblue) | — |
| File Storage | Cloudinary (stream upload) | — |
| Build Tool | tsup (ESM, tree-shake) | — |
| Linter | ESLint (flat config) | 9 |
| Formatter | Prettier | 3 |
| Package Manager | pnpm | — |

---

## 📁 Kiến trúc dự án

```
Commerce-Api/
├── prisma/
│   ├── schema.prisma          # Database schema (20 models, 7 enums)
│   ├── seed.ts                # Seed data
│   └── migrations/            # Migration history
├── src/
│   ├── server.ts              # Entry point — HTTP + Socket.IO
│   ├── config/
│   │   ├── environment.ts     # Env variables loader
│   │   ├── prisma.ts          # Prisma client singleton (adapter-pg)
│   │   ├── cors.ts            # CORS whitelist strategy
│   │   └── socket.ts          # Socket.IO server + events + helpers
│   ├── constants/
│   │   └── rbac.ts            # Roles & Permissions constants
│   ├── controllers/           # 13 controllers — điều phối request
│   ├── services/              # 15 services — business logic
│   ├── models/                # 14 models — data access layer (Prisma)
│   ├── middlewares/
│   │   ├── authMiddleware.ts  # 9 auth functions (JWT, RBAC, session)
│   │   ├── errorHandlingMiddleware.ts
│   │   ├── rateLimitMiddleware.ts
│   │   └── multerUploadMiddleware.ts
│   ├── providers/
│   │   ├── JwtProvider.ts     # Token sign/verify/decode
│   │   ├── BrevoProvider.ts   # Transactional email
│   │   ├── CloudinaryProvider.ts  # Stream upload
│   │   └── passport.ts        # Google + Facebook OAuth
│   ├── routes/V1/
│   │   ├── index.ts           # Route aggregator
│   │   └── ...Router.ts       # 13 resource routers
│   ├── validations/           # 12 Zod validation schemas
│   ├── types/                 # 15 TypeScript type files
│   ├── helpers/               # Order helpers
│   └── utils/                 # ApiError, constants, formatters
├── docs/                      # 15 tài liệu chi tiết
├── .env.example
├── tsconfig.json
├── tsup.config.ts
└── package.json
```

**Mô hình 3 lớp:**

```
Request → Router → Validation (Zod) → Auth Middleware → Controller → Service → Model (Prisma) → PostgreSQL
                                                                        ↓
                                                              Socket.IO emit (realtime)
                                                                        ↓
                                                              Brevo email (nếu cần)
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- **Node.js** >= 18.x
- **pnpm** (hoặc npm/yarn)
- **PostgreSQL** (local hoặc hosted: Supabase, Neon, Railway...)

### Cài đặt

```bash
# Clone repository
git clone https://github.com/your-username/Commerce-Api.git
cd Commerce-Api

# Cài đặt dependencies
pnpm install

# Tạo file cấu hình
cp .env.example .env
# → Chỉnh sửa .env với thông tin database và API keys của bạn
```

### Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Đẩy schema lên database (development)
pnpm db:push

# Hoặc dùng migration (production)
pnpm db:migrate

# Seed dữ liệu mẫu (tuỳ chọn)
pnpm db:seed

# Mở Prisma Studio (GUI quản lý DB)
pnpm db:studio
```

### Chạy ứng dụng

```bash
# Development (hot reload với tsx watch)
pnpm dev

# Build production
pnpm build

# Chạy production
pnpm start
```

### Scripts khác

```bash
pnpm lint          # Kiểm tra linting
pnpm lint:fix      # Tự động sửa lint errors
pnpm format        # Format code với Prettier
pnpm type-check    # Kiểm tra TypeScript types
pnpm clean         # Xoá thư mục dist
```

---

## ⚙️ Biến môi trường

| Biến | Mô tả | Bắt buộc |
|:---|:---|:---:|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `BUILD_MODE` | `dev` / `production` | ✅ |
| `LOCAL_DEV_APP_HOST` | Host dev server (default: `localhost`) | |
| `LOCAL_DEV_APP_PORT` | Port dev server (default: `3000`) | |
| `JWT_ACCESS_SECRET` | Secret cho access token | ✅ |
| `JWT_ACCESS_EXPIRES_IN` | TTL access token (default: `5m`) | |
| `JWT_REFRESH_SECRET` | Secret cho refresh token | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | TTL refresh token (default: `7d`) | |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `BREVO_API_KEY` | Brevo transactional email API key | ✅ |
| `BREVO_SENDER_EMAIL` | Email sender address đã verify trên Brevo | ✅ |
| `BREVO_SENDER_NAME` | Email sender display name | |
| `ADMIN_NOTIFICATION_EMAIL` | Email nhận thông báo contact từ khách | ✅ |
| `ADMIN_EMAIL_ADDRESS` | Biến cũ, fallback tương thích ngược | |
| `ADMIN_EMAIL_NAME` | Biến cũ, fallback tương thích ngược | |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth app ID | |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth app secret | |
| `FACEBOOK_CALLBACK_URL` | Facebook OAuth callback URL | |
| `CLIENT_URL` | Frontend client base URL | ✅ |
| `OAUTH_SUCCESS_REDIRECT_URL` | Redirect URL sau OAuth thành công | |
| `OAUTH_FAILURE_REDIRECT_URL` | Redirect URL sau OAuth thất bại | |

---

## 🗄️ Database Schema

**20 models** và **7 enums** — Quan hệ đầy đủ:

```
┌─────────┐     ┌──────────────┐     ┌────────────┐
│  Role    │────<│     User     │>────│  Session   │
└────┬────┘     └──────┬───────┘     └────────────┘
     │                 │
┌────┴──────────┐      ├──────────────┬──────────────┬─────────────┐
│RolePermission │      │              │              │             │
└────┬──────────┘   ┌──┴───┐  ┌──────┴─────┐  ┌────┴────┐  ┌─────┴──────────┐
     │              │Review│  │  CartItem   │  │Wishlist │  │ShippingAddress │
┌────┴──────┐       └──┬───┘  └──────┬─────┘  └────┬────┘  └─────┬──────────┘
│Permission │          │             │              │             │
└───────────┘     ┌────┴────┐        │              │        ┌────┴────┐
                  │ Product │<───────┘──────────────┘        │  Order  │
                  └────┬────┘                                └────┬────┘
                       │                                          │
                  ┌────┴────────┐              ┌─────────┬────────┼─────────┬──────────┐
                  │ProductImage │              │OrderItem│  │OrderLog│  │Payment│  │OrderVoucher│
                  └─────────────┘              └─────────┘  └────────┘  └───────┘  └─────┬──────┘
                  ┌──────────┐                                                           │
                  │ Category │──── Product                                          ┌────┴───┐
                  └──────────┘                                                      │Voucher │
                                                                                    └────────┘
         ┌─────────────┐      ┌──────────────┐
         │   Contact    │      │ Notification │──── User
         └─────────────┘      └──────────────┘
```

### Enums

| Enum | Giá trị |
|:---|:---|
| `UserStatus` | `active`, `inactive`, `banned` |
| `AccountType` | `LOCAL`, `GOOGLE`, `FACEBOOK` |
| `Gender` | `male`, `female`, `other` |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED` |
| `PaymentMethod` | `COD`, `BANK_TRANSFER`, `MOMO`, `VNPAY`, `ZALOPAY` |
| `VoucherType` | `percent`, `fixed` |

---

## 🔗 API Endpoints (103 endpoints)

Base URL: `/V1`

### Utility

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/V1/status` | Kiểm tra API hoạt động |
| GET | `/V1/health` | Health check + DB ping |

### 👤 Users & Auth (31 endpoints)

<details>
<summary><b>Public (12)</b></summary>

| Method | Path | Mô tả |
|:---|:---|:---|
| POST | `/users/register` | Đăng ký tài khoản |
| POST | `/users/login` | Đăng nhập |
| POST | `/users/refresh-token` | Làm mới access token |
| POST | `/users/send-verification-email` | Gửi email xác thực |
| GET | `/users/verify-account` | Xác thực tài khoản qua link |
| GET | `/users/auth/google` | Bắt đầu Google OAuth |
| GET | `/users/auth/google/callback` | Google OAuth callback |
| GET | `/users/auth/google/failure` | Google OAuth failure |
| GET | `/users/auth/facebook` | Bắt đầu Facebook OAuth |
| GET | `/users/auth/facebook/callback` | Facebook OAuth callback |
| GET | `/users/auth/facebook/failure` | Facebook OAuth failure |
| POST | `/users/logout` | Đăng xuất |

</details>

<details>
<summary><b>User (6)</b></summary>

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| PUT | `/users/me` | ✅ | Cập nhật profile + upload avatar |
| PUT | `/users/me/password` | ✅ | Đổi mật khẩu |
| POST | `/users/upload-avatar` | ✅ | Upload avatar |
| GET | `/users/my-sessions` | ✅ | Xem sessions của tôi |
| POST | `/users/revoke-my-session` | ✅ | Thu hồi session |
| GET | `/users/me` | ✅ | Thông tin cá nhân |

</details>

<details>
<summary><b>Admin — MANAGE_USERS (13)</b></summary>

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/users/all` | Danh sách users |
| GET | `/users/overview` | Users + session summary |
| POST | `/users/create` | Tạo user mới |
| GET | `/users/details/:id` | Chi tiết user |
| PUT | `/users/update/:id` | Cập nhật user |
| DELETE | `/users/delete/:id` | Xóa user |
| POST | `/users/delete-multiple` | Xóa nhiều users |
| PATCH | `/users/activate/:userId` | Kích hoạt user |
| PATCH | `/users/deactivate/:userId` | Vô hiệu hóa user |
| PATCH | `/users/:id/role` | Đổi role user |
| POST | `/users/revoke-session` | Thu hồi session user |
| DELETE | `/users/revoke-all-sessions/:userId` | Thu hồi toàn bộ sessions |
| GET | `/users/sessions/:userId` | Xem sessions user |

</details>

### 📦 Products (7 endpoints)

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| GET | `/products/getAll` | — | Danh sách sản phẩm (phân trang, lọc) |
| GET | `/products/details/:id` | — | Chi tiết sản phẩm |
| POST | `/products/create` | 🔒 | Tạo sản phẩm |
| PUT | `/products/update/:id` | 🔒 | Cập nhật sản phẩm |
| DELETE | `/products/delete/:id` | 🔒 | Xóa sản phẩm |
| POST | `/products/deleteSelected` | 🔒 | Xóa nhiều sản phẩm |
| POST | `/products/upload-image` | 🔒 | Upload ảnh lên Cloudinary |

> 🔒 = `MANAGE_PRODUCTS`

### 📂 Categories (6 endpoints)

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| GET | `/categories/` | — | Tất cả danh mục |
| GET | `/categories/:id` | — | Chi tiết danh mục |
| POST | `/categories/` | 🔒 | Tạo danh mục + upload ảnh |
| PUT | `/categories/:id` | 🔒 | Cập nhật danh mục |
| DELETE | `/categories/:id` | 🔒 | Xóa danh mục |
| DELETE | `/categories/delete-many` | 🔒 | Xóa nhiều danh mục |

> 🔒 = `MANAGE_PRODUCTS`

### 🧾 Orders (11 endpoints)

<details>
<summary><b>User (4)</b></summary>

| Method | Path | Mô tả |
|:---|:---|:---|
| POST | `/orders/create` | Đặt hàng (atomic transaction) |
| GET | `/orders/my-orders` | Danh sách đơn hàng |
| GET | `/orders/details/:id` | Chi tiết đơn hàng |
| POST | `/orders/cancel/:id` | Hủy đơn hàng |

</details>

<details>
<summary><b>Admin — MANAGE_ORDERS (7)</b></summary>

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/orders/all` | Tất cả đơn hàng |
| GET | `/orders/admin/details/:id` | Chi tiết đơn (admin view) |
| PUT | `/orders/admin/update/:id` | Cập nhật trạng thái |
| PUT | `/orders/admin/update-payment/:id` | Cập nhật thanh toán |
| POST | `/orders/admin/mark-paid/:id` | Xác nhận đã thanh toán |
| POST | `/orders/admin/cancel/:id` | Admin hủy đơn |
| GET | `/orders/admin/logs/:id` | Lịch sử thay đổi đơn |

</details>

### 🎟️ Vouchers (8 endpoints)

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| POST | `/vouchers/verify` | — | Kiểm tra voucher hợp lệ |
| GET | `/vouchers/active` | — | Voucher đang hoạt động |
| GET | `/vouchers/all` | 🔒 | Tất cả vouchers |
| GET | `/vouchers/details/:id` | 🔒 | Chi tiết voucher |
| POST | `/vouchers/create` | 🔒 | Tạo voucher |
| PUT | `/vouchers/update/:id` | 🔒 | Cập nhật voucher |
| DELETE | `/vouchers/delete/:id` | 🔒 | Xóa voucher |
| POST | `/vouchers/delete-multiple` | 🔒 | Xóa nhiều vouchers |

> 🔒 = `MANAGE_VOUCHERS`

### 🛒 Cart (6 endpoints — Auth required)

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/cart/` | Lấy giỏ hàng |
| POST | `/cart/add` | Thêm sản phẩm |
| PUT | `/cart/update` | Cập nhật số lượng |
| DELETE | `/cart/remove/:productId` | Xóa sản phẩm |
| POST | `/cart/sync` | Đồng bộ giỏ hàng guest |
| DELETE | `/cart/clear` | Xóa toàn bộ giỏ |

### ❤️ Wishlist (2 endpoints — Auth required)

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/wishlist/` | Danh sách yêu thích |
| POST | `/wishlist/toggle` | Toggle sản phẩm |

### ⭐ Reviews (2 endpoints)

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| GET | `/reviews/products/:id` | — | Đánh giá sản phẩm |
| POST | `/reviews/` | ✅ | Tạo đánh giá |

### 📍 Shipping Addresses (6 endpoints — Auth required)

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/shipping-addresses/` | Danh sách địa chỉ |
| POST | `/shipping-addresses/` | Thêm địa chỉ |
| GET | `/shipping-addresses/:id` | Chi tiết địa chỉ |
| PUT | `/shipping-addresses/:id` | Cập nhật địa chỉ |
| DELETE | `/shipping-addresses/:id` | Xóa địa chỉ |
| PATCH | `/shipping-addresses/:id/default` | Đặt mặc định |

### 📮 Contacts (2 endpoints)

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| POST | `/contacts/` | — | Gửi liên hệ |
| GET | `/contacts/` | 🔒 | Xem liên hệ (MANAGE_CONTACTS) |

### 🔔 Notifications (5 endpoints — Auth required)

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/notifications/` | Thông báo của tôi |
| PATCH | `/notifications/read-all` | Đánh dấu đọc tất cả |
| PATCH | `/notifications/:id/read` | Đánh dấu đọc 1 thông báo |
| DELETE | `/notifications/delete-read` | Xóa thông báo đã đọc |
| DELETE | `/notifications/:id` | Xóa 1 thông báo |

### 🔑 Roles (9 endpoints — MANAGE_ROLES)

| Method | Path | Mô tả |
|:---|:---|:---|
| GET | `/roles/` | Danh sách roles |
| GET | `/roles/:id` | Chi tiết role |
| POST | `/roles/` | Tạo role |
| PUT | `/roles/:id` | Cập nhật role |
| DELETE | `/roles/:id` | Xóa role |
| GET | `/roles/:id/permissions` | Permissions của role |
| POST | `/roles/:id/permissions` | Gán permission |
| POST | `/roles/:id/permissions/bulk` | Gán nhiều permissions |
| DELETE | `/roles/:id/permissions/:permissionId` | Xóa permission |

### 🛡️ Permissions (6 endpoints)

| Method | Path | Auth | Mô tả |
|:---|:---|:---:|:---|
| GET | `/permissions/me` | ✅ | Permissions của tôi |
| GET | `/permissions/` | 🔒 | Tất cả permissions |
| GET | `/permissions/:id` | 🔒 | Chi tiết permission |
| POST | `/permissions/` | 🔒 | Tạo permission |
| PUT | `/permissions/:id` | 🔒 | Cập nhật permission |
| DELETE | `/permissions/:id` | 🔒 | Xóa permission |

> 🔒 = `MANAGE_ROLES`

---

## 🔐 Xác thực & Phân quyền

### JWT Token Flow

```
Login/OAuth → Access Token (5m, HttpOnly cookie) + Refresh Token (7d, HttpOnly cookie)
                    ↓
            Request → Cookie → verifyToken middleware → req.jwtDecoded
                    ↓ (expired)
            Client gọi /refresh-token → Cặp token mới
```

### Auth Middleware Pipeline

```
verifyToken → verifySession → verifyActiveUser → requirePermission('MANAGE_X')
     ↓              ↓               ↓                    ↓
  JWT valid?   Session active?   User active?    Has permission? (Admin bypass)
```

| Middleware | Chức năng |
|:---|:---|
| `verifyToken` | Verify JWT từ cookie/header. Trả 401 (invalid) hoặc 410 (expired) |
| `verifySession` | Kiểm tra session active trong DB |
| `verifyActiveUser` | Kiểm tra user status = active |
| `verifyUserOwnership` | Chỉ chủ sở hữu hoặc admin mới truy cập được |
| `verifyTokenForLogout` | Cho phép token expired (dùng cho logout) |
| `requirePermission(name)` | Kiểm tra 1 permission cụ thể |
| `requireAnyPermission(names[])` | Có ít nhất 1 permission |
| `requireAllPermissions(names[])` | Có tất cả permissions |

---

## 🔔 Realtime Socket.IO

### Kết nối

```
Client → socket.io-client → auth.token (JWT) → Server verify → Join room
```

- **Token extraction**: `auth.token` → `Authorization` header → Cookie `accessToken`
- **Rooms**: `user:{userId}` (personal) | `admin` (admin + staff auto-join)

### Socket Events

| Event | Trigger | Người nhận | Lưu DB? |
|:---|:---|:---|:---:|
| `order:new` | User đặt hàng | Admin room | ✅ (admin/staff) |
| `order:statusUpdated` | Admin đổi trạng thái | User + Admin room | ✅ (user) |
| `order:paymentUpdated` | Admin đổi thanh toán | User + Admin room | ✅ (user) |
| `order:markPaid` | Admin xác nhận thanh toán | User + Admin room | ✅ (user) |
| `order:cancelled` | Admin/User hủy đơn | User + Admin room | ✅ (phía nhận) |
| `notification:new` | Mỗi khi tạo notification DB | Người nhận cụ thể | ✅ |

### Anti Self-Notification

```javascript
// Admin thao tác → emit đến admin room LOẠI TRỪ chính mình
emitToAdmin(event, data, excludeUserId)
// → io.to('admin').except(`user:${excludeUserId}`).emit(event, data)
```

---

## 📚 Tài liệu bổ sung

Xem thư mục `docs/` để biết chi tiết:

| Tài liệu | Nội dung |
|:---|:---|
| [CLIENT_API_DOCUMENTATION.md](docs/CLIENT_API_DOCUMENTATION.md) | API doc cho client app |
| [CLIENT_AUTH_API_DOCUMENTATION.md](docs/CLIENT_AUTH_API_DOCUMENTATION.md) | Auth API chi tiết |
| [EMAIL_VERIFICATION_API.md](docs/EMAIL_VERIFICATION_API.md) | Flow xác thực email |
| [SESSION_MANAGEMENT_API.md](docs/SESSION_MANAGEMENT_API.md) | Quản lý sessions |
| [google-oauth-setup.md](docs/google-oauth-setup.md) | Hướng dẫn setup Google OAuth |
| [facebook-oauth-setup.md](docs/facebook-oauth-setup.md) | Hướng dẫn setup Facebook OAuth |
| [oauth-service-architecture.md](docs/oauth-service-architecture.md) | Kiến trúc OAuth service |
| [simplified-access-control.md](docs/simplified-access-control.md) | Thiết kế RBAC |
| [payment-method-logic.md](docs/payment-method-logic.md) | Logic thanh toán |
| [order-test-cases.md](docs/order-test-cases.md) | Test cases cho đơn hàng |
| [RACE_CONDITION_FIX.md](docs/RACE_CONDITION_FIX.md) | Fix race condition |

---

## 👨‍💻 Tác giả

**DHVuxDev**

---

<p align="center">
  Built with ❤️ for High Scalability and Performance
</p>

# Tài Liệu API Client - Authentication & User Management

> **Lưu ý:** Tài liệu này chỉ dành cho giao diện client (người dùng cuối). Các API quản lý admin không được liệt kê ở đây.

## 📋 Mục Lục
- [Giới Thiệu](#giới-thiệu)
- [Base URL](#base-url)
- [Authentication Flow](#authentication-flow)
- [Response Format](#response-format)
- [Authentication APIs](#authentication-apis)
  - [Đăng Ký](#1-đăng-ký-tài-khoản)
  - [Đăng Nhập](#2-đăng-nhập)
  - [Đăng Xuất](#3-đăng-xuất)
  - [Refresh Token](#4-làm-mới-access-token)
  - [Xác Thực Email](#5-gửi-email-xác-thực)
  - [Verify Account](#6-xác-minh-tài-khoản)
  - [Google OAuth](#7-đăng-nhập-google-oauth)
  - [Facebook OAuth](#8-đăng-nhập-facebook-oauth)
- [User Profile APIs](#user-profile-apis)
- [Session Management APIs](#session-management-apis)
- [Error Handling](#error-handling)
- [Security Notes](#security-notes)

---

## Giới Thiệu

API Authentication & User Management cung cấp đầy đủ các chức năng:
- ✅ Đăng ký & đăng nhập (email/password)
- ✅ OAuth 2.0 (Google, Facebook)
- ✅ JWT-based authentication với refresh token
- ✅ Email verification
- ✅ Quản lý profile cá nhân
- ✅ Quản lý sessions (multi-device)
- ✅ Đổi mật khẩu
- ✅ Upload avatar

---

## Base URL

```
Development: http://localhost:8017/V1
Production:  https://your-domain.com/V1
```

---

## Authentication Flow

### Flow Chuẩn (Email/Password)

```
1. Đăng ký → POST /users/register
2. Xác thực email → GET /users/verify-account?email=...&token=...
3. Đăng nhập → POST /users/login (nhận AT + RT qua cookies)
4. Sử dụng API → Gửi cookie tự động
5. Token hết hạn (410) → Auto refresh → POST /users/refresh-token
6. Đăng xuất → POST /users/logout
```

### Flow OAuth (Google/Facebook)

```
1. Redirect → GET /users/auth/google (hoặc /facebook)
2. User xác thực trên Google/Facebook
3. Callback → GET /users/auth/google/callback
4. Redirect về client với cookies → Success
5. Sử dụng API như bình thường
```

---

## Response Format

Tất cả API responses đều tuân theo format chuẩn:

### Success Response

```json
{
  "code": 200,
  "message": "Thông báo thành công",
  "data": {
    // Dữ liệu trả về
  }
}
```

### Error Response

```json
{
  "code": 400,
  "message": "Thông báo lỗi",
  "data": null
}
```

---

## Authentication APIs

### 1. Đăng Ký Tài Khoản

Tạo tài khoản mới với email và mật khẩu.

**Endpoint:**
```
POST /V1/users/register
```

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Tên đầy đủ (2-100 ký tự) |
| `email` | string | Yes | Email hợp lệ |
| `password` | string | Yes | Mật khẩu (min 8 ký tự, có chữ hoa, chữ thường, số) |
| `confirmPassword` | string | Yes | Xác nhận mật khẩu (phải khớp) |
| `phone` | string | No | Số điện thoại (10-15 ký tự) |
| `address` | string | No | Địa chỉ (max 500 ký tự) |
| `dateOfBirth` | string | No | Ngày sinh (ISO 8601: YYYY-MM-DD) |
| `gender` | string | No | Giới tính (`male`, `female`, `other`) |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    phone: '0901234567',
    address: 'Hà Nội, Việt Nam',
    dateOfBirth: '1995-05-15',
    gender: 'male'
  })
})

const data = await response.json()
```

**Response Success (201):**

```json
{
  "code": 201,
  "message": "Đăng ký tài khoản thành công",
  "data": {
    "id": 123,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phoneNumber": "0901234567",
    "address": "Hà Nội, Việt Nam",
    "avatar": null,
    "dateOfBirth": "1995-05-15T00:00:00.000Z",
    "gender": "male",
    "emailVerified": false,
    "typeAccount": "LOCAL",
    "status": "inactive",
    "roleId": 2,
    "createdAt": "2026-02-08T10:30:00.000Z",
    "updatedAt": "2026-02-08T10:30:00.000Z"
  }
}
```

**Response Error (409):**

```json
{
  "code": 409,
  "message": "Email \"nguyenvana@example.com\" đã được sử dụng",
  "data": null
}
```

**Response Error (422):**

```json
{
  "code": 422,
  "message": "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số",
  "data": null
}
```

**Rate Limit:** 5 requests / 15 phút / IP

**Lưu ý:**
- ⚠️ Tài khoản mới có `status: "inactive"` và `emailVerified: false`
- ⚠️ Cần xác thực email để kích hoạt tài khoản
- ⚠️ Mật khẩu phải: min 8 ký tự, có chữ hoa, chữ thường, số

---

### 2. Đăng Nhập

Xác thực người dùng và nhận JWT tokens.

**Endpoint:**
```
POST /V1/users/login
```

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email đăng nhập |
| `password` | string | Yes | Mật khẩu |
| `loginContext` | string | No | `client` (default) hoặc `admin` |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include', // ⚠️ Quan trọng: Để nhận cookies
  body: JSON.stringify({
    email: 'nguyenvana@example.com',
    password: 'Password123!'
  })
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": 123,
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "phoneNumber": "0901234567",
      "address": "Hà Nội, Việt Nam",
      "avatar": "https://example.com/avatar.jpg",
      "dateOfBirth": "1995-05-15T00:00:00.000Z",
      "gender": "male",
      "emailVerified": true,
      "typeAccount": "LOCAL",
      "status": "active",
      "roleId": 2,
      "lastLogin": "2026-02-08T10:35:00.000Z",
      "createdAt": "2026-02-08T10:30:00.000Z",
      "updatedAt": "2026-02-08T10:35:00.000Z"
    },
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Set-Cookie Headers (Automatic):**
```
Set-Cookie: accessToken=eyJhbGc...; HttpOnly; Secure; SameSite=None; Max-Age=1800
Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=None; Max-Age=604800
```

**Response Error (406):**

```json
{
  "code": 406,
  "message": "Email hoặc mật khẩu không đúng",
  "data": null
}
```

**Rate Limit:** 5 requests / 15 phút / IP

**Cookies Details:**

| Cookie | Thời Gian Sống | Mục Đích |
|--------|----------------|----------|
| `accessToken` | 30 phút | Xác thực API requests |
| `refreshToken` | 7 ngày | Làm mới access token |

**Lưu ý:**
- ✅ Tokens được gửi qua **HttpOnly cookies** (bảo mật cao, tránh XSS)
- ✅ Multi-device login: Mỗi thiết bị có `sessionId` riêng
- ✅ Frontend cần set `credentials: 'include'` để nhận/gửi cookies
- ⚠️ Admin login: Set `loginContext: "admin"` (chỉ admin/staff mới login được)

---

### 3. Đăng Xuất

Đăng xuất và thu hồi session hiện tại.

**Endpoint:**
```
POST /V1/users/logout
```

**Request Headers:**
```
Cookie: accessToken=...; refreshToken=...
```

**Request Body:** Không cần

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/logout', {
  method: 'POST',
  credentials: 'include' // Gửi cookies
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Đăng xuất thành công",
  "data": null
}
```

**Set-Cookie Headers (Clear Cookies):**
```
Set-Cookie: accessToken=; Max-Age=0
Set-Cookie: refreshToken=; Max-Age=0
```

**Lưu ý:**
- ✅ Hoạt động ngay cả khi access token đã hết hạn
- ✅ Session được đánh dấu logout trong database (tracking)
- ✅ Cookies tự động bị xóa

---

### 4. Làm Mới Access Token

Sử dụng refresh token để lấy access token mới khi hết hạn.

**Endpoint:**
```
POST /V1/users/refresh-token
```

**Request Headers:**
```
Cookie: refreshToken=...
```

**Request Body:** Không cần

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/refresh-token', {
  method: 'POST',
  credentials: 'include' // Gửi refresh token cookie
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Làm mới token thành công",
  "data": null
}
```

**Set-Cookie Headers:**
```
Set-Cookie: accessToken=NEW_TOKEN_HERE; HttpOnly; Secure; SameSite=None; Max-Age=1800
```

**Response Error (401):**

```json
{
  "code": 401,
  "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "data": null
}
```

**Lưu ý:**
- ✅ Chỉ cập nhật access token, refresh token giữ nguyên
- ✅ Frontend nên tự động gọi khi gặp lỗi 410 GONE
- ✅ Kiểm tra session còn active không (hỗ trợ revoke)

**Auto-Refresh Implementation:**

```typescript
// axios interceptor example
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8017/V1',
  withCredentials: true
})

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    
    // Nếu access token hết hạn (410 GONE)
    if (error.response?.status === 410 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Gọi refresh token
        await api.post('/users/refresh-token')
        
        // Retry request ban đầu
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh thất bại → Redirect login
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)
```

---

### 5. Gửi Email Xác Thực

Gửi email chứa link xác thực tài khoản.

**Endpoint:**
```
POST /V1/users/send-verification-email
```

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Email cần xác thực |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/send-verification-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'nguyenvana@example.com'
  })
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Email xác thực đã được gửi tới nguyenvana@example.com. Vui lòng kiểm tra hộp thư.",
  "data": {
    "email": "nguyenvana@example.com",
    "expiresIn": "24h"
  }
}
```

**Response Error (404):**

```json
{
  "code": 404,
  "message": "Email không tồn tại trong hệ thống",
  "data": null
}
```

**Response Error (400):**

```json
{
  "code": 400,
  "message": "Tài khoản đã được xác thực trước đó",
  "data": null
}
```

**Rate Limit:** 3 requests / 15 phút / IP (chặt hơn để tránh spam)

**Lưu ý:**
- ⚠️ Token xác thực có hiệu lực 24 giờ
- ⚠️ Email chỉ gửi cho tài khoản chưa verify
- ✅ Link trong email: `https://your-domain.com/verify?email=...&token=...`

---

### 6. Xác Minh Tài Khoản

Xác thực email và kích hoạt tài khoản.

**Endpoint:**
```
GET /V1/users/verify-account
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Email cần xác thực |
| `token` | string | Yes | Token từ email |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const email = 'nguyenvana@example.com'
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

const response = await fetch(
  `http://localhost:8017/V1/users/verify-account?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
)

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Xác minh tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.",
  "data": {
    "id": 123,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "emailVerified": true,
    "status": "active",
    "roleId": 2,
    "createdAt": "2026-02-08T10:30:00.000Z",
    "updatedAt": "2026-02-08T11:00:00.000Z"
  }
}
```

**Response Error (401):**

```json
{
  "code": 401,
  "message": "Token xác thực không hợp lệ hoặc đã hết hạn",
  "data": null
}
```

**Response Error (404):**

```json
{
  "code": 404,
  "message": "Email không tồn tại trong hệ thống",
  "data": null
}
```

**Lưu ý:**
- ✅ Sau verify thành công: `emailVerified: true`, `status: "active"`
- ✅ User có thể login ngay sau khi verify
- ⚠️ Token chỉ dùng được 1 lần

---

### 7. Đăng Nhập Google OAuth

Xác thực qua Google OAuth 2.0.

**Step 1: Redirect to Google**

**Endpoint:**
```
GET /V1/users/auth/google
```

**Request Example:**

```javascript
// Redirect user tới Google login
window.location.href = 'http://localhost:8017/V1/users/auth/google'
```

**Google sẽ hiển thị:**
- Trang đăng nhập Google
- Yêu cầu cấp quyền (profile, email)

**Step 2: Callback từ Google**

**Endpoint (Auto):**
```
GET /V1/users/auth/google/callback
```

**Flow:**
1. Google redirect về callback với authorization code
2. Backend exchange code → lấy user info từ Google
3. Tạo/cập nhật user trong database
4. Tạo session và JWT tokens
5. Set cookies
6. Redirect về frontend

**Success Redirect:**
```
https://your-frontend-domain.com/auth/success
```

**Failure Redirect:**
```
https://your-frontend-domain.com/auth/failure?error=oauth_failed
```

**Cookies (Automatic):**
```
Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=None; Max-Age=1800
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=None; Max-Age=604800
```

**Frontend Implementation:**

```typescript
// React Example
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Success page
function AuthSuccess() {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Cookies đã được set tự động
    // Redirect về trang chính
    setTimeout(() => {
      navigate('/dashboard')
    }, 1000)
  }, [])
  
  return <div>Đăng nhập thành công! Đang chuyển hướng...</div>
}

// Failure page
function AuthFailure() {
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  
  return (
    <div>
      <p>Đăng nhập thất bại: {error}</p>
      <button onClick={() => window.location.href = '/login'}>
        Thử lại
      </button>
    </div>
  )
}

// Login page
function Login() {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8017/V1/users/auth/google'
  }
  
  return (
    <button onClick={handleGoogleLogin}>
      <img src="/google-icon.png" alt="Google" />
      Đăng nhập với Google
    </button>
  )
}
```

**Lưu ý:**
- ✅ Tự động tạo tài khoản nếu lần đầu đăng nhập
- ✅ `typeAccount: "GOOGLE"`, `emailVerified: true`, `status: "active"`
- ✅ Không cần mật khẩu, không cần verify email
- ⚠️ Yêu cầu cấu hình Google OAuth Client ID trong backend

---

### 8. Đăng Nhập Facebook OAuth

Xác thực qua Facebook OAuth 2.0.

**Step 1: Redirect to Facebook**

**Endpoint:**
```
GET /V1/users/auth/facebook
```

**Request Example:**

```javascript
// Redirect user tới Facebook login
window.location.href = 'http://localhost:8017/V1/users/auth/facebook'
```

**Step 2: Callback từ Facebook**

**Endpoint (Auto):**
```
GET /V1/users/auth/facebook/callback
```

**Flow:** Tương tự Google OAuth

**Success Redirect:**
```
https://your-frontend-domain.com/auth/success
```

**Failure Redirect:**
```
https://your-frontend-domain.com/auth/failure?error=oauth_failed
```

**Frontend Implementation:** Tương tự Google, thay đổi URL

```typescript
const handleFacebookLogin = () => {
  window.location.href = 'http://localhost:8017/V1/users/auth/facebook'
}
```

**Lưu ý:**
- ✅ Tự động tạo tài khoản nếu lần đầu đăng nhập
- ✅ `typeAccount: "FACEBOOK"`, `emailVerified: true`, `status: "active"`
- ⚠️ Yêu cầu cấu hình Facebook App ID trong backend

---

## User Profile APIs

### 1. Lấy Thông Tin User Hiện Tại

Lấy thông tin profile của user đang đăng nhập.

**Endpoint:**
```
GET /V1/users/me
```

**Authentication:** Required (Access Token via Cookie)

**Request Headers:**
```
Cookie: accessToken=...
```

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/me', {
  credentials: 'include' // Gửi cookies
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy thông tin người dùng hiện tại thành công",
  "data": {
    "id": 123,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phoneNumber": "0901234567",
    "address": "Hà Nội, Việt Nam",
    "avatar": "https://cloudinary.com/avatar.jpg",
    "dateOfBirth": "1995-05-15T00:00:00.000Z",
    "gender": "male",
    "emailVerified": true,
    "typeAccount": "LOCAL",
    "status": "active",
    "roleId": 2,
    "lastLogin": "2026-02-08T10:35:00.000Z",
    "createdAt": "2026-02-08T10:30:00.000Z",
    "updatedAt": "2026-02-08T10:35:00.000Z"
  }
}
```

**Response Error (401):**

```json
{
  "code": 401,
  "message": "Vui lòng đăng nhập để tiếp tục",
  "data": null
}
```

---

### 2. Cập Nhật Thông Tin Cá Nhân

Cập nhật profile của user hiện tại.

**Endpoint:**
```
PUT /V1/users/me
```

**Authentication:** Required (Access Token via Cookie)

**Request Headers:**
```
Content-Type: multipart/form-data (nếu có avatar)
Content-Type: application/json (nếu không có avatar)
Cookie: accessToken=...
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Tên đầy đủ (2-100 ký tự) |
| `phone` | string | No | Số điện thoại (10-15 ký tự) |
| `address` | string | No | Địa chỉ (max 500 ký tự) |
| `avatar` | file | No | File ảnh avatar (multipart/form-data) |
| `dateOfBirth` | string | No | Ngày sinh (YYYY-MM-DD) |
| `gender` | string | No | Giới tính (`male`, `female`, `other`) |

**Request Example (JSON):**

```javascript
// JavaScript/TypeScript Example (No Avatar)
const response = await fetch('http://localhost:8017/V1/users/me', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Nguyễn Văn A Updated',
    phone: '0987654321',
    address: 'Hồ Chí Minh, Việt Nam',
    gender: 'male'
  })
})

const data = await response.json()
```

**Request Example (With Avatar):**

```javascript
// JavaScript/TypeScript Example (With Avatar Upload)
const formData = new FormData()
formData.append('name', 'Nguyễn Văn A')
formData.append('phone', '0987654321')
formData.append('avatar', fileInput.files[0]) // File object từ input

const response = await fetch('http://localhost:8017/V1/users/me', {
  method: 'PUT',
  credentials: 'include',
  body: formData // Không set Content-Type, browser tự động set
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Cập nhật thông tin cá nhân thành công",
  "data": {
    "id": 123,
    "name": "Nguyễn Văn A Updated",
    "email": "nguyenvana@example.com",
    "phoneNumber": "0987654321",
    "address": "Hồ Chí Minh, Việt Nam",
    "avatar": "https://cloudinary.com/new-avatar.jpg",
    "dateOfBirth": "1995-05-15T00:00:00.000Z",
    "gender": "male",
    "emailVerified": true,
    "typeAccount": "LOCAL",
    "status": "active",
    "roleId": 2,
    "updatedAt": "2026-02-08T11:00:00.000Z"
  }
}
```

**Lưu ý:**
- ✅ Tất cả fields đều optional, chỉ cần gửi field cần update
- ✅ Avatar tự động upload lên Cloudinary
- ⚠️ Không thể thay đổi email qua endpoint này
- ⚠️ User phải có `status: "active"` mới update được

---

### 3. Đổi Mật Khẩu

Thay đổi mật khẩu của user hiện tại.

**Endpoint:**
```
PUT /V1/users/me/password
```

**Authentication:** Required (Access Token via Cookie)

**Request Headers:**
```
Content-Type: application/json
Cookie: accessToken=...
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPassword` | string | No* | Mật khẩu hiện tại (*bắt buộc với LOCAL account) |
| `newPassword` | string | Yes | Mật khẩu mới (min 8 ký tự, chữ hoa, thường, số) |
| `confirmPassword` | string | Yes | Xác nhận mật khẩu mới |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/me/password', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    currentPassword: 'Password123!',
    newPassword: 'NewPassword456!',
    confirmPassword: 'NewPassword456!'
  })
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Đổi mật khẩu thành công",
  "data": {
    "id": 123,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "updatedAt": "2026-02-08T11:15:00.000Z"
  }
}
```

**Response Error (406):**

```json
{
  "code": 406,
  "message": "Mật khẩu hiện tại không đúng",
  "data": null
}
```

**Response Error (422):**

```json
{
  "code": 422,
  "message": "Xác nhận mật khẩu không khớp",
  "data": null
}
```

**Lưu ý:**
- ⚠️ LOCAL accounts (email/password): Bắt buộc `currentPassword`
- ✅ OAuth accounts (Google/Facebook): Không cần `currentPassword` (tạo mật khẩu lần đầu)
- ✅ Mật khẩu mới phải khác mật khẩu cũ

---

### 4. Upload Avatar

Upload ảnh avatar riêng biệt (trả về URL để sử dụng).

**Endpoint:**
```
POST /V1/users/upload-avatar
```

**Authentication:** Required (Access Token via Cookie)

**Request Headers:**
```
Content-Type: multipart/form-data
Cookie: accessToken=...
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `avatar` | file | Yes | File ảnh (jpg, png, gif, max 5MB) |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const formData = new FormData()
formData.append('avatar', fileInput.files[0])

const response = await fetch('http://localhost:8017/V1/users/upload-avatar', {
  method: 'POST',
  credentials: 'include',
  body: formData
})

const data = await response.json()
```

**React Example:**

```typescript
import { useState } from 'react'

function AvatarUpload() {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    
    const formData = new FormData()
    formData.append('avatar', file)
    
    try {
      const response = await fetch('http://localhost:8017/V1/users/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      
      const data = await response.json()
      
      if (data.code === 200) {
        setAvatarUrl(data.data.avatarUrl)
        // Cập nhật profile với URL mới
        await updateProfile({ avatar: data.data.avatarUrl })
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {uploading && <p>Đang upload...</p>}
      {avatarUrl && <img src={avatarUrl} alt="Avatar" />}
    </div>
  )
}
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Upload ảnh thành công",
  "data": {
    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1234567890/users-commerceweb/avatar.jpg",
    "publicId": "users-commerceweb/avatar"
  }
}
```

**Response Error (400):**

```json
{
  "code": 400,
  "message": "Vui lòng chọn ảnh avatar để upload",
  "data": null
}
```

**Lưu ý:**
- ✅ Ảnh tự động upload lên Cloudinary
- ✅ Response trả về `avatarUrl` → dùng để cập nhật profile
- ⚠️ Max file size: 5MB
- ⚠️ Accepted formats: jpg, jpeg, png, gif, webp

---

## Session Management APIs

### 1. Xem Các Phiên Đăng Nhập

Lấy danh sách tất cả sessions của user hiện tại (multi-device tracking).

**Endpoint:**
```
GET /V1/users/my-sessions
```

**Authentication:** Required (Access Token via Cookie)

**Request Headers:**
```
Cookie: accessToken=...
```

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/my-sessions', {
  credentials: 'include'
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy danh sách phiên đăng nhập thành công",
  "data": {
    "sessions": [
      {
        "sessionId": "550e8400-e29b-41d4-a716-446655440000",
        "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "ipAddress": "123.45.67.89",
        "createdAt": "2026-02-08T10:35:00.000Z",
        "expiresAt": "2026-02-15T10:35:00.000Z",
        "isActive": true,
        "isCurrent": true
      },
      {
        "sessionId": "660e8400-e29b-41d4-a716-446655440001",
        "deviceInfo": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) Safari/605.1.15",
        "ipAddress": "123.45.67.90",
        "createdAt": "2026-02-07T15:20:00.000Z",
        "expiresAt": "2026-02-14T15:20:00.000Z",
        "isActive": true,
        "isCurrent": false
      }
    ],
    "total": 2
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | ID unique của session |
| `deviceInfo` | string | User-Agent của thiết bị |
| `ipAddress` | string | IP address đăng nhập |
| `createdAt` | string | Thời gian tạo session |
| `expiresAt` | string | Thời gian hết hạn (7 ngày) |
| `isActive` | boolean | Session còn hoạt động không |
| `isCurrent` | boolean | Session hiện tại (thiết bị đang dùng) |

**Lưu ý:**
- ✅ `isCurrent: true` là session của thiết bị đang request
- ✅ Hiển thị tất cả sessions đang active
- ✅ Không bao gồm sessions đã logout hoặc expired

---

### 2. Thu Hồi Phiên Đăng Nhập

Logout thiết bị khác (revoke session by ID).

**Endpoint:**
```
POST /V1/users/revoke-my-session
```

**Authentication:** Required (Access Token via Cookie)

**Request Headers:**
```
Content-Type: application/json
Cookie: accessToken=...
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | ID của session cần thu hồi |

**Request Example:**

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/users/revoke-my-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    sessionId: '660e8400-e29b-41d4-a716-446655440001'
  })
})

const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Thu hồi phiên đăng nhập thành công",
  "data": {
    "sessionId": "660e8400-e29b-41d4-a716-446655440001",
    "message": "Thu hồi phiên đăng nhập thành công. Thiết bị sẽ bị logout trong vòng 5 phút"
  }
}
```

**Response Error (404):**

```json
{
  "code": 404,
  "message": "Không tìm thấy phiên đăng nhập",
  "data": null
}
```

**Response Error (403):**

```json
{
  "code": 403,
  "message": "Bạn không có quyền thu hồi phiên đăng nhập này",
  "data": null
}
```

**Lưu ý:**
- ✅ User chỉ có thể revoke sessions của chính mình
- ⚠️ Thiết bị bị revoke sẽ logout trong vòng **5 phút** (khi access token hết hạn)
- ⚠️ Không thể revoke session hiện tại (phải dùng `/logout`)

**React Example:**

```typescript
function SessionManagement() {
  const [sessions, setSessions] = useState([])
  
  const fetchSessions = async () => {
    const response = await fetch('http://localhost:8017/V1/users/my-sessions', {
      credentials: 'include'
    })
    const data = await response.json()
    setSessions(data.data.sessions)
  }
  
  const revokeSession = async (sessionId: string) => {
    if (!confirm('Bạn muốn đăng xuất thiết bị này?')) return
    
    const response = await fetch('http://localhost:8017/V1/users/revoke-my-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionId })
    })
    
    if (response.ok) {
      alert('Thu hồi thành công!')
      fetchSessions() // Refresh list
    }
  }
  
  return (
    <div>
      <h2>Các thiết bị đã đăng nhập</h2>
      {sessions.map(session => (
        <div key={session.sessionId}>
          <p><strong>{session.deviceInfo}</strong></p>
          <p>IP: {session.ipAddress}</p>
          <p>Đăng nhập: {new Date(session.createdAt).toLocaleString()}</p>
          
          {session.isCurrent ? (
            <span>✓ Thiết bị hiện tại</span>
          ) : (
            <button onClick={() => revokeSession(session.sessionId)}>
              Đăng xuất thiết bị này
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo resource thành công (register) |
| 400 | Bad Request | Request không hợp lệ |
| 401 | Unauthorized | Chưa đăng nhập hoặc token không hợp lệ |
| 403 | Forbidden | Không có quyền truy cập |
| 404 | Not Found | Không tìm thấy resource |
| 406 | Not Acceptable | Email/password không đúng |
| 409 | Conflict | Email đã tồn tại |
| 410 | Gone | Access token đã hết hạn → Cần refresh |
| 422 | Unprocessable Entity | Dữ liệu validation lỗi |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Lỗi server |

### Common Error Messages

**Authentication Errors:**
- `Vui lòng đăng nhập để tiếp tục` (401)
- `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` (401)
- `Phiên đăng nhập không hợp lệ` (401)
- `Email hoặc mật khẩu không đúng` (406)

**Validation Errors:**
- `Email "..." đã được sử dụng` (409)
- `Mật khẩu phải có ít nhất 8 ký tự...` (422)
- `Xác nhận mật khẩu không khớp` (422)

**Session Errors:**
- `Phiên đăng nhập đã bị thu hồi hoặc hết hạn` (401)
- `Không tìm thấy phiên đăng nhập` (404)

**Rate Limit Error:**
- Header: `X-RateLimit-Limit: 5`
- Header: `X-RateLimit-Remaining: 0`
- Header: `Retry-After: 900` (seconds)
- Body: `Too Many Requests` (429)

---

## Security Notes

### 🔒 Bảo Mật

**1. Cookies Security:**
- ✅ `HttpOnly`: Không thể truy cập từ JavaScript (tránh XSS)
- ✅ `Secure`: Chỉ gửi qua HTTPS (production)
- ✅ `SameSite=None`: Cho phép cross-site (cần cho SPA riêng domain)

**2. Token Expiration:**
- Access Token: **30 phút** (ngắn để giảm rủi ro)
- Refresh Token: **7 ngày** (dài để UX tốt)

**3. Rate Limiting:**
- Login/Register: **5 requests / 15 phút / IP**
- Send Email: **3 requests / 15 phút / IP**

**4. Password Requirements:**
- Minimum 8 ký tự
- Phải có chữ hoa (A-Z)
- Phải có chữ thường (a-z)
- Phải có số (0-9)
- Khuyến nghị: Thêm ký tự đặc biệt (!@#$...)

**5. Session Management:**
- ✅ Multi-device support với unique sessionId
- ✅ Tracking device info và IP
- ✅ Revoke sessions từ xa (logout thiết bị khác)
- ✅ Auto-expire sessions sau 7 ngày

### 🛡️ Best Practices cho Frontend

**1. CORS Configuration:**
```javascript
// Luôn set credentials: 'include' để nhận/gửi cookies
fetch(url, {
  credentials: 'include'
})
```

**2. Auto-Refresh Token:**
```javascript
// Implement interceptor để tự động refresh khi gặp 410
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 410 && !error.config._retry) {
      error.config._retry = true
      await refreshToken()
      return axios(error.config)
    }
    return Promise.reject(error)
  }
)
```

**3. Secure Storage:**
```javascript
// ❌ KHÔNG lưu tokens trong localStorage/sessionStorage
// ✅ Dùng HttpOnly cookies (automatic)
```

**4. Logout trên tất cả tabs:**
```javascript
// Sử dụng BroadcastChannel để sync logout
const logoutChannel = new BroadcastChannel('logout')

logoutChannel.onmessage = () => {
  window.location.href = '/login'
}

async function logout() {
  await fetch('/V1/users/logout', { credentials: 'include' })
  logoutChannel.postMessage('logout')
  window.location.href = '/login'
}
```

---

## TypeScript Types

### Type Definitions cho Frontend

```typescript
// types/auth.ts

export interface User {
  id: number
  name: string
  email: string
  phoneNumber?: string | null
  address?: string | null
  avatar?: string | null
  dateOfBirth?: string | null
  gender?: 'male' | 'female' | 'other' | null
  emailVerified: boolean
  typeAccount: 'LOCAL' | 'GOOGLE' | 'FACEBOOK'
  status: 'active' | 'inactive' | 'banned'
  roleId: number
  lastLogin?: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginResponse {
  code: number
  message: string
  data: {
    user: User
    sessionId: string
  }
}

export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T | null
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
  address?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
}

export interface LoginInput {
  email: string
  password: string
  loginContext?: 'admin' | 'client'
}

export interface UpdateProfileInput {
  name?: string
  phone?: string
  address?: string
  avatar?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
}

export interface UpdatePasswordInput {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
}

export interface Session {
  sessionId: string
  deviceInfo: string
  ipAddress: string
  createdAt: string
  expiresAt: string
  isActive: boolean
  isCurrent: boolean
}

export interface SessionsResponse {
  sessions: Session[]
  total: number
}
```

### Service Example

```typescript
// services/authService.ts
import type {
  User,
  LoginInput,
  RegisterInput,
  ApiResponse,
  LoginResponse,
  UpdateProfileInput,
  UpdatePasswordInput,
  SessionsResponse
} from '../types/auth'

const API_BASE_URL = 'http://localhost:8017/V1'

export const authService = {
  // Đăng ký
  async register(input: RegisterInput): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    return response.json()
  },

  // Đăng nhập
  async login(input: LoginInput): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    })
    return response.json()
  },

  // Đăng xuất
  async logout(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/users/logout`, {
      method: 'POST',
      credentials: 'include'
    })
    return response.json()
  },

  // Refresh token
  async refreshToken(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/users/refresh-token`, {
      method: 'POST',
      credentials: 'include'
    })
    return response.json()
  },

  // Lấy thông tin user hiện tại
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      credentials: 'include'
    })
    return response.json()
  },

  // Cập nhật profile
  async updateProfile(input: UpdateProfileInput): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    })
    return response.json()
  },

  // Đổi mật khẩu
  async updatePassword(input: UpdatePasswordInput): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/users/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input)
    })
    return response.json()
  },

  // Upload avatar
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string; publicId: string }>> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    const response = await fetch(`${API_BASE_URL}/users/upload-avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
    return response.json()
  },

  // Gửi email xác thực
  async sendVerificationEmail(email: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/users/send-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    return response.json()
  },

  // Xác minh tài khoản
  async verifyAccount(email: string, token: string): Promise<ApiResponse<User>> {
    const response = await fetch(
      `${API_BASE_URL}/users/verify-account?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
    )
    return response.json()
  },

  // Lấy sessions
  async getMySessions(): Promise<ApiResponse<SessionsResponse>> {
    const response = await fetch(`${API_BASE_URL}/users/my-sessions`, {
      credentials: 'include'
    })
    return response.json()
  },

  // Revoke session
  async revokeSession(sessionId: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/users/revoke-my-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionId })
    })
    return response.json()
  }
}
```

---

## Support

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub repository hoặc liên hệ team phát triển.

**Created:** February 8, 2026  
**Version:** 1.0.0  
**Author:** E-commerce API Team

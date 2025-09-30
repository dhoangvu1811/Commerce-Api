# Session Management API

## Tổng quan

API quản lý phiên đăng nhập (session) với chức năng revoke user. Mỗi khi user đăng nhập, một sessionId unique sẽ được tạo và lưu trong database. Admin có thể revoke sessions để logout user trong vòng 5 phút (khi AccessToken hết hạn).

## Luồng hoạt động

### 1. Khi Login

- Tạo sessionId unique (UUID)
- Thêm sessionId vào metadata của AccessToken và RefreshToken
- Lưu session vào DB với thông tin: sessionId, userId, refreshToken, deviceInfo, ipAddress, expiresAt
- User nhận được tokens với sessionId embedded

### 2. Khi sử dụng API (Protected Routes)

- Middleware `verifySession` kiểm tra sessionId trong AccessToken
- Verify session còn active trong DB
- Nếu session bị revoke → throw error, user bị logout

### 3. Khi Admin Revoke

- Admin disable session trong DB (isActive = false)
- User tiếp tục sử dụng được tối đa 5 phút (thời gian sống của AccessToken)
- Sau 5 phút, AccessToken hết hạn → user bị logout
- Khi user refresh token → verify session → bị reject

### 4. Khi Logout

- Xóa session khỏi DB
- Clear cookies

## API Endpoints

### 1. Get Users Overview with Session Summary (Admin only)

Lấy danh sách tất cả users với thông tin tổng quan về sessions để hiển thị trong table.

**Endpoint:** `GET /api/v1/users/overview`  
**Authorization:** Admin token required  
**Query Parameters:**

- `page` (optional): Số trang (default: 1)
- `itemsPerPage` (optional): Số items per page (default: 10)
- `search` (optional): Tìm kiếm theo tên hoặc email
- `role` (optional): Filter theo role ('admin', 'user')
- `isActive` (optional): Filter theo trạng thái (true/false)
- `sort` (optional): Sắp xếp

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy danh sách người dùng với thông tin sessions thành công",
  "data": {
    "users": [
      {
        "_id": "user-object-id-1",
        "name": "Nguyễn Văn A",
        "phone": "0901234567",
        "email": "nguyenvana@example.com",
        "isActive": true,
        "status": "Hoạt động",
        "totalSessions": 5,
        "activeSessions": 2,
        "lastLogin": "2025-09-25T10:30:00.000Z"
      },
      {
        "_id": "user-object-id-2",
        "name": "Trần Thị B",
        "phone": "",
        "email": "tranthib@example.com",
        "isActive": false,
        "status": "Không hoạt động",
        "totalSessions": 3,
        "activeSessions": 0,
        "lastLogin": "2025-09-20T15:45:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalUsers": 100,
      "itemsPerPage": 10
    }
  }
}
```

**Response Error:**

- `403`: Không có quyền admin
- `422`: Validation error (query parameters invalid)

---

### 2. Revoke User Session (Admin only)

Revoke một session cụ thể của user.

**Endpoint:** `POST /api/v1/users/revoke-session`  
**Authorization:** Admin token required  
**Request Body:**

```json
{
  "sessionId": "uuid-session-id"
}
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Thu hồi phiên đăng nhập thành công",
  "data": {
    "sessionId": "uuid-session-id",
    "message": "User sẽ bị logout trong vòng 5 phút (khi AccessToken hết hạn)"
  }
}
```

**Response Error:**

- `404`: Không tìm thấy phiên đăng nhập
- `400`: Không thể thu hồi phiên đăng nhập
- `403`: Không có quyền admin
- `422`: Validation error (sessionId invalid)

---

### 2. Revoke All User Sessions (Admin only)

Revoke tất cả sessions của một user.

**Endpoint:** `DELETE /api/v1/users/revoke-all-sessions/{userId}`  
**Authorization:** Admin token required  
**Path Parameters:**

- `userId` (required): ObjectId của user

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Thu hồi thành công 3 phiên đăng nhập",
  "data": {
    "userId": "user-object-id",
    "revokedSessions": 3,
    "message": "User sẽ bị logout trong vòng 5 phút (khi AccessToken hết hạn)"
  }
}
```

**Response Error:**

- `403`: Không có quyền admin
- `422`: Validation error (userId invalid)

---

### 3. Get User Sessions (Admin only)

Xem danh sách sessions của một user.

**Endpoint:** `GET /api/v1/users/sessions/{userId}`  
**Authorization:** Admin token required  
**Path Parameters:**

- `userId` (required): ObjectId của user

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy danh sách phiên đăng nhập thành công",
  "data": {
    "userId": "user-object-id",
    "sessions": [
      {
        "sessionId": "uuid-1",
        "deviceInfo": "Chrome 118.0.0.0",
        "ipAddress": "192.168.1.100",
        "createdAt": "2025-09-25T10:30:00.000Z",
        "expiresAt": "2025-10-02T10:30:00.000Z",
        "isActive": true
      },
      {
        "sessionId": "uuid-2",
        "deviceInfo": "Mobile Safari",
        "ipAddress": "192.168.1.101",
        "createdAt": "2025-09-24T15:20:00.000Z",
        "expiresAt": "2025-10-01T15:20:00.000Z",
        "isActive": false
      }
    ],
    "total": 2
  }
}
```

**Response Error:**

- `403`: Không có quyền admin
- `422`: Validation error (userId invalid)

---

### 4. Get Current User Sessions

Xem danh sách sessions của user hiện tại.

**Endpoint:** `GET /api/v1/users/my-sessions`  
**Authorization:** User token required

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy danh sách phiên đăng nhập của bạn thành công",
  "data": {
    "sessions": [
      {
        "sessionId": "uuid-1",
        "deviceInfo": "Chrome 118.0.0.0",
        "ipAddress": "192.168.1.100",
        "createdAt": "2025-09-25T10:30:00.000Z",
        "expiresAt": "2025-10-02T10:30:00.000Z",
        "isActive": true,
        "isCurrent": true
      },
      {
        "sessionId": "uuid-2",
        "deviceInfo": "Mobile Safari",
        "ipAddress": "192.168.1.101",
        "createdAt": "2025-09-24T15:20:00.000Z",
        "expiresAt": "2025-10-01T15:20:00.000Z",
        "isActive": true,
        "isCurrent": false
      }
    ],
    "total": 2
  }
}
```

**Response Error:**

- `401`: Token không hợp lệ hoặc session đã bị revoke

---

### 5. Revoke My Session (User)

User tự thu hồi session của chính mình.

**Endpoint:** `POST /api/v1/users/revoke-my-session`  
**Authorization:** User token required  
**Request Body:**

```json
{
  "sessionId": "uuid-session-id"
}
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Thu hồi phiên đăng nhập thành công",
  "data": {
    "sessionId": "uuid-session-id",
    "message": "Thu hồi phiên đăng nhập thành công. Thiết bị này sẽ bị đăng xuất trong vòng 5 phút."
  }
}
```

**Response Error:**

- `401`: Token không hợp lệ hoặc session đã bị revoke
- `403`: Không có quyền thu hồi session này (session không thuộc về user)
- `404`: Không tìm thấy phiên đăng nhập
- `422`: Validation error (sessionId invalid)

## Database Schema

### Sessions Collection

```javascript
{
  _id: ObjectId,
  sessionId: String, // UUID unique
  userId: String, // ObjectId của user
  refreshToken: String, // JWT refresh token
  deviceInfo: String, // User-Agent
  ipAddress: String, // IP address
  isActive: Boolean, // default: true
  createdAt: Date, // timestamp
  expiresAt: Date // thời gian hết hạn của refresh token
}
```

## Security Features

### 1. Session Validation

- Mỗi protected route đều verify sessionId có còn active không
- Ngăn chặn việc sử dụng token sau khi bị revoke

### 2. Automatic Logout

- User bị logout tối đa trong 5 phút sau khi admin revoke
- Không thể refresh token nếu session đã bị revoke

### 3. Device Tracking

- Lưu thông tin User-Agent và IP address
- Admin có thể xem device nào đang login

### 4. Backward Compatibility

- Old tokens (không có sessionId) vẫn hoạt động bình thường
- Middleware `verifySession` skip kiểm tra nếu không có sessionId

## Environment Variables

Cần đảm bảo các environment variables sau:

```env
# JWT Configuration
JWT_ACCESS_EXPIRES_IN=5m  # AccessToken expire trong 5 phút
JWT_REFRESH_EXPIRES_IN=7d # RefreshToken expire trong 7 ngày

# Cookie Configuration (for AccessToken)
ACCESS_TOKEN_COOKIE_MAX_AGE=30m # Cookie expire sau 30 phút
```

## Testing

### Manual Test Flow

1. **Login** → verify sessionId được tạo và lưu DB
2. **Use Protected API** → verify middleware kiểm tra session
3. **Admin Revoke Session** → verify session bị disable
4. **User Revoke Own Session** → verify user chỉ có thể revoke session của mình
5. **Wait 5 minutes** → verify user bị logout
6. **Logout** → verify session bị xóa khỏi DB

### Error Scenarios

- Revoke session không tồn tại
- Token không có sessionId (backward compatibility)
- Session hết hạn tự nhiên
- Multiple sessions cùng user

## Lưu ý quan trọng

1. **AccessToken expire trong 5 phút** - đây là key để revoke hoạt động hiệu quả
2. **Cookie expire sau 30 phút** - để user không bị logout quá sớm khi active
3. **Session cleanup** - nên có cron job xóa sessions hết hạn
4. **Database indexing** - tạo index cho sessionId để query nhanh
5. **Rate limiting** - protect revoke endpoints khỏi abuse

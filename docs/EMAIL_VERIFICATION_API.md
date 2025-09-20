# Email Verification API Documentation

Tài liệu này mô tả cách sử dụng 2 API endpoints mới cho chức năng xác minh email tài khoản.

## 📋 Tổng quan

Hệ thống xác minh email sử dụng JWT tokens để tạo ra một giải pháp **stateless** (không cần lưu token vào database). Token có thời hạn 24 giờ và chứa thông tin email được mã hoá an toàn.

## 🔐 Bảo mật

- **JWT Token**: Sử dụng JWT_SECRET để ký và xác minh tokens
- **Expiry Time**: Token có hiệu lực 24 giờ
- **Stateless**: Không lưu token vào database, giảm tải hệ thống
- **Email Validation**: Kiểm tra email có tồn tại trong hệ thống
- **Unique ID**: Mỗi token có unique ID để tránh replay attacks

## 📨 API Endpoints

### 1. Gửi Email Xác Minh

**POST** `/v1/users/send-verification-email`

Gửi email chứa link xác minh đến địa chỉ email của người dùng.

#### Request Body

```json
{
  "email": "user@example.com"
}
```

#### Response Success (200)

```json
{
  "code": 200,
  "message": "Email xác minh đã được gửi thành công",
  "data": {
    "email": "user@example.com",
    "expiresIn": "24 hours"
  }
}
```

#### Response Errors

- **404**: Email không tồn tại trong hệ thống
- **400**: Tài khoản đã được xác minh
- **422**: Validation error (email không hợp lệ)

### 2. Xác Minh Tài Khoản

**GET** `/v1/users/verify-account?email={email}&token={token}`

Xác minh tài khoản người dùng bằng email và token từ link trong email.

#### Query Parameters

- `email` (required): Email của người dùng
- `token` (required): JWT token từ link xác minh

#### Response Success (200)

```json
{
  "code": 200,
  "message": "Xác minh tài khoản thành công",
  "data": {
    "_id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": true,
    "isActive": true
  }
}
```

#### Response Errors

- **400**: Token không hợp lệ hoặc đã hết hạn
- **400**: Email không khớp với token
- **404**: Người dùng không tồn tại
- **400**: Tài khoản đã được xác minh trước đó
- **422**: Validation error

## 🔄 Workflow

1. **Người dùng đăng ký** → Tài khoản được tạo với `emailVerified: false`, `isActive: false`
2. **Gửi yêu cầu xác minh** → POST `/send-verification-email` với email
3. **Hệ thống gửi email** → Email chứa link với token JWT
4. **Người dùng click link** → GET `/verify-account?email=...&token=...`
5. **Xác minh thành công** → Cập nhật `emailVerified: true` và `isActive: true`

## 📧 Email Template

Email xác minh được gửi qua **BrevoProvider** với template HTML chuyên nghiệp bao gồm:

- **Header**: Logo và tiêu đề
- **Content**: Hướng dẫn và nút xác minh
- **Footer**: Thông tin bản quyền
- **Responsive**: Tương thích mọi thiết bị

### Link Format

```
https://your-domain.com/account/verification?email=user@example.com&token=jwt_token_here
```

## ⚙️ Configuration

Đảm bảo các environment variables sau được cấu hình:

```env
# JWT Secret for token signing
JWT_SECRET=your_jwt_secret

# Brevo API for email sending
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Your App Name

# Website domain for links
WEBSITE_DOMAIN_DEVELOPMENT=http://localhost:3000
WEBSITE_DOMAIN_PRODUCTION=https://yourdomain.com
```

## 🔧 Technical Details

### JWT Token Structure

```json
{
  "id": "unique_uuid",
  "email": "user@example.com",
  "type": "email_verification",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Database Impact

- **Không thêm field mới** vào User model
- **Cập nhật khi verify**: `emailVerified: true` và `isActive: true`
- **Stateless approach** giảm tải database

## 🔧 Architecture & Implementation

### JWT Token Functions (JwtProvider)

Các functions xử lý JWT token được tập trung trong `JwtProvider.js`:

```javascript
// Tạo verification token
const generateVerificationToken = (email) => {
  const payload = {
    email,
    type: 'email_verification',
    uuid: uuidv4()
  }
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '24h' })
}

// Xác minh verification token
const verifyVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type')
    }
    return decoded
  } catch {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token xác minh không hợp lệ hoặc đã hết hạn'
    )
  }
}
```

### Service Layer Implementation

**userService.js** sử dụng JwtProvider cho token operations:

```javascript
// Gửi email xác minh
const verifyToken = JwtProvider.generateVerificationToken(email)

// Xác minh tài khoản
const decoded = JwtProvider.verifyVerificationToken(token)

// Cập nhật user khi verify thành công
const updatedUser = await userModel.update(user._id, {
  emailVerified: true,
  isActive: true, // ← Tự động kích hoạt tài khoản
  updatedAt: new Date()
})
```

## 🎯 Benefits & Improvements

### Architecture Benefits

- **Separation of Concerns**: JWT logic tách biệt khỏi business logic
- **Reusability**: JwtProvider có thể dùng cho password reset, email change
- **Maintainability**: Dễ debug và cập nhật JWT logic
- **Single Source of Truth**: Tất cả JWT validation ở một nơi

### User Experience

- **Tự động kích hoạt**: User không cần thêm bước activate manual
- **Flow mượt mà**: Verify email → Account active ngay lập tức
- **Consistent State**: Không có trạng thái "verified but inactive"

## 🧪 Testing

### Test Cases

```javascript
// Test verify account updates both fields
const result = await userService.verifyUserAccount(email, validToken)
expect(result.user.isActive).toBe(true)
expect(result.user.emailVerified).toBe(true)

// Test JwtProvider functions
const token = JwtProvider.generateVerificationToken('test@example.com')
const decoded = JwtProvider.verifyVerificationToken(token)
expect(decoded.email).toBe('test@example.com')
expect(decoded.type).toBe('email_verification')
```

### Testing Checklist

- [ ] Email verification flow hoạt động
- [ ] isActive field được set khi verify
- [ ] JwtProvider functions work independently
- [ ] Error handling đúng
- [ ] Token expiry logic
- [ ] Email template rendering

## 🚨 Error Handling

Tất cả lỗi được xử lý thống nhất qua `ApiError` class và middleware `errorHandlingMiddleware`.

## 📝 Notes

- Token chỉ có hiệu lực 1 lần sử dụng (kiểm tra `emailVerified` status)
- Có thể gửi lại email xác minh nếu token hết hạn
- Link xác minh tự động redirect đến frontend sau khi verify thành công
- Hỗ trợ multiple environment (dev/production) với domain khác nhau

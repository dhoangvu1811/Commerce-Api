# 📘 Facebook OAuth Setup Guide

## 🚀 Tạo Facebook App

### Bước 1: Truy cập Facebook Developers

1. Đi đến [Facebook for Developers](https://developers.facebook.com/)
2. Đăng nhập với tài khoản Facebook của bạn
3. Click **"My Apps"** → **"Create App"**

### Bước 2: Chọn loại ứng dụng

1. Chọn **"Consumer"** hoặc **"None"**
2. Click **"Next"**

### Bước 3: Điền thông tin ứng dụng

```
App Name: Your Commerce App
App Contact Email: your-email@example.com
```

### Bước 4: Thêm Facebook Login product

1. Trong dashboard, tìm **"Facebook Login"**
2. Click **"Set Up"**
3. Chọn **"Web"** platform
4. Nhập Site URL: `http://localhost:3000`

## 🔧 Cấu hình Facebook Login

### Bước 5: Settings → Basic

```
App ID: [Copy App ID này]
App Secret: [Copy App Secret này - Show để thấy]
App Domains: localhost (cho development)
```

### Bước 6: Facebook Login → Settings

```
Valid OAuth Redirect URIs:
http://localhost:3000/V1/users/auth/facebook/callback
https://yourdomain.com/V1/users/auth/facebook/callback (production)

Use Strict Mode for Redirect URIs: No (development)
```

### Bước 7: App Review (cho production)

- Request `email` permission nếu cần
- Submit app cho review để có thể được users khác ngoài developers sử dụng

## 📝 Environment Variables

Thêm vào file `.env`:

```env
# Facebook OAuth Configuration
FACEBOOK_CLIENT_ID=your_facebook_app_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret_here
FACEBOOK_CALLBACK_URL=http://localhost:3000/V1/users/auth/facebook/callback
```

## 🧪 Test Facebook OAuth

### Development URLs:

- **Initiate Facebook login**: `GET http://localhost:3000/V1/users/auth/facebook`
- **Callback URL**: `GET http://localhost:3000/V1/users/auth/facebook/callback`

### Test Flow:

1. Browser → `http://localhost:3000/V1/users/auth/facebook`
2. Redirect to Facebook → User login/authorize
3. Facebook redirect → `http://localhost:3000/V1/users/auth/facebook/callback`
4. Set JWT tokens → Redirect to frontend success page

## 🔒 Security Best Practices

### App Settings:

```
Server IP Whitelist: [Your server IPs for production]
App Secret Proof: Enabled (production)
Client OAuth Settings → Valid OAuth Redirect URIs: Strict URLs only
```

### Data Access:

- Request minimal permissions (chỉ `public_profile` và `email`)
- Regular security review
- Monitor suspicious activities

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid OAuth access token"

**Solution**:

- Check App ID và App Secret
- Verify redirect URI exact match
- Check app is in development/live mode

### Issue 2: "This app is in development mode"

**Solution**:

- Add test users in App Roles → Test Users
- Or submit app for review để go live

### Issue 3: "URL blocked"

**Solution**:

- Add domain to App Domains trong Basic Settings
- Check Valid OAuth Redirect URIs

### Issue 4: Facebook không return email

**Solution**:

- Request `email` permission trong scope
- User phải grant email permission
- Fallback to Facebook ID nếu không có email

## 📱 Frontend Integration

### HTML Button:

```html
<a href="/V1/users/auth/facebook" class="facebook-login-btn">
  <i class="fab fa-facebook-f"></i>
  Login with Facebook
</a>
```

### JavaScript:

```javascript
// Initiate Facebook OAuth
const facebookLogin = () => {
  window.location.href = '/V1/users/auth/facebook'
}

// Handle success callback
const handleAuthSuccess = () => {
  // Check for JWT tokens in cookies
  // Redirect to dashboard
}
```

## 🔍 Debug Tools

### Facebook Graph API Explorer:

- URL: https://developers.facebook.com/tools/explorer/
- Test permissions and data access
- Debug access tokens

### Webhook Testing:

- Use Facebook's webhook tester
- Check callback URL responses

## 📊 Production Deployment

### Domain Settings:

```
App Domains: yourdomain.com
Site URL: https://yourdomain.com
Valid OAuth Redirect URIs: https://yourdomain.com/V1/users/auth/facebook/callback
```

### SSL Requirements:

- HTTPS required cho production
- Valid SSL certificate
- Secure cookie settings

### Monitor & Analytics:

- Facebook Analytics dashboard
- Monitor login conversion rates
- Track user acquisition

---

## 🎯 Quick Setup Checklist

- [ ] Create Facebook App
- [ ] Get App ID & App Secret
- [ ] Add Facebook Login product
- [ ] Configure Valid OAuth Redirect URIs
- [ ] Set environment variables
- [ ] Test authentication flow
- [ ] Add error handling
- [ ] Setup production domain (if needed)
- [ ] Submit for app review (if needed)

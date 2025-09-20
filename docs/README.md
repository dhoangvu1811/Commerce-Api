# Tài Liệu Dự Án Commerce API

## 📁 Cấu Trúc Tài Liệu

### 🔐 Authentication & Authorization

- [`simplified-access-control.md`](./simplified-access-control.md) - **[HIỆN TẠI]** Hệ thống kiểm soát truy cập đơn giản

### 🔑 OAuth Integration

- [`google-oauth-setup.md`](./google-oauth-setup.md) - Thiết lập Google OAuth
- [`facebook-oauth-setup.md`](./facebook-oauth-setup.md) - Thiết lập Facebook OAuth
- [`google-oauth-architecture.md`](./google-oauth-architecture.md) - Kiến trúc OAuth Google
- [`oauth-service-architecture.md`](./oauth-service-architecture.md) - Kiến trúc OAuth Service
- [`oauth-refactoring-summary.md`](./oauth-refactoring-summary.md) - Tóm tắt refactoring OAuth

### 📦 Business Logic

- [`order-test-cases.md`](./order-test-cases.md) - Test cases cho hệ thống đơn hàng
- [`payment-method-logic.md`](./payment-method-logic.md) - Logic phương thức thanh toán

## 🎯 Tài Liệu Quan Trọng

### 1. Hệ Thống Phân Quyền Hiện Tại

**File**: [`simplified-access-control.md`](./simplified-access-control.md)

**Nội dung chính**:

- User inactive: Có thể đăng nhập và xem sản phẩm (public routes)
- Tất cả tính năng khác: Yêu cầu user active
- Middleware đơn giản: chỉ sử dụng `verifyActiveUser`

### 2. OAuth Configuration

**Files**: `google-oauth-setup.md`, `facebook-oauth-setup.md`

**Nội dung chính**:

- Cấu hình Google/Facebook OAuth
- Environment variables cần thiết
- Callback URLs và redirect logic

### 3. Business Logic

**Files**: `order-test-cases.md`, `payment-method-logic.md`

**Nội dung chính**:

- Test scenarios cho đơn hàng
- Logic xử lý thanh toán

## 🗂️ Lịch Sử Thay Đổi

### ❌ Đã Loại Bỏ (Không còn cần thiết):

- `user-access-control-system.md` - Hệ thống phức tạp cũ
- `test-access-control.js` - Test script phức tạp
- `implementation-summary-access-control.md` - Summary cũ
- `user-activation-system.md` - Docs activation cũ
- `user-activation-implementation-summary.md` - Summary activation cũ

### ✅ Giữ Lại (Cần thiết):

- `simplified-access-control.md` - **Tài liệu chính** cho access control
- OAuth related docs - Cần thiết cho setup và maintenance
- Business logic docs - Cần thiết cho development

## 📋 Quy Tắc Maintenance

1. **Luôn cập nhật** `simplified-access-control.md` khi thay đổi logic phân quyền
2. **Giữ nguyên** các OAuth docs trừ khi thay đổi cấu hình
3. **Thêm mới** business logic docs khi có tính năng mới
4. **Xóa bỏ** docs cũ khi không còn relevant

## 🚀 Quick Start

Để hiểu hệ thống hiện tại, đọc theo thứ tự:

1. [`simplified-access-control.md`](./simplified-access-control.md) - Hiểu hệ thống phân quyền
2. [`google-oauth-setup.md`](./google-oauth-setup.md) - Setup OAuth (nếu cần)
3. [`order-test-cases.md`](./order-test-cases.md) - Hiểu business logic đơn hàng

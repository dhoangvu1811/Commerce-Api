# Payment Method Business Logic

## 🎯 Overview

Hệ thống hỗ trợ 4 phương thức thanh toán với logic nghiệp vụ khác nhau:

| Payment Method | Value     | Type             | Payment Timing    | Status Update Rule            |
| -------------- | --------- | ---------------- | ----------------- | ----------------------------- |
| **COD**        | `cod`     | Cash on Delivery | Sau khi giao hàng | ✅ Không cần thanh toán trước |
| **Card**       | `card`    | Online Payment   | Trước khi xử lý   | ❌ Phải thanh toán trước      |
| **E-wallet**   | `ewallet` | Online Payment   | Trước khi xử lý   | ❌ Phải thanh toán trước      |
| **Bank**       | `bank`    | Online Payment   | Trước khi xử lý   | ❌ Phải thanh toán trước      |

## 🔧 Core Business Rules

### 1. **COD (Cash on Delivery) Rules**

```javascript
✅ PENDING → CONFIRMED (Không cần thanh toán)
✅ CONFIRMED → PROCESSING (Không cần thanh toán)
✅ PROCESSING → PACKED (Không cần thanh toán)
✅ PACKED → SHIPPED (Không cần thanh toán)
✅ SHIPPED → DELIVERED (Không cần thanh toán)
💰 DELIVERED → Mark Paid (Thanh toán khi nhận hàng)
✅ DELIVERED → COMPLETED (Sau khi đã thanh toán)
```

### 2. **Online Payment Rules**

```javascript
✅ PENDING → CONFIRMED (Không cần thanh toán)
💰 CONFIRMED → Mark Paid (Phải thanh toán trước)
✅ CONFIRMED → PROCESSING (Chỉ khi đã PAID)
✅ PROCESSING → PACKED (Chỉ khi đã PAID)
✅ PACKED → SHIPPED (Chỉ khi đã PAID)
✅ SHIPPED → DELIVERED (Chỉ khi đã PAID)
✅ DELIVERED → COMPLETED (Chỉ khi đã PAID)
```

## 🚀 Implementation Details

### 1. **Payment Method Detection**

```javascript
// COD Detection
export const isCODPayment = (paymentMethod = '') => {
  const method = paymentMethod.toLowerCase()
  return method === 'cod' || method.includes('cod') || method.includes('cash')
}

// Online Payment Detection
export const isOnlinePayment = (paymentMethod = '') => {
  const method = paymentMethod.toLowerCase()
  return (
    ['card', 'ewallet', 'bank', 'credit', 'debit', 'momo', 'zalopay'].some(
      (keyword) => method.includes(keyword)
    ) ||
    (!isCODPayment(paymentMethod) && paymentMethod.trim() !== '')
  )
}
```

### 2. **Status Update Validation**

```javascript
export const canUpdateStatus = (order, newStatus) => {
  // Free status updates (không cần kiểm tra payment)
  const freeStatusUpdates = ['PENDING', 'CONFIRMED', 'CANCELLED']
  if (freeStatusUpdates.includes(newStatus)) {
    return { allowed: true }
  }

  // COD: Luôn cho phép update
  if (isCODPayment(paymentMethod)) {
    return { allowed: true, note: 'COD - Không cần thanh toán trước' }
  }

  // Online Payment: Phải thanh toán trước
  if (isOnlinePayment(paymentMethod)) {
    const requiresPaymentStatuses = [
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED'
    ]
    if (
      requiresPaymentStatuses.includes(newStatus) &&
      paymentStatus !== 'PAID'
    ) {
      return {
        allowed: false,
        reason: 'Phương thức thanh toán online yêu cầu phải thanh toán trước'
      }
    }
  }
}
```

### 3. **Mark Paid Logic**

```javascript
export const canMarkPaid = (order, isAdmin) => {
  // COD: Có thể mark paid sau khi DELIVERED
  if (isCODPayment(paymentMethod) && status === 'DELIVERED') {
    return { allowed: true, note: 'COD - Thanh toán khi nhận hàng' }
  }

  // Online Payment: Không được mark paid sau DELIVERED
  if (
    isOnlinePayment(paymentMethod) &&
    ['DELIVERED', 'COMPLETED'].includes(status)
  ) {
    return {
      allowed: false,
      reason: 'Online payment phải được thanh toán trước khi giao hàng'
    }
  }
}
```

### 4. **Consistency Check**

```javascript
export const isConsistentStatusPayment = (
  status,
  paymentStatus,
  paymentMethod
) => {
  // Online Payment: Không được PROCESSING+ với PENDING payment
  if (isOnlinePayment(paymentMethod)) {
    const requiresPaymentStatuses = [
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED'
    ]
    if (
      requiresPaymentStatuses.includes(status) &&
      paymentStatus === 'PENDING'
    ) {
      return false // ❌ Inconsistent
    }
  }

  // COD: Cho phép status cao với PENDING payment
  if (isCODPayment(paymentMethod)) {
    return true // ✅ Always consistent for COD
  }
}
```

## 📊 Workflow Examples

### COD Workflow

```
1. Customer đặt hàng → paymentMethod: "cod"
2. Admin: PENDING → CONFIRMED
3. Admin: CONFIRMED → PROCESSING (✅ Allowed)
4. Admin: PROCESSING → PACKED (✅ Allowed)
5. Admin: PACKED → SHIPPED (✅ Allowed)
6. Admin: SHIPPED → DELIVERED (✅ Allowed)
7. Customer nhận hàng & thanh toán
8. Admin: Mark Paid (✅ Allowed - COD special case)
9. Admin: DELIVERED → COMPLETED
```

### Online Payment Workflow

```
1. Customer đặt hàng → paymentMethod: "card"
2. Admin: PENDING → CONFIRMED
3. Customer thanh toán online
4. Admin: Mark Paid (✅ Must do this first)
5. Admin: CONFIRMED → PROCESSING (✅ Allowed - đã PAID)
6. Admin: PROCESSING → PACKED (✅ Allowed)
7. Admin: PACKED → SHIPPED (✅ Allowed)
8. Admin: SHIPPED → DELIVERED (✅ Allowed)
9. Admin: DELIVERED → COMPLETED
```

## 🚨 Error Cases

### Case 1: Online Payment - Update Status Without Payment

```javascript
// Order: card, CONFIRMED, PENDING
PUT /orders/admin/update/:id { status: "PROCESSING" }

// Response: 400 Bad Request
{
  "code": 400,
  "message": "Phương thức thanh toán online yêu cầu phải thanh toán trước khi chuyển sang PROCESSING"
}
```

### Case 2: Online Payment - Late Mark Paid

```javascript
// Order: card, DELIVERED, PENDING
POST /orders/admin/mark-paid/:id

// Response: 400 Bad Request
{
  "code": 400,
  "message": "Đơn hàng online payment phải được thanh toán trước khi giao hàng"
}
```

## 🎯 API Integration

### Check Available Actions

```javascript
GET /orders/actions/:id

// COD Order Response
{
  "availableActions": [
    { "action": "updateStatus", "label": "Cập nhật trạng thái" },
    { "action": "markPaid", "label": "Xác nhận thanh toán", "note": "COD" }
  ]
}

// Online Order (Unpaid) Response
{
  "availableActions": [
    { "action": "markPaid", "label": "Xác nhận thanh toán" }
  ],
  "restrictions": {
    "updateStatus": {
      "allowed": false,
      "reason": "Phải thanh toán trước khi update status"
    }
  }
}
```

### Update Status with Validation

```javascript
PUT /orders/admin/update/:id
{ "status": "PROCESSING" }

// Automatic validation:
// 1. Check payment method
// 2. Check payment status
// 3. Apply appropriate rules
// 4. Return success/error
```

## ✨ Benefits

1. **🎯 Business Logic Accurate**: Phản ánh đúng thực tế COD vs Online Payment
2. **🔒 Data Integrity**: Ngăn ngừa trạng thái không hợp lệ
3. **👥 User Experience**: Frontend có thể hiển thị đúng options
4. **🛡️ Security**: Bảo vệ khỏi các thao tác sai logic
5. **📈 Scalable**: Dễ dàng thêm payment methods mới

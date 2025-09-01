# 📋 Test Cases Specification - Order System

## 🔍 Tổng quan về Test Cases

File `tests/orderService.test.js` chứa **60 test cases** toàn diện để kiểm tra tất cả các tình huống có thể xảy ra trong order system. Test cases được chia thành 7 nhóm chính:

### 📊 Phân loại Test Cases

| Nhóm           | Số lượng      | Mô tả                                     |
| -------------- | ------------- | ----------------------------------------- |
| CREATE ORDER   | TC-01 → TC-12 | Tạo đơn hàng với các tình huống khác nhau |
| MARK PAID      | TC-13 → TC-22 | Xác nhận thanh toán và rollback           |
| CANCEL ORDER   | TC-23 → TC-35 | Hủy đơn hàng (user/admin)                 |
| UPDATE STATUS  | TC-36 → TC-43 | Cập nhật trạng thái và validation         |
| GET ORDERS     | TC-44 → TC-51 | Lấy danh sách và chi tiết đơn hàng        |
| CANCEL BY CODE | TC-52 → TC-54 | Hủy đơn theo orderCode                    |
| EDGE CASES     | TC-55 → TC-60 | Các trường hợp đặc biệt và stress test    |

---

## 1️⃣ CREATE ORDER (TC-01 → TC-12)

### ✅ Success Cases

- **TC-01**: Tạo đơn hàng không voucher ✓
- **TC-02**: Tạo đơn hàng có voucher hợp lệ ✓
- **TC-03**: Tạo đơn hàng nhiều sản phẩm ✓

### ❌ Failure Cases

- **TC-04**: userId không hợp lệ
- **TC-05**: Sản phẩm không tồn tại
- **TC-06**: Sản phẩm không đủ tồn kho
- **TC-07**: Voucher không tồn tại
- **TC-08**: Voucher đã vô hiệu hóa
- **TC-09**: Voucher chưa bắt đầu hiệu lực
- **TC-10**: Voucher đã hết hạn
- **TC-11**: Voucher đạt giới hạn sử dụng
- **TC-12**: Đơn hàng không đủ giá trị tối thiểu

---

## 2️⃣ MARK PAID (TC-13 → TC-22)

### ✅ Success Cases

- **TC-13**: PENDING/PENDING → CONFIRMED/PAID ✓
- **TC-14**: CONFIRMED/PENDING → CONFIRMED/PAID ✓
- **TC-15**: Idempotent - đã PAID rồi ✓
- **TC-16**: Rollback khi sản phẩm hết tồn kho ✓

### ❌ Failure Cases

- **TC-17**: orderId không hợp lệ
- **TC-18**: Đơn hàng không tồn tại
- **TC-19**: Đơn đã CANCELLED
- **TC-20**: Đơn đã COMPLETED
- **TC-21**: paymentStatus CANCELLED
- **TC-22**: paymentStatus REFUNDED

---

## 3️⃣ CANCEL ORDER (TC-23 → TC-35)

### ✅ Success Cases - User

- **TC-23**: PENDING/PENDING → CANCELLED/PENDING ✓
- **TC-24**: CONFIRMED/PAID → CANCELLED/REFUNDED + restock ✓
- **TC-25**: Idempotent - đã CANCELLED rồi ✓

### ✅ Success Cases - Admin

- **TC-26**: Admin cancel PROCESSING/PAID ✓
- **TC-27**: Admin cancel SHIPPED/PAID ✓
- **TC-28**: Admin cancel PENDING/PENDING ✓

### ❌ Failure Cases

- **TC-29**: User cancel đơn của người khác
- **TC-30**: User cancel đơn PROCESSING
- **TC-31**: User cancel đơn SHIPPED
- **TC-32**: User cancel đơn COMPLETED
- **TC-33**: orderId không hợp lệ
- **TC-34**: Đơn hàng không tồn tại
- **TC-35**: Rollback error được handle

---

## 4️⃣ UPDATE STATUS (TC-36 → TC-43)

### ✅ Success Cases

- **TC-36**: PENDING → CONFIRMED ✓
- **TC-37**: PENDING → PROCESSING (paymentStatus) ✓
- **TC-38**: Update cả status và paymentStatus ✓

### ❌ Failure Cases

- **TC-39**: status không thuộc enum
- **TC-40**: paymentStatus không thuộc enum
- **TC-41**: Chuyển đổi status không hợp lệ
- **TC-42**: Chuyển đổi paymentStatus không hợp lệ
- **TC-43**: Không nhất quán giữa status và paymentStatus

---

## 5️⃣ GET ORDERS (TC-44 → TC-51)

### ✅ Success Cases

- **TC-44**: Get my orders ✓
- **TC-45**: Get order details by ID ✓
- **TC-46**: Get order details by orderCode ✓
- **TC-47**: Admin get all orders với filter ✓

### ❌ Failure Cases

- **TC-48**: userId không hợp lệ
- **TC-49**: orderId không hợp lệ
- **TC-50**: Không có quyền xem đơn của người khác
- **TC-51**: Đơn hàng không tồn tại (by orderCode)

---

## 6️⃣ CANCEL BY ORDER CODE (TC-52 → TC-54)

### ✅ Success Cases

- **TC-52**: Cancel by orderCode thành công ✓

### ❌ Failure Cases

- **TC-53**: orderCode không hợp lệ
- **TC-54**: Đơn hàng không tồn tại với orderCode

---

## 7️⃣ EDGE CASES & STRESS TESTS (TC-55 → TC-60)

### 🔥 Special Cases

- **TC-55**: Create order với quantity = 0
- **TC-56**: Create order với giá sản phẩm âm
- **TC-57**: Mark paid với một số sản phẩm hết hàng
- **TC-58**: Concurrent cancel requests
- **TC-59**: Database transaction failure
- **TC-60**: Memory leak test với 1000 items

---

## 🎯 Status & PaymentStatus Transition Matrix

### Allowed Transitions

| From Status | To Status  | Condition    |
| ----------- | ---------- | ------------ |
| PENDING     | CONFIRMED  | ✓ Always     |
| PENDING     | CANCELLED  | ✓ Always     |
| CONFIRMED   | PROCESSING | ✓ Always     |
| CONFIRMED   | CANCELLED  | ✓ User/Admin |
| PROCESSING  | SHIPPED    | ✓ Admin only |
| PROCESSING  | CANCELLED  | ✓ Admin only |
| SHIPPED     | COMPLETED  | ✓ Admin only |
| SHIPPED     | CANCELLED  | ✓ Admin only |

| From PaymentStatus | To PaymentStatus | Condition              |
| ------------------ | ---------------- | ---------------------- |
| PENDING            | PAID             | ✓ Always               |
| PENDING            | CANCELLED        | ✓ When order cancelled |
| PENDING            | PROCESSING       | ✓ Admin only           |
| PAID               | REFUNDED         | ✓ When order cancelled |
| PROCESSING         | PAID             | ✓ Always               |
| PROCESSING         | CANCELLED        | ✓ When order cancelled |

### Business Logic Rules

1. **Consistency Rules**:

   - COMPLETED status phải có PAID paymentStatus
   - CANCELLED status có thể có CANCELLED/PENDING/REFUNDED paymentStatus
   - PAID paymentStatus không thể với PENDING status

2. **User Permissions**:

   - User chỉ cancel được đơn PENDING hoặc CONFIRMED
   - Admin có thể cancel đơn ở mọi trạng thái (trừ COMPLETED)

3. **Rollback Rules**:
   - Khi cancel đơn đã PAID: restock + decrement selled + decrement voucher used
   - Khi cancel đơn chưa PAID: không cần rollback inventory
   - Rollback phải atomic, nếu fail thì log error nhưng vẫn cancel đơn

---

## 🚀 Chạy Test Cases

```bash
# Chạy tất cả test cases
npm test orderService.test.js

# Chạy test cases theo group
npm test -- --grep "CREATE ORDER"
npm test -- --grep "MARK PAID"
npm test -- --grep "CANCEL ORDER"

# Chạy test cases với coverage
npm test -- --coverage orderService.test.js

# Chạy test cases trong watch mode
npm test -- --watch orderService.test.js
```

---

## 📝 Mock Strategy

### Models được Mock

- `orderModel`: tất cả methods (findOneById, createNew, update, appendLog, ...)
- `productModel`: inventory operations (findByIds, decrementStock, incrementStock, ...)
- `voucherModel`: voucher operations (findOneByCode, incrementUsedCount, ...)

### Test Data được Mock

- `mockUserId`, `mockOrderId`, `mockProductId`, `mockVoucherId`
- `mockProduct`, `mockVoucher`, `mockShippingAddress`
- Valid payload cho create order

### Error Scenarios

- Database connection errors
- Validation errors
- Business logic errors
- Permission errors
- Not found errors

### ORDER_STATUS & PAYMENT_STATUS

- ORDER_STATUS: Danh sách các trạng thái đơn hàng
- PAYMENT_STATUS: Danh sách các trạng thái thanh toán

---

## ✅ Expected Results

Khi chạy tất cả test cases, kết quả mong đợi:

- **60 test cases PASSED**
- **Coverage > 95%** cho orderService
- **No memory leaks** trong stress tests
- **All edge cases handled** gracefully

Test cases này đảm bảo order system hoạt động đúng theo thiết kế nghiệp vụ và handle tất cả các tình huống có thể xảy ra trong thực tế.

/**
 * Type definitions index
 * Export tất cả types từ một điểm duy nhất
 */

// Common types
export type {
  ApiResponse,
  PaginationInfo,
  PaginatedResult,
  SortOrder,
  SortOptions,
  FilterOptions,
  ObjectIdString,
  MongoDocument,
  Timestamps,
  JwtDecodedPayload,
  DeviceInfo
} from './common.types.js'

// User types
export type {
  UserRole,
  Gender,
  AccountType,
  User,
  UserResponse,
  RegisterInput,
  LoginInput,
  LoginResult,
  UpdateUserInput,
  UpdateUserByAdminInput,
  UpdatePasswordInput,
  GetUsersResult
} from './user.types.js'

// Product types
export type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  GetProductsResult,
  ProductFilter
} from './product.types.js'

// Order types
export type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderItem,
  ShippingAddress,
  OrderVoucher,
  OrderTotals,
  LogEntry,
  Order,
  CreateOrderInput,
  UpdateOrderStatusInput,
  GetOrdersResult
} from './order.types.js'

// Voucher types
export type {
  VoucherType,
  Voucher,
  CreateVoucherInput,
  UpdateVoucherInput,
  GetVouchersResult,
  ValidateVoucherResult
} from './voucher.types.js'

// Session types
export type {
  Session,
  CreateSessionInput,
  SessionSummary
} from './session.types.js'

// Environment types
export type {
  BuildMode,
  EnvironmentConfig
} from './environment.types.js'


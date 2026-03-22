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
  DeviceInfo,
  UploadResult,
  DeleteResultInfo
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
  GetUsersResult,
  ForgotPasswordInput,
  ResetPasswordInput,
  ForgotPasswordResult,
  ResetPasswordResult
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
  SessionSummary,
  SessionStatus,
  SafeSessionInfo,
  CurrentUserSession,
  SessionsSummaryInfo,
  GetUserSessionsResponse,
  GetCurrentUserSessionsResponse,
  UserWithSessionSummary,
  RevokeSessionResponse,
  RevokeAllSessionsResponse
} from './session.types.js'

// Environment types
export type { BuildMode, EnvironmentConfig } from './environment.types.js'

// JWT Provider types
export type {
  AccessTokenPayload,
  RefreshTokenPayload,
  VerificationTokenPayload,
  PasswordResetTokenPayload,
  TokenUserData,
  IJwtProvider
} from './jwt.types.js'

// Brevo (Email) Provider types
export type {
  EmailSender,
  EmailRecipient,
  EmailAttachment,
  BrevoEmailResult,
  SendEmailOptions,
  IBrevoProvider,
  EmailTemplateType
} from './brevo.types.js'

// Error types
export type {
  IApiError,
  ErrorResponse,
  HttpStatusCode,
  ErrorMessages
} from './error.types.js'

// OAuth types
export type {
  OAuthProvider,
  GoogleProfile,
  GoogleProfileJson,
  FacebookProfile,
  FacebookProfileJson,
  OAuthUserData,
  OAuthCallbackResult,
  PassportDoneCallback,
  GoogleVerifyCallback,
  FacebookVerifyCallback
} from './oauth.types.js'

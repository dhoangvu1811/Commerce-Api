/**
 * System Roles
 * Các role mặc định của hệ thống, không được xóa hoặc đổi tên (name slug)
 */
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user'
} as const

/**
 * System Permissions
 * Các quyền mặc định, được sử dụng trong middleware để check code
 */
export const PERMISSIONS = {
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SYSTEM: 'manage_system',
  MANAGE_VOUCHERS: 'manage_vouchers',
  MANAGE_CONTACTS: 'manage_contacts'
} as const

export type SystemRole = (typeof ROLES)[keyof typeof ROLES]
export type SystemPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

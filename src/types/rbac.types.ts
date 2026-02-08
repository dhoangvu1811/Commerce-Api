import { Role, Permission, RolePermission } from '~/generated/prisma/index.js'
import { PaginationInfo } from './common.types.js'

export interface RoleWithPermissions extends Role {
  rolePermissions: (RolePermission & { permission: Permission })[]
}

export interface RoleWithUserCount extends Role {
  _count: { users: number }
}

export interface PaginatedRolesWithUserCountResult {
  roles: RoleWithUserCount[]
  pagination: PaginationInfo
}

export interface CreateRoleInput {
  name: string
  displayName?: string
}

export interface UpdateRoleInput {
  name?: string
  displayName?: string
}

export interface RoleFilter {
  search?: string
}

export interface PaginatedRolesResult {
  roles: Role[]
  pagination: PaginationInfo
}

export interface CreatePermissionInput {
  name: string
  displayName?: string
}

export interface UpdatePermissionInput {
  name?: string
  displayName?: string
}

export interface PermissionFilter {
  search?: string
}

export interface PaginatedPermissionsResult {
  permissions: Permission[]
  pagination: PaginationInfo
}

/**
 * Database Seed Script (RBAC + Admin)
 * Seed các bảng: roles, permissions, role_permissions, users (admin account)
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  PrismaClient,
  UserStatus,
  AccountType,
  Gender
} from '@prisma/client'
import bcryptLib from 'bcrypt'

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user'
} as const

const PERMISSIONS = {
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SYSTEM: 'manage_system',
  MANAGE_VOUCHERS: 'manage_vouchers',
  MANAGE_CONTACTS: 'manage_contacts'
} as const

const ROLE_DISPLAY_NAMES: Record<(typeof ROLES)[keyof typeof ROLES], string> = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.STAFF]: 'Nhân viên',
  [ROLES.USER]: 'Người dùng'
}

const PERMISSION_DISPLAY_NAMES: Record<string, string> = {
  [PERMISSIONS.MANAGE_PRODUCTS]: 'Quản lý sản phẩm',
  [PERMISSIONS.MANAGE_USERS]: 'Quản lý người dùng',
  [PERMISSIONS.MANAGE_ROLES]: 'Quản lý vai trò & quyền',
  [PERMISSIONS.MANAGE_ORDERS]: 'Quản lý đơn hàng',
  [PERMISSIONS.VIEW_ANALYTICS]: 'Xem báo cáo thống kê',
  [PERMISSIONS.MANAGE_SYSTEM]: 'Quản lý hệ thống',
  [PERMISSIONS.MANAGE_VOUCHERS]: 'Quản lý mã giảm giá',
  [PERMISSIONS.MANAGE_CONTACTS]: 'Quản lý liên hệ'
}

/**
 * Seed roles + permissions + role_permissions
 */
const seedRbac = async () => {
  console.log('🔐 Seeding RBAC...')

  // 1) Seed roles
  const roleEntries = Object.values(ROLES)
  const roleRecords = new Map<string, { id: number; name: string }>()

  for (const roleName of roleEntries) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { displayName: ROLE_DISPLAY_NAMES[roleName] },
      create: { name: roleName, displayName: ROLE_DISPLAY_NAMES[roleName] },
      select: { id: true, name: true }
    })

    roleRecords.set(role.name, role)
  }

  // 2) Seed permissions
  const permissionEntries = Object.values(PERMISSIONS)
  const permissionRecords = new Map<string, { id: number; name: string }>()

  for (const permissionName of permissionEntries) {
    const permission = await prisma.permission.upsert({
      where: { name: permissionName },
      update: { displayName: PERMISSION_DISPLAY_NAMES[permissionName] },
      create: {
        name: permissionName,
        displayName: PERMISSION_DISPLAY_NAMES[permissionName]
      },
      select: { id: true, name: true }
    })

    permissionRecords.set(permission.name, permission)
  }

  // 3) Define role-permission matrix
  const adminPermissions = permissionEntries
  const staffPermissions = [
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_VOUCHERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_CONTACTS
  ]
  const userPermissions: string[] = []

  const matrix = [
    { role: ROLES.ADMIN, permissions: adminPermissions },
    { role: ROLES.STAFF, permissions: staffPermissions },
    { role: ROLES.USER, permissions: userPermissions }
  ]

  // 4) Rebuild role_permissions deterministically
  await prisma.rolePermission.deleteMany({})

  const rolePermissionRows: Array<{ roleId: number; permissionId: number }> = []

  for (const item of matrix) {
    const role = roleRecords.get(item.role)
    if (!role) continue

    for (const permissionName of item.permissions) {
      const permission = permissionRecords.get(permissionName)
      if (!permission) continue

      rolePermissionRows.push({
        roleId: role.id,
        permissionId: permission.id
      })
    }
  }

  if (rolePermissionRows.length > 0) {
    await prisma.rolePermission.createMany({
      data: rolePermissionRows,
      skipDuplicates: true
    })
  }

  console.log(
    `✅ RBAC seeded: ${roleEntries.length} roles, ${permissionEntries.length} permissions, ${rolePermissionRows.length} role-permissions`
  )

  return {
    adminRoleId: roleRecords.get(ROLES.ADMIN)!.id
  }
}

/**
 * Seed admin user account
 */
const seedAdminUser = async (adminRoleId: number) => {
  console.log('👤 Seeding admin user...')

  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@commerce.vn'
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || '123456'
  const adminName = process.env.ADMIN_SEED_NAME || 'System Administrator'

  const hashedPassword = await bcryptLib.hash(adminPassword, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      password: hashedPassword,
      roleId: adminRoleId,
      emailVerified: true,
      status: UserStatus.active,
      typeAccount: AccountType.LOCAL,
      gender: Gender.other,
      phoneNumber: '0900000000',
      address: 'HCM City, Vietnam'
    },
    create: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      roleId: adminRoleId,
      emailVerified: true,
      status: UserStatus.active,
      typeAccount: AccountType.LOCAL,
      gender: Gender.other,
      phoneNumber: '0900000000',
      address: 'HCM City, Vietnam'
    },
    select: {
      id: true,
      email: true,
      role: { select: { name: true } }
    }
  })

  console.log(
    `✅ Admin seeded: id=${admin.id}, email=${admin.email}, role=${admin.role.name}`
  )
}

async function main() {
  console.log('🌱 Bắt đầu seed database (RBAC + Admin)...')

  const { adminRoleId } = await seedRbac()
  await seedAdminUser(adminRoleId)

  console.log('🎉 Seed hoàn tất.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })

import { registry } from '../openApiRegistry.js'
import { z } from 'zod'

// ROLES
registry.registerPath({ method: 'get', path: '/V1/roles', tags: ['Roles & Permissions (Admin)'], security: [{ bearerAuth: [] }], summary: 'Danh sách Roles', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/roles', tags: ['Roles & Permissions (Admin)'], security: [{ bearerAuth: [] }], summary: 'Tạo Role', responses: { 201: { description: 'OK' } } })
registry.registerPath({ method: 'put', path: '/V1/roles/{id}', tags: ['Roles & Permissions (Admin)'], security: [{ bearerAuth: [] }], summary: 'Cập nhật Role', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'delete', path: '/V1/roles/{id}', tags: ['Roles & Permissions (Admin)'], security: [{ bearerAuth: [] }], summary: 'Xóa Role', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })

// PERMISSIONS
registry.registerPath({ method: 'get', path: '/V1/permissions', tags: ['Roles & Permissions (Admin)'], security: [{ bearerAuth: [] }], summary: 'Danh sách Permissions', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/permissions/me', tags: ['Roles & Permissions'], security: [{ bearerAuth: [] }], summary: 'Lấy quyền của tôi', responses: { 200: { description: 'OK' } } })

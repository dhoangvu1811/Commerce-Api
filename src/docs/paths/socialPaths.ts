import { registry } from '../openApiRegistry.js'
import { z } from 'zod'

// REVIEWS
registry.registerPath({ method: 'get', path: '/V1/reviews/products/{id}', tags: ['Reviews'], summary: 'Xem đánh giá sản phẩm', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/reviews', tags: ['Reviews'], security: [{ bearerAuth: [] }], summary: 'Viết đánh giá', responses: { 201: { description: 'OK' } } })

// WISHLIST
registry.registerPath({ method: 'get', path: '/V1/wishlist', tags: ['Wishlist'], security: [{ bearerAuth: [] }], summary: 'Xem wishlist', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/wishlist/toggle', tags: ['Wishlist'], security: [{ bearerAuth: [] }], summary: 'Thêm/Xóa wishlist', responses: { 200: { description: 'OK' } } })

// CONTACTS
registry.registerPath({ method: 'post', path: '/V1/contacts', tags: ['Contacts'], summary: 'Gửi liên hệ', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/contacts', tags: ['Contacts (Admin)'], security: [{ bearerAuth: [] }], summary: 'Danh sách liên hệ', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/contacts/{id}/reply', tags: ['Contacts (Admin)'], security: [{ bearerAuth: [] }], summary: 'Trả lời liên hệ', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })

// NOTIFICATIONS
registry.registerPath({ method: 'get', path: '/V1/notifications', tags: ['Notifications'], security: [{ bearerAuth: [] }], summary: 'Danh sách thông báo', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'patch', path: '/V1/notifications/read-all', tags: ['Notifications'], security: [{ bearerAuth: [] }], summary: 'Đánh dấu đọc tất cả', responses: { 200: { description: 'OK' } } })

// RECOMMENDATION
registry.registerPath({ method: 'post', path: '/V1/recommendation-events', tags: ['AI Recommendations'], summary: 'Gửi event telemetry', responses: { 200: { description: 'OK' } } })

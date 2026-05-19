import { registry } from '../openApiRegistry.js'
import { z } from 'zod'

// VOUCHERS
registry.registerPath({ method: 'post', path: '/V1/vouchers/verify', tags: ['Vouchers'], summary: 'Xác thực voucher', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/vouchers/active', tags: ['Vouchers'], summary: 'Vouchers đang kích hoạt', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/vouchers/all', tags: ['Vouchers (Admin)'], security: [{ bearerAuth: [] }], summary: 'Tất cả vouchers', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/vouchers/details/{id}', tags: ['Vouchers (Admin)'], security: [{ bearerAuth: [] }], summary: 'Chi tiết voucher', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/vouchers/create', tags: ['Vouchers (Admin)'], security: [{ bearerAuth: [] }], summary: 'Tạo voucher', responses: { 201: { description: 'OK' } } })
registry.registerPath({ method: 'put', path: '/V1/vouchers/update/{id}', tags: ['Vouchers (Admin)'], security: [{ bearerAuth: [] }], summary: 'Cập nhật voucher', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'delete', path: '/V1/vouchers/delete/{id}', tags: ['Vouchers (Admin)'], security: [{ bearerAuth: [] }], summary: 'Xóa voucher', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/vouchers/delete-multiple', tags: ['Vouchers (Admin)'], security: [{ bearerAuth: [] }], summary: 'Xóa nhiều voucher', responses: { 200: { description: 'OK' } } })

// SHIPPING
registry.registerPath({ method: 'get', path: '/V1/shipping/locations/provinces', tags: ['Shipping'], security: [{ bearerAuth: [] }], summary: 'Danh sách tỉnh thành', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/shipping/locations/districts', tags: ['Shipping'], security: [{ bearerAuth: [] }], summary: 'Danh sách quận huyện', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'get', path: '/V1/shipping/locations/wards', tags: ['Shipping'], security: [{ bearerAuth: [] }], summary: 'Danh sách phường xã', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/shipping/quote', tags: ['Shipping'], security: [{ bearerAuth: [] }], summary: 'Tính phí vận chuyển', responses: { 200: { description: 'OK' } } })

// SHIPPING ADDRESSES
registry.registerPath({ method: 'get', path: '/V1/shipping-addresses', tags: ['Shipping Addresses'], security: [{ bearerAuth: [] }], summary: 'Danh sách địa chỉ', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/shipping-addresses', tags: ['Shipping Addresses'], security: [{ bearerAuth: [] }], summary: 'Thêm địa chỉ', responses: { 201: { description: 'OK' } } })
registry.registerPath({ method: 'put', path: '/V1/shipping-addresses/{id}', tags: ['Shipping Addresses'], security: [{ bearerAuth: [] }], summary: 'Cập nhật địa chỉ', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'delete', path: '/V1/shipping-addresses/{id}', tags: ['Shipping Addresses'], security: [{ bearerAuth: [] }], summary: 'Xóa địa chỉ', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'patch', path: '/V1/shipping-addresses/{id}/default', tags: ['Shipping Addresses'], security: [{ bearerAuth: [] }], summary: 'Đặt làm mặc định', request: { params: z.object({ id: z.string() }) }, responses: { 200: { description: 'OK' } } })

// PAYMENTS
registry.registerPath({ method: 'post', path: '/V1/payments/paypal/create-order', tags: ['Payments'], security: [{ bearerAuth: [] }], summary: 'Tạo PayPal order', responses: { 200: { description: 'OK' } } })
registry.registerPath({ method: 'post', path: '/V1/payments/paypal/capture-order', tags: ['Payments'], security: [{ bearerAuth: [] }], summary: 'Capture PayPal order', responses: { 200: { description: 'OK' } } })

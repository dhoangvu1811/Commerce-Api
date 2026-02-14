# Tài Liệu API Client - Products & Categories

> **Lưu ý:** Tài liệu này chỉ dành cho giao diện client (người dùng cuối). Các API quản lý admin không được liệt kê ở đây.

## 📋 Mục Lục
- [Giới Thiệu](#giới-thiệu)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Products API](#products-api)
- [Categories API](#categories-api)
- [Error Handling](#error-handling)

---

## Giới Thiệu

API này cung cấp các endpoints công khai để client truy xuất thông tin sản phẩm và danh mục sản phẩm. Tất cả các endpoint trong tài liệu này **KHÔNG yêu cầu xác thực** (authentication) và có thể truy cập tự do.

---

## Base URL

```
Development: http://localhost:8017/V1
Production:  https://your-domain.com/V1
```

---

## Response Format

Tất cả API responses đều tuân theo format chuẩn:

### Success Response

```json
{
  "code": 200,
  "message": "Thông báo thành công",
  "data": {
    // Dữ liệu trả về
  }
}
```

### Error Response

```json
{
  "code": 400,
  "message": "Thông báo lỗi",
  "data": null
}
```

---

## Products API

### 1. Lấy Danh Sách Sản Phẩm

Lấy danh sách tất cả sản phẩm với hỗ trợ phân trang, tìm kiếm, lọc và sắp xếp.

**Endpoint:**
```
GET /V1/products/getAll
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Số trang hiện tại |
| `itemsPerPage` | number | No | 10 | Số sản phẩm trên mỗi trang |
| `search` | string | No | - | Tìm kiếm theo tên sản phẩm |
| `categoryId` | number | No | - | Lọc theo ID danh mục |
| `sort` | string | No | - | Sắp xếp (price_asc, price_desc, name_asc, name_desc, newest, oldest, rating) |

**Request Example:**

```http
GET /V1/products/getAll?page=1&itemsPerPage=12&categoryId=5&sort=price_asc
```

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/products/getAll?page=1&itemsPerPage=12&search=laptop&categoryId=5&sort=price_asc')
const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy danh sách sản phẩm thành công",
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Laptop Dell XPS 13",
        "slug": "laptop-dell-xps-13-1234567890",
        "image": "https://example.com/images/laptop-dell.jpg",
        "description": "Laptop Dell XPS 13 inch, Intel Core i7, RAM 16GB",
        "price": "25999000",
        "stock": 50,
        "rating": "4.50",
        "selled": 120,
        "discount": "10.00",
        "status": "active",
        "categoryId": 5,
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-02-01T14:20:00.000Z",
        "category": {
          "id": 5,
          "name": "Laptop",
          "slug": "laptop",
          "description": "Laptop và máy tính xách tay",
          "image": "https://example.com/images/category-laptop.jpg",
          "createdAt": "2026-01-01T00:00:00.000Z",
          "updatedAt": "2026-01-01T00:00:00.000Z"
        },
        "images": [
          {
            "id": 1,
            "productId": 1,
            "image": "https://example.com/images/laptop-dell-1.jpg",
            "createdAt": "2026-01-15T10:30:00.000Z"
          },
          {
            "id": 2,
            "productId": 1,
            "image": "https://example.com/images/laptop-dell-2.jpg",
            "createdAt": "2026-01-15T10:30:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "itemsPerPage": 12,
      "totalItems": 45,
      "totalPages": 4,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID sản phẩm |
| `name` | string | Tên sản phẩm |
| `slug` | string | URL-friendly identifier |
| `image` | string\|null | URL ảnh chính của sản phẩm |
| `description` | string\|null | Mô tả chi tiết sản phẩm |
| `price` | string | Giá sản phẩm (VNĐ, dạng Decimal) |
| `stock` | number | Số lượng tồn kho |
| `rating` | string | Đánh giá trung bình (0.00 - 5.00) |
| `selled` | number | Số lượng đã bán |
| `discount` | string | Phần trăm giảm giá (0.00 - 100.00) |
| `status` | string | Trạng thái sản phẩm (active, inactive) |
| `categoryId` | number | ID danh mục sản phẩm |
| `category` | object | Thông tin danh mục sản phẩm |
| `images` | array | Danh sách ảnh gallery của sản phẩm |

**Sort Options:**

- `price_asc` - Giá tăng dần
- `price_desc` - Giá giảm dần
- `name_asc` - Tên A-Z
- `name_desc` - Tên Z-A
- `newest` - Mới nhất
- `oldest` - Cũ nhất
- `rating` - Đánh giá cao nhất

---

### 2. Lấy Chi Tiết Sản Phẩm

Lấy thông tin chi tiết của một sản phẩm theo ID.

**Endpoint:**
```
GET /V1/products/details/:id
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | ID của sản phẩm |

**Request Example:**

```http
GET /V1/products/details/1
```

```javascript
// JavaScript/TypeScript Example
const productId = 1
const response = await fetch(`http://localhost:8017/V1/products/details/${productId}`)
const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy chi tiết sản phẩm thành công",
  "data": {
    "id": 1,
    "name": "Laptop Dell XPS 13",
    "slug": "laptop-dell-xps-13-1234567890",
    "image": "https://example.com/images/laptop-dell.jpg",
    "description": "Laptop Dell XPS 13 inch, Intel Core i7, RAM 16GB, SSD 512GB. Thiết kế sang trọng, hiệu năng mạnh mẽ, phù hợp cho công việc và giải trí.",
    "price": "25999000",
    "stock": 50,
    "rating": "4.50",
    "selled": 120,
    "discount": "10.00",
    "status": "active",
    "categoryId": 5,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-02-01T14:20:00.000Z",
    "category": {
      "id": 5,
      "name": "Laptop",
      "slug": "laptop",
      "description": "Laptop và máy tính xách tay",
      "image": "https://example.com/images/category-laptop.jpg",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "images": [
      {
        "id": 1,
        "productId": 1,
        "image": "https://example.com/images/laptop-dell-1.jpg",
        "createdAt": "2026-01-15T10:30:00.000Z"
      },
      {
        "id": 2,
        "productId": 1,
        "image": "https://example.com/images/laptop-dell-2.jpg",
        "createdAt": "2026-01-15T10:30:00.000Z"
      },
      {
        "id": 3,
        "productId": 1,
        "image": "https://example.com/images/laptop-dell-3.jpg",
        "createdAt": "2026-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

**Response Error (404):**

```json
{
  "code": 404,
  "message": "Không tìm thấy sản phẩm",
  "data": null
}
```

**Response Error (400):**

```json
{
  "code": 400,
  "message": "ID sản phẩm không hợp lệ",
  "data": null
}
```

---

## Categories API

### 1. Lấy Danh Sách Danh Mục

Lấy danh sách tất cả danh mục sản phẩm với hỗ trợ phân trang và tìm kiếm.

**Endpoint:**
```
GET /V1/categories
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Số trang hiện tại |
| `limit` | number | No | 20 | Số danh mục trên mỗi trang |
| `itemsPerPage` | number | No | 20 | Alias của limit |
| `search` | string | No | - | Tìm kiếm theo tên danh mục |

**Request Example:**

```http
GET /V1/categories?page=1&limit=10&search=laptop
```

```javascript
// JavaScript/TypeScript Example
const response = await fetch('http://localhost:8017/V1/categories?page=1&limit=10')
const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy danh sách danh mục thành công",
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Điện thoại",
        "slug": "dien-thoai",
        "description": "Điện thoại di động, smartphone",
        "image": "https://example.com/images/category-phone.jpg",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z",
        "_count": {
          "products": 25
        }
      },
      {
        "id": 2,
        "name": "Laptop",
        "slug": "laptop",
        "description": "Laptop và máy tính xách tay",
        "image": "https://example.com/images/category-laptop.jpg",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z",
        "_count": {
          "products": 18
        }
      },
      {
        "id": 3,
        "name": "Tablet",
        "slug": "tablet",
        "description": "Máy tính bảng",
        "image": "https://example.com/images/category-tablet.jpg",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z",
        "_count": {
          "products": 12
        }
      }
    ],
    "pagination": {
      "page": 1,
      "itemsPerPage": 10,
      "totalItems": 3,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | ID danh mục |
| `name` | string | Tên danh mục |
| `slug` | string | URL-friendly identifier |
| `description` | string\|null | Mô tả danh mục |
| `image` | string\|null | URL ảnh đại diện danh mục |
| `_count.products` | number | Số lượng sản phẩm trong danh mục |

---

### 2. Lấy Chi Tiết Danh Mục

Lấy thông tin chi tiết của một danh mục theo ID.

**Endpoint:**
```
GET /V1/categories/:id
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | ID của danh mục |

**Request Example:**

```http
GET /V1/categories/5
```

```javascript
// JavaScript/TypeScript Example
const categoryId = 5
const response = await fetch(`http://localhost:8017/V1/categories/${categoryId}`)
const data = await response.json()
```

**Response Success (200):**

```json
{
  "code": 200,
  "message": "Lấy thông tin danh mục thành công",
  "data": {
    "id": 5,
    "name": "Laptop",
    "slug": "laptop",
    "description": "Laptop và máy tính xách tay cao cấp, phù hợp cho công việc văn phòng và giải trí",
    "image": "https://example.com/images/category-laptop.jpg",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "_count": {
      "products": 18
    }
  }
}
```

**Response Error (404):**

```json
{
  "code": 404,
  "message": "Danh mục không tìm thấy",
  "data": null
}
```

**Response Error (400):**

```json
{
  "code": 422,
  "message": "ID phải là số nguyên",
  "data": null
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo resource thành công |
| 400 | Bad Request | Request không hợp lệ |
| 404 | Not Found | Không tìm thấy resource |
| 422 | Unprocessable Entity | Dữ liệu validation lỗi |
| 500 | Internal Server Error | Lỗi server |

### Common Error Messages

**Product Errors:**
- `Không tìm thấy sản phẩm` - Sản phẩm không tồn tại với ID được cung cấp
- `ID sản phẩm không hợp lệ` - ID không phải là số hợp lệ

**Category Errors:**
- `Danh mục không tìm thấy` - Danh mục không tồn tại với ID được cung cấp
- `ID phải là số nguyên` - ID không đúng định dạng

---

## Ví Dụ Tích Hợp

### React/Next.js Example

```typescript
// types/product.ts
export interface Product {
  id: number
  name: string
  slug: string
  image: string | null
  description: string | null
  price: string
  stock: number
  rating: string
  selled: number
  discount: string
  status: string
  categoryId: number
  category: Category
  images: ProductImage[]
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  image: string | null
  _count?: {
    products: number
  }
}

export interface ProductImage {
  id: number
  productId: number
  image: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// services/productService.ts
const API_BASE_URL = 'http://localhost:8017/V1'

export const productService = {
  // Lấy danh sách sản phẩm
  async getProducts(params: {
    page?: number
    itemsPerPage?: number
    search?: string
    categoryId?: number
    sort?: string
  }) {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString()
    
    const response = await fetch(`${API_BASE_URL}/products/getAll?${queryString}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch products')
    }
    
    return response.json() as Promise<ApiResponse<{
      products: Product[]
      pagination: {
        page: number
        itemsPerPage: number
        totalItems: number
        totalPages: number
        hasNextPage: boolean
        hasPrevPage: boolean
      }
    }>>
  },

  // Lấy chi tiết sản phẩm
  async getProductById(id: number) {
    const response = await fetch(`${API_BASE_URL}/products/details/${id}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch product')
    }
    
    return response.json() as Promise<ApiResponse<Product>>
  }
}

// services/categoryService.ts
export const categoryService = {
  // Lấy danh sách danh mục
  async getCategories(params: {
    page?: number
    limit?: number
    search?: string
  }) {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString()
    
    const response = await fetch(`${API_BASE_URL}/categories?${queryString}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }
    
    return response.json() as Promise<ApiResponse<{
      categories: Category[]
      pagination: {
        page: number
        itemsPerPage: number
        totalItems: number
        totalPages: number
        hasNextPage: boolean
        hasPrevPage: boolean
      }
    }>>
  },

  // Lấy chi tiết danh mục
  async getCategoryById(id: number) {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch category')
    }
    
    return response.json() as Promise<ApiResponse<Category>>
  }
}

// Component Example
import { useState, useEffect } from 'react'
import { productService } from '@/services/productService'

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await productService.getProducts({
          page: 1,
          itemsPerPage: 12,
          sort: 'newest'
        })
        
        if (response.code === 200) {
          setProducts(response.data.products)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) return <div>Đang tải...</div>
  if (error) return <div>Lỗi: {error}</div>

  return (
    <div className="grid grid-cols-4 gap-4">
      {products.map(product => (
        <div key={product.id} className="product-card">
          <img src={product.image} alt={product.name} />
          <h3>{product.name}</h3>
          <p>{Number(product.price).toLocaleString('vi-VN')} ₫</p>
        </div>
      ))}
    </div>
  )
}
```

### Vue.js Example

```typescript
// composables/useProducts.ts
import { ref } from 'vue'

const API_BASE_URL = 'http://localhost:8017/V1'

export function useProducts() {
  const products = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchProducts = async (params = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const queryString = new URLSearchParams(params).toString()
      const response = await fetch(`${API_BASE_URL}/products/getAll?${queryString}`)
      const data = await response.json()
      
      if (data.code === 200) {
        products.value = data.data.products
      }
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    products,
    loading,
    error,
    fetchProducts
  }
}
```

---

## Ghi Chú Quan Trọng

### 1. Giá Sản Phẩm (Price)
- Giá được trả về dưới dạng **string** (Decimal type từ database)
- Để hiển thị giá tiền đúng format, cần convert sang number và format theo VNĐ:
  ```javascript
  const formattedPrice = Number(product.price).toLocaleString('vi-VN') + ' ₫'
  // Output: 25.999.000 ₫
  ```

### 2. Giảm Giá (Discount)
- Discount là phần trăm (0.00 - 100.00)
- Để tính giá sau giảm:
  ```javascript
  const originalPrice = Number(product.price)
  const discountPercent = Number(product.discount)
  const finalPrice = originalPrice * (1 - discountPercent / 100)
  ```

### 3. Đánh Giá (Rating)
- Rating được trả về dưới dạng string (Decimal type)
- Giá trị từ 0.00 đến 5.00
- Convert sang number để hiển thị:
  ```javascript
  const rating = Number(product.rating) // 4.50
  ```

### 4. Trạng Thái (Status)
- `active` - Sản phẩm đang hoạt động và có thể bán
- `inactive` - Sản phẩm ngừng kinh doanh (nên ẩn trên UI)

### 5. Hình Ảnh
- `image` - Ảnh chính của sản phẩm (có thể null)
- `images` - Mảng các ảnh gallery phụ
- Luôn kiểm tra null/undefined trước khi hiển thị

### 6. Pagination
- Sử dụng `hasNextPage` và `hasPrevPage` để điều khiển nút Previous/Next
- `totalPages` để tạo pagination links

---

## Support

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub repository hoặc liên hệ team phát triển.

**Created:** February 8, 2026  
**Version:** 1.0.0  
**Author:** E-commerce API Team

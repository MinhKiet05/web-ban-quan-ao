# API Specification — Web Bán Quần Áo

**Base URL (Production):** `https://web-ban-quan-ao-9s0d.onrender.com/api`  
**Base URL (Local):** `http://localhost:3000/api`  
**Version:** 1.0  
**Cập nhật:** 2026-05-19

> Tài liệu phản ánh **code thực tế** trong `BE/src/routes/`. Endpoint đánh dấu `[PLANNED]` có trong schema/spec cũ nhưng **chưa implement** route.

---

## Mục lục

1. [Quy ước chung](#quy-ước-chung)
2. [Authentication](#authentication)
3. [Users & Account](#users--account)
4. [Products](#products)
5. [Cart](#cart)
6. [Orders & Payments](#orders--payments)
7. [Reviews & Vouchers](#reviews--vouchers-planned)
8. [Mã lỗi thường gặp](#mã-lỗi-thường-gặp)

---

## Quy ước chung

### Response envelope

**Thành công:**
```json
{
  "success": true,
  "message": "Mô tả (tuỳ endpoint)",
  "data": { },
  "token": { "accessToken": "..." }
}
```

**Lỗi (global error handler):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_CREDENTIALS_INVALID",
    "message": "Email hoặc mật khẩu không đúng",
    "details": [],
    "timestamp": "2026-05-19T10:00:00.000Z",
    "path": "/api/auth/login",
    "requestId": "req_abc123"
  }
}
```

### Authentication types

| Loại | Mô tả |
|------|--------|
| **Public** | Không cần header |
| **Bearer** | `Authorization: Bearer <accessToken>` |
| **Cookie** | `refreshToken` HTTP-only (login/refresh/logout) |

### Token lifecycle (thực tế trong code)

| Token | Lưu trữ | TTL (config) |
|-------|---------|----------------|
| Access Token | `localStorage` (FE) + JWT payload | `3d` (`jwtExpire`) |
| Refresh Token | Cookie `refreshToken` + bảng `sessions` | `7d` (`jwtfreshExpire`) |

> **Lưu ý:** FE dùng `withCredentials: true` để gửi cookie cross-origin (Render + Vercel).

---

## Authentication

### `POST /auth/register` — Public

Đăng ký tài khoản email.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "role": "customer"
}
```

| Field | Rule |
|-------|------|
| `password` | ≥6 ký tự, có hoa + thường + số |
| `phone` | `0xxxxxxxxx` hoặc `+84...` |
| `role` | Optional: `customer` \| `admin` |

**Response `201`:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": "usr_01HXYZ",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "phone": "0912345678",
      "role": "customer"
    },
    "account": {
      "id": "acc_01HXYZ",
      "accountType": "email",
      "identifier": "user@example.com",
      "isVerified": false
    }
  }
}
```

| Status | Mô tả |
|--------|--------|
| 201 | Tạo thành công |
| 400 | Validation error |
| 409 | Email/phone đã tồn tại |

---

### `POST /auth/login` — Public

**Request:**
```json
{
  "identifier": "user@example.com",
  "password": "SecurePass1"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "usr_01HXYZ",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "role": "customer",
      "tier": "normal",
      "loyaltyPoints": 0
    }
  },
  "token": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Set-Cookie:** `refreshToken=...; HttpOnly; Max-Age=604800`

| Status | Mô tả |
|--------|--------|
| 200 | OK |
| 401 | Sai credential / account locked |
| 400 | Validation |

**Headers tuỳ chọn:** `Device-Type: desktop|mobile`

---

### `POST /auth/refresh` — Public (cookie)

Làm mới access token từ cookie `refreshToken`.

**Request:** body rỗng, cookie bắt buộc.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

| Status | Mô tả |
|--------|--------|
| 200 | OK |
| 401 | Refresh invalid/expired |

---

### `POST /auth/logout` — Public (cookie)

Vô hiệu hóa session, xóa cookie.

**Response `200`:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

---

### `GET /auth/me` — Bearer

Lấy user từ access token.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01HXYZ",
      "email": "user@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "customer"
    }
  }
}
```

---

### `GET /auth/sessions` — Bearer

Danh sách session đang active.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "ses_01",
        "deviceType": "desktop",
        "ipAddress": "1.2.3.4",
        "lastActivityAt": "2026-05-19T08:00:00Z",
        "isActive": true
      }
    ],
    "total": 1
  }
}
```

---

### `POST /auth/logout-all` — Bearer

Đăng xuất mọi thiết bị.

---

### `DELETE /auth/sessions/:sessionId` — Bearer

Đăng xuất một session cụ thể.

---

### `[PLANNED] POST /auth/oauth/google`

OAuth Google — schema `accounts` đã hỗ trợ `oauth_*`, route chưa có.

---

## Users & Account

### `GET /users/me` — Bearer

Profile đầy đủ từ DB.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "usr_01HXYZ",
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0912345678",
    "role": "customer",
    "tier": "normal",
    "loyalty_points": 0
  }
}
```

---

### `PUT /users/me` — Bearer

**Request:**
```json
{
  "full_name": "Nguyễn Văn B",
  "phone": "0987654321",
  "date_of_birth": "1995-03-20",
  "avatar_url": "https://cdn.example.com/avatar.jpg"
}
```

---

### `PUT /account/change-password` — Bearer

**Request:**
```json
{
  "currentPassword": "SecurePass1",
  "newPassword": "NewSecurePass2"
}
```

---

### `POST /account/forgot-password` — Public

**Request:** `{ "email": "user@example.com" }`

---

### `POST /account/reset-password` — Public

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass2"
}
```

---

### `[PLANNED] GET/POST /users/me/addresses`

CRUD địa chỉ — bảng `addresses` có trong schema, API chưa mount.

---

## Products

### `GET /products/list` — Public

Danh sách sản phẩm với **cursor pagination** và filter.

**Query params:**

| Param | Type | Mô tả |
|-------|------|--------|
| `category_id` | string | Một danh mục |
| `category_ids` | string | Nhiều ID, comma-separated |
| `sort` | string | `newest`, `price:asc`, `price:desc`, `rating`, `sold` |
| `limit` | number | Default `10` |
| `cursor` | JSON string | Cursor trang trước |
| `min_price`, `max_price` | number | Khoảng giá |
| `inStock` | boolean | `true` = còn hàng |
| `rating` | number | Lọc `avg_rating >=` |
| `colors`, `sizes` | string | Comma-separated |
| `is_sale` | boolean | Đang sale |
| `q` | string | Full-text search tên |

**Example:**
```
GET /products/list?category_id=cat_ao_thun&sort=price:asc&min_price=100000&max_price=500000&limit=12&q=thun
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prd_001",
        "name": "Áo thun basic",
        "slug": "ao-thun-basic",
        "base_price": 199000,
        "original_price": 249000,
        "is_sale": true,
        "avg_rating": 4.5,
        "sold_count": 120,
        "category_name": "Áo thun",
        "product_images": [
          { "url": "https://...", "is_primary": true }
        ]
      }
    ]
  }
}
```

---

### `GET /products/:slug` — Public

Chi tiết sản phẩm (view `v_product_detail`).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prd_001",
      "name": "Áo thun basic",
      "slug": "ao-thun-basic",
      "description": "...",
      "variants": [
        {
          "id": "var_001",
          "size": "M",
          "color": "Trắng",
          "price": 199000,
          "sale_price": null,
          "stock_qty": 50,
          "images": []
        }
      ],
      "product_images": []
    }
  }
}
```

| Status | Mô tả |
|--------|--------|
| 404 | Slug không tồn tại |

---

### `GET /products/categories` — Public

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": "cat_01", "name": "Nam", "slug": "nam", "parent_id": null }
    ]
  }
}
```

---

### `GET /products/filters` — Public

Metadata cho panel lọc (categories, min/max price, colors, sizes).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "categories": [],
    "priceRange": { "min": 50000, "max": 2000000 },
    "colors": ["trắng", "đen"],
    "sizes": ["s", "m", "l", "xl"]
  }
}
```

---

### `GET /products/total-count` — Public

**Query:** `category_id` (optional)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalCount": 150,
    "pagination": { "limit": 10 }
  }
}
```

---

### `DELETE /products/:id` — Public ⚠️

Xóa sản phẩm — **hiện không có `authenticate` + `authorize('admin')`** → cần bảo vệ trước production.

**Response `200`:**
```json
{
  "success": true,
  "message": "Xóa sản phẩm thành công"
}
```

---

### `[PLANNED] POST/PUT /products`

Admin CRUD tạo/sửa sản phẩm + upload ảnh.

---

## Cart

> Tất cả cart routes yêu cầu **Bearer** (chưa hỗ trợ guest `session_id`).

### `GET /cart/items` — Bearer

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "cart_id": "cart_001",
    "items": [
      {
        "id": "ci_001",
        "variant_id": "var_001",
        "quantity": 2,
        "added_price": 199000,
        "product_name": "Áo thun basic",
        "size": "M",
        "color": "Trắng",
        "stock_qty": 50
      }
    ]
  }
}
```

---

### `POST /cart/add-item` — Bearer

**Request:**
```json
{
  "variant_id": "var_001",
  "quantity": 1,
  "added_price": 199000
}
```

**Response `201`:** `{ "success": true, "data": { ...cartItem } }`

---

### `PUT /cart/update-item` — Bearer

**Request:**
```json
{
  "cart_item_id": "ci_001",
  "quantity": 3,
  "added_price": 199000
}
```

---

### `DELETE /cart/item/:id` — Bearer

**Response `204`:** No content

---

## Orders & Payments

### `POST /orders` — Bearer

Tạo đơn hàng.

**Request:**
```json
{
  "shipping_name": "Nguyễn Văn A",
  "shipping_phone": "0912345678",
  "shipping_email": "user@example.com",
  "shipping_province": "Hà Nội",
  "shipping_district": "Hoàn Kiếm",
  "shipping_ward": "Hàng Bạc",
  "shipping_street": "123 Đường ABC",
  "shipping_note": "Gọi trước khi giao",
  "customer_note": "",
  "shipping_fee": 30000,
  "voucher_id": null,
  "payment_method": "cod",
  "items": [
    {
      "variant_id": "var_001",
      "product_name": "Áo thun basic",
      "product_slug": "ao-thun-basic",
      "sku": "ATB-W-M",
      "size": "M",
      "color": "Trắng",
      "image_url": "https://...",
      "unit_price": 199000,
      "quantity": 2
    }
  ]
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Đặt hàng thành công",
  "data": {
    "order": {
      "id": "ord_001",
      "order_code": "FS-20260519-001",
      "status": "pending",
      "total": 428000,
      "payment": { "method": "cod", "status": "pending" }
    }
  }
}
```

| `payment_method` | Hành vi hiện tại |
|------------------|------------------|
| `cod` | Tạo payment `pending` |
| `credit_card`, `debit_card` | Giả lập confirm ngay |

---

### `GET /orders` — Bearer

**Query:** `page` (default 1), `limit` (default 10, max 50)

**Response `200`:**
```json
{
  "success": true,
  "data": [ { "id": "ord_001", "order_code": "FS-...", "status": "pending", "total": 428000 } ],
  "pagination": { "page": 1, "limit": 10 }
}
```

---

### `GET /orders/:id` — Bearer

Chi tiết đơn (chỉ owner).

---

### `PATCH /orders/:id/cancel` — Bearer

**Request:** `{ "reason": "Đặt nhầm size" }`

**Response `200`:**
```json
{
  "success": true,
  "message": "Đơn hàng đã được huỷ",
  "data": { "id": "ord_001", "status": "cancelled" }
}
```

---

### `GET /orders/:id/payment` — Bearer

Trạng thái thanh toán của đơn.

---

### `[PLANNED] POST /payments/vnpay/create`

Tích hợp VNPay/MoMo — bảng `payments.gateway_*` đã sẵn sàng.

---

## Reviews & Vouchers [PLANNED]

| Method | URL | Auth | Ghi chú |
|--------|-----|------|---------|
| POST | `/reviews` | Bearer | Schema + trigger rating sẵn |
| GET | `/products/:slug/reviews` | Public | Pagination |
| GET | `/vouchers` | Bearer | |
| POST | `/vouchers/validate` | Public/Bearer | |

---

## Mã lỗi thường gặp

| HTTP | Code | Ý nghĩa |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Body/query không hợp lệ |
| 401 | — | Thiếu/hết hạn token |
| 403 | — | Role không đủ quyền |
| 404 | `PRODUCT_NOT_FOUND` | Không tìm thấy resource |
| 409 | `DUPLICATE_EMAIL` | Trùng đăng ký |
| 422 | `INSUFFICIENT_STOCK` | Hết hàng (DB trigger) |
| 500 | — | Lỗi server / JWT_SECRET chưa set |

Chi tiết: `BE/src/docs/ERRORS_EXPLANATION.md`

---

## Health check

| Method | URL | Auth |
|--------|-----|------|
| GET | `/` | Public |
| GET | `/api` | Public — liệt kê endpoints |

**`GET /api` response:**
```json
{
  "success": true,
  "message": "API Routes are working",
  "version": "1.0.0",
  "availableEndpoints": {
    "auth": "/api/auth",
    "account": "/api/account",
    "users": "/api/users"
  }
}
```

---

## Gợi ý tối ưu API

1. Thống nhất naming: BE trả `snake_case` ở DB, FE dùng `camelCase` — nên chuẩn hóa một phía hoặc dùng transform layer.
2. Bảo vệ `DELETE /products/:id` bằng `authenticate` + `authorize('admin')`.
3. Thêm OpenAPI/Swagger (`swagger-jsdoc`) generate từ JSDoc routes.
4. Rate limiting (`express-rate-limit`) cho `/auth/login`.
5. Version prefix `/api/v1` khi breaking change.

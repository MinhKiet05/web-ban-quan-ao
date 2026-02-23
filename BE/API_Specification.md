# Fashion Store API Specification

**Version:** 1.0  
**Base URL:** `https://api.fashionstore.vn/api/v1`  
**Last Updated:** February 13, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Responses](#common-responses)
4. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Products](#products-endpoints)
   - [Cart](#cart-endpoints)
   - [Orders](#orders-endpoints)
   - [Payments](#payments-endpoints)
   - [Reviews](#reviews-endpoints)
   - [Vouchers](#vouchers-endpoints)
5. [Webhooks](#webhooks)
6. [Rate Limiting](#rate-limiting)

---

## Overview

Fashion Store API là RESTful API sử dụng JSON cho request/response. API hỗ trợ:
- ✅ JWT Authentication với Refresh Token
- ✅ OAuth 2.0 (Google, Facebook)
- ✅ Pagination, Filtering, Sorting
- ✅ Webhooks cho events
- ✅ Rate limiting

### Base Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-13T10:30:00Z",
    "requestId": "req_1234567890"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ ... ],
    "timestamp": "2026-02-13T10:30:00Z",
    "path": "/api/v1/endpoint",
    "requestId": "req_1234567890"
  }
}
```

---

## Authentication

### Bearer Token

Tất cả authenticated endpoints yêu cầu JWT token trong header:

```http
Authorization: Bearer <access_token>
```

### Token Lifecycle

- **Access Token:** Hết hạn sau 15 phút
- **Refresh Token:** Hết hạn sau 7 ngày
- **Session:** Hết hạn sau 30 ngày không hoạt động

---

## Common Responses

### Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "email",
        "message": "Email không đúng định dạng",
        "value": "invalid-email"
      }
    ]
  }
}
```

---

## API Endpoints

## Authentication Endpoints

### POST /auth/register

Đăng ký tài khoản mới.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "Nguyễn Văn A",
  "phone": "0912345678"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "role": "customer",
      "tier": "normal",
      "is_verified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR`: Dữ liệu không hợp lệ
- `409 DUPLICATE_EMAIL`: Email đã tồn tại
- `400 PASSWORD_TOO_WEAK`: Mật khẩu không đủ mạnh

---

### POST /auth/login

Đăng nhập bằng email/password hoặc phone/password.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "password": "SecurePass123!",
  "deviceName": "iPhone 14 Pro"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "role": "customer",
      "tier": "gold",
      "loyalty_points": 1500
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

**Error Responses:**
- `401 AUTH_CREDENTIALS_INVALID`: Sai email/password
- `401 AUTH_ACCOUNT_LOCKED`: Tài khoản bị khóa
- `401 AUTH_ACCOUNT_UNVERIFIED`: Chưa xác minh email

---

### POST /auth/refresh

Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/logout

Đăng xuất (invalidate token).

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

---

### POST /auth/oauth/google

Đăng nhập/Đăng ký bằng Google OAuth.

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "deviceName": "Chrome on MacOS"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... },
    "isNewUser": false
  }
}
```

---

## Users Endpoints

### GET /users/me

Lấy thông tin user hiện tại.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "full_name": "Nguyễn Văn A",
      "phone": "0912345678",
      "avatar_url": "https://cdn.example.com/avatar.jpg",
      "role": "customer",
      "tier": "gold",
      "loyalty_points": 1500,
      "total_spent": 15500000,
      "total_orders": 25,
      "created_at": "2025-01-15T08:30:00Z"
    }
  }
}
```

---

### PUT /users/me

Cập nhật thông tin profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "full_name": "Nguyễn Văn B",
  "phone": "0987654321",
  "date_of_birth": "1990-05-15"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

### GET /users/me/addresses

Lấy danh sách địa chỉ.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "id": 1,
        "recipient_name": "Nguyễn Văn A",
        "recipient_phone": "0912345678",
        "province": "Hà Nội",
        "district": "Hoàn Kiếm",
        "ward": "Hàng Bạc",
        "street_address": "123 Đường ABC",
        "is_default": true
      }
    ]
  }
}
```

---

### POST /users/me/addresses

Thêm địa chỉ mới.

**Request Body:**
```json
{
  "recipient_name": "Nguyễn Văn A",
  "recipient_phone": "0912345678",
  "province": "Hà Nội",
  "district": "Hoàn Kiếm",
  "ward": "Hàng Bạc",
  "street_address": "123 Đường ABC",
  "is_default": true
}
```

---

## Products Endpoints

### GET /products

Lấy danh sách sản phẩm (có pagination, filter, sort).

**Query Parameters:**
- `page` (int): Trang hiện tại (default: 1)
- `limit` (int): Số item/trang (default: 20, max: 100)
- `category` (int): Filter theo category ID
- `brand` (string): Filter theo brand
- `min_price` (decimal): Giá tối thiểu
- `max_price` (decimal): Giá tối đa
- `size` (string): Filter theo size (S, M, L, XL)
- `color` (string): Filter theo màu
- `sort` (string): Sắp xếp (newest, price_asc, price_desc, bestseller, rating)
- `search` (string): Tìm kiếm theo tên

**Example:**
```
GET /products?category=5&sort=price_asc&min_price=100000&max_price=500000&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 456,
        "name": "Áo thun basic trắng",
        "slug": "ao-thun-basic-trang",
        "brand": "Local Brand",
        "category": {
          "id": 5,
          "name": "Áo thun nam",
          "slug": "ao-thun-nam"
        },
        "thumbnail": "https://cdn.example.com/products/456/thumb.jpg",
        "price_range": {
          "min": 199000,
          "max": 249000
        },
        "rating": {
          "average": 4.5,
          "count": 127
        },
        "sold_count": 543,
        "is_featured": false,
        "available_colors": ["Trắng", "Đen", "Xám"],
        "available_sizes": ["S", "M", "L", "XL"]
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /products/:slug

Lấy chi tiết sản phẩm.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 456,
      "name": "Áo thun basic trắng",
      "slug": "ao-thun-basic-trang",
      "description": "Áo thun cotton 100% cao cấp...",
      "brand": "Local Brand",
      "material": "Cotton 100%",
      "origin_country": "Việt Nam",
      "care_instructions": "Giặt máy ở nhiệt độ thường...",
      "category": {
        "id": 5,
        "name": "Áo thun nam",
        "slug": "ao-thun-nam",
        "parent": {
          "id": 1,
          "name": "Nam",
          "slug": "nam"
        }
      },
      "images": [
        {
          "url": "https://cdn.example.com/products/456/1.jpg",
          "is_primary": true
        },
        {
          "url": "https://cdn.example.com/products/456/2.jpg",
          "is_primary": false
        }
      ],
      "variants": [
        {
          "id": 789,
          "sku": "ATB-WHITE-M",
          "size": "M",
          "color": "Trắng",
          "color_hex": "#FFFFFF",
          "price": 199000,
          "sale_price": null,
          "stock_qty": 50,
          "image_url": "https://cdn.example.com/variants/789.jpg"
        }
      ],
      "rating": {
        "average": 4.5,
        "count": 127,
        "distribution": {
          "5": 70,
          "4": 40,
          "3": 12,
          "2": 3,
          "1": 2
        }
      },
      "sold_count": 543,
      "view_count": 12456
    }
  }
}
```

**Error Responses:**
- `404 PRODUCT_NOT_FOUND`: Sản phẩm không tồn tại

---

## Cart Endpoints

### GET /cart

Lấy giỏ hàng hiện tại.

**Headers:** `Authorization: Bearer <token>` (Optional cho guest)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": 123,
      "items": [
        {
          "id": 1,
          "variant": {
            "id": 789,
            "product": {
              "id": 456,
              "name": "Áo thun basic trắng",
              "slug": "ao-thun-basic-trang",
              "thumbnail": "https://cdn.example.com/..."
            },
            "sku": "ATB-WHITE-M",
            "size": "M",
            "color": "Trắng",
            "price": 199000,
            "sale_price": null
          },
          "quantity": 2,
          "line_total": 398000
        }
      ],
      "summary": {
        "subtotal": 398000,
        "item_count": 2,
        "total_quantity": 2
      }
    }
  }
}
```

---

### POST /cart/items

Thêm sản phẩm vào giỏ.

**Request Body:**
```json
{
  "variant_id": 789,
  "quantity": 2
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "cart": { ... }
  }
}
```

**Error Responses:**
- `404 PRODUCT_NOT_FOUND`: Variant không tồn tại
- `422 INSUFFICIENT_STOCK`: Không đủ hàng
- `422 PRODUCT_OUT_OF_STOCK`: Sản phẩm hết hàng

---

### PUT /cart/items/:id

Cập nhật số lượng.

**Request Body:**
```json
{
  "quantity": 3
}
```

---

### DELETE /cart/items/:id

Xóa item khỏi giỏ hàng.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Đã xóa sản phẩm khỏi giỏ hàng",
    "cart": { ... }
  }
}
```

---

## Orders Endpoints

### POST /orders

Tạo đơn hàng mới.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "shipping_address_id": 1,
  "voucher_code": "NEWUSER50",
  "payment_method": "cod",
  "note": "Giao hàng giờ hành chính"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 12345,
      "order_code": "ORD-20260213-12345",
      "status": "pending",
      "items": [
        {
          "product_name": "Áo thun basic trắng",
          "sku": "ATB-WHITE-M",
          "size": "M",
          "color": "Trắng",
          "quantity": 2,
          "unit_price": 199000,
          "line_total": 398000
        }
      ],
      "pricing": {
        "subtotal": 398000,
        "discount_amount": 50000,
        "shipping_fee": 30000,
        "total": 378000
      },
      "shipping": {
        "name": "Nguyễn Văn A",
        "phone": "0912345678",
        "address": "123 Đường ABC, Hàng Bạc, Hoàn Kiếm, Hà Nội"
      },
      "payment": {
        "method": "cod",
        "status": "pending"
      },
      "created_at": "2026-02-13T10:30:00Z"
    }
  }
}
```

**Error Responses:**
- `400 MISSING_REQUIRED_FIELD`: Thiếu thông tin bắt buộc
- `404 ADDRESS_NOT_FOUND`: Địa chỉ không tồn tại
- `422 INSUFFICIENT_STOCK`: Không đủ hàng
- `422 VOUCHER_EXPIRED`: Voucher hết hạn
- `422 MIN_ORDER_NOT_MET`: Chưa đủ giá trị đơn tối thiểu

---

### GET /orders

Lấy danh sách đơn hàng của user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter theo status (pending, confirmed, shipped, delivered, completed, cancelled)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 12345,
        "order_code": "ORD-20260213-12345",
        "status": "shipped",
        "total": 378000,
        "item_count": 1,
        "total_quantity": 2,
        "created_at": "2026-02-13T10:30:00Z",
        "tracking": {
          "carrier": "GHTK",
          "tracking_code": "GHTK123456789"
        }
      }
    ]
  },
  "pagination": { ... }
}
```

---

### GET /orders/:orderCode

Lấy chi tiết đơn hàng.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 12345,
      "order_code": "ORD-20260213-12345",
      "status": "shipped",
      "items": [ ... ],
      "pricing": { ... },
      "shipping": { ... },
      "payment": { ... },
      "tracking": {
        "carrier": "GHTK",
        "tracking_code": "GHTK123456789",
        "status": "in_transit",
        "estimated_delivery": "2026-02-15"
      },
      "timeline": [
        {
          "status": "pending",
          "timestamp": "2026-02-13T10:30:00Z"
        },
        {
          "status": "confirmed",
          "timestamp": "2026-02-13T11:00:00Z"
        },
        {
          "status": "shipped",
          "timestamp": "2026-02-14T09:00:00Z"
        }
      ]
    }
  }
}
```

---

### POST /orders/:orderCode/cancel

Hủy đơn hàng.

**Request Body:**
```json
{
  "reason": "Đặt nhầm size"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "order": { ... },
    "message": "Đơn hàng đã được hủy"
  }
}
```

**Error Responses:**
- `422 ORDER_CANNOT_CANCEL`: Đơn hàng đang giao không thể hủy
- `422 ORDER_ALREADY_PAID`: Đơn đã thanh toán không thể hủy

---

## Payments Endpoints

### POST /payments/vnpay/create

Tạo URL thanh toán VNPay.

**Request Body:**
```json
{
  "order_id": 12345,
  "return_url": "https://fashionstore.vn/checkout/success"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "transaction_id": "TXN123456789"
  }
}
```

---

### POST /payments/vnpay/callback

VNPay IPN callback (webhook).

**Request Body:** VNPay IPN parameters

---

### POST /payments/momo/create

Tạo thanh toán MoMo.

---

## Reviews Endpoints

### POST /reviews

Tạo đánh giá sản phẩm.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "product_id": 456,
  "order_item_id": 789,
  "rating": 5,
  "title": "Sản phẩm tuyệt vời!",
  "content": "Chất liệu tốt, form chuẩn...",
  "images": [
    "https://cdn.example.com/reviews/img1.jpg"
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "review": {
      "id": 999,
      "product_id": 456,
      "user": {
        "name": "Nguyễn Văn A",
        "avatar": "https://cdn.example.com/avatar.jpg"
      },
      "rating": 5,
      "title": "Sản phẩm tuyệt vời!",
      "content": "Chất liệu tốt, form chuẩn...",
      "images": [ ... ],
      "is_verified_purchase": true,
      "created_at": "2026-02-13T10:30:00Z"
    }
  }
}
```

---

### GET /products/:slug/reviews

Lấy reviews của sản phẩm.

**Query Parameters:**
- `page`, `limit`: Pagination
- `rating`: Filter theo số sao (1-5)
- `sort`: Sắp xếp (newest, oldest, helpful)

---

## Vouchers Endpoints

### GET /vouchers

Lấy danh sách vouchers khả dụng.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "vouchers": [
      {
        "id": 1,
        "code": "NEWUSER50",
        "name": "Giảm 50k cho khách hàng mới",
        "type": "fixed",
        "value": 50000,
        "min_order_value": 200000,
        "start_date": "2026-02-01T00:00:00Z",
        "end_date": "2026-02-28T23:59:59Z",
        "usage_limit": 1000,
        "used_count": 342
      }
    ]
  }
}
```

---

### POST /vouchers/validate

Validate voucher code.

**Request Body:**
```json
{
  "code": "NEWUSER50",
  "order_value": 350000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "voucher": { ... },
    "discount_amount": 50000
  }
}
```

**Error Responses:**
- `404 VOUCHER_NOT_FOUND`: Voucher không tồn tại
- `422 VOUCHER_EXPIRED`: Voucher hết hạn
- `422 MIN_ORDER_NOT_MET`: Chưa đủ giá trị tối thiểu

---

## Webhooks

### Payment Success

**URL:** Configured in dashboard  
**Method:** POST

**Payload:**
```json
{
  "event": "payment.success",
  "data": {
    "order_id": 12345,
    "transaction_id": "TXN123456789",
    "amount": 378000,
    "paid_at": "2026-02-13T10:35:00Z"
  }
}
```

---

### Order Status Changed

**Payload:**
```json
{
  "event": "order.status_changed",
  "data": {
    "order_id": 12345,
    "order_code": "ORD-20260213-12345",
    "old_status": "confirmed",
    "new_status": "shipped",
    "changed_at": "2026-02-14T09:00:00Z"
  }
}
```

---

## Rate Limiting

- **Anonymous:** 60 requests/phút
- **Authenticated:** 300 requests/phút
- **Premium Tier:** 1000 requests/phút

**Rate Limit Headers:**
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 285
X-RateLimit-Reset: 1644739200
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Vượt quá giới hạn requests",
    "retry_after": 60
  }
}
```

---

## Appendix

### Environment URLs

- **Production:** `https://api.fashionstore.vn/api/v1`
- **Staging:** `https://api-staging.fashionstore.vn/api/v1`
- **Development:** `http://localhost:3000/api/v1`

### SDK & Libraries

- **JavaScript/TypeScript:** `@fashionstore/api-client`
- **PHP:** `fashionstore/php-sdk`
- **Python:** `fashionstore-api`

### Support

- **Documentation:** https://docs.fashionstore.vn
- **API Status:** https://status.fashionstore.vn
- **Support Email:** api-support@fashionstore.vn

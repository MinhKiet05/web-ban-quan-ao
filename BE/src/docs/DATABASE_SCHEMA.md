# Database Schema Documentation

**File:** `src/database/schema_optimized.sql`  
**Version:** 2.0  
**Database:** PostgreSQL

---

## Tổng quan

Đây là schema cơ sở dữ liệu cho hệ thống bán quần áo thời trang. Schema được thiết kế tối ưu với các bảng tách biệt rõ ràng giữa xác thực (`accounts`), thông tin người dùng (`users`), sản phẩm, đơn hàng, giỏ hàng, và các tính năng phụ.

---

## Sơ đồ quan hệ

```
users ─────────── accounts (1-n)
  │ └───────────── sessions (1-n)
  │ └───────────── addresses (1-n)
  │ └───────────── orders (1-n)
  │ └───────────── reviews (1-n)
  │ └───────────── carts (1-1)
  │ └───────────── return_requests (1-n)
  │
categories ──────── products (1-n)
  │                   └──── product_variants (1-n)
  │                   └──── product_images (1-n)
  │
orders ──────────── order_items (1-n)
  │ └────────────── payments (1-n)
  │ └────────────── shipments (1-n)
  │ └────────────── return_requests (1-n)
  │
vouchers ────────── voucher_usage (1-n)
carts ───────────── cart_items (1-n)
```

---

## Các ENUM (Custom Types)

| Enum | Các giá trị |
|---|---|
| `user_role` | `customer`, `admin`, `staff`, `super_admin` |
| `user_tier` | `normal`, `silver`, `gold`, `platinum`, `vip` |
| `account_type` | `email`, `phone`, `oauth_google`, `oauth_facebook`, `oauth_apple` |
| `product_status` | `draft`, `active`, `archived`, `out_of_stock` |
| `order_status` | `pending`, `confirmed`, `packing`, `shipped`, `delivered`, `completed`, `cancelled`, `refunded` |
| `payment_method` | `cod`, `vnpay`, `momo`, `zalopay`, `bank_transfer`, `credit_card`, `debit_card` |
| `payment_status` | `pending`, `paid`, `failed`, `refunded`, `partially_refunded` |
| `shipment_status` | `preparing`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `returned`, `failed` |
| `voucher_type` | `percent`, `fixed`, `free_ship` |
| `return_status` | `pending`, `approved`, `rejected`, `processing`, `refunded`, `completed` |

---

## Chi tiết các bảng

### 1. `users` — Thông tin người dùng

Lưu thông tin hồ sơ và dữ liệu kinh doanh của người dùng.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID người dùng |
| `full_name` | VARCHAR(100) | Họ tên |
| `avatar_url` | TEXT | Ảnh đại diện |
| `date_of_birth` | DATE | Ngày sinh |
| `gender` | VARCHAR(10) | Giới tính |
| `email` | VARCHAR(150) | Email (phải có email hoặc phone) |
| `phone` | VARCHAR(15) | Số điện thoại |
| `role` | user_role | Vai trò (mặc định: `customer`) |
| `tier` | user_tier | Hạng thành viên (mặc định: `normal`) |
| `loyalty_points` | INT | Điểm tích lũy |
| `total_spent` | DECIMAL(15,2) | Tổng tiền đã chi |
| `total_orders` | INT | Tổng số đơn hàng |
| `is_active` | BOOLEAN | Tài khoản đang hoạt động |
| `is_verified` | BOOLEAN | Đã xác thực |
| `is_blocked` | BOOLEAN | Bị khóa |

> **Ràng buộc:** `email` hoặc `phone` phải có ít nhất một cái.

---

### 2. `accounts` — Xác thực (Consolidated)

Lưu thông tin đăng nhập. Dữ liệu OAuth được gộp thẳng vào đây (không có bảng riêng).

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID tài khoản |
| `user_id` | FK → users | Người dùng sở hữu |
| `account_type` | account_type | Loại tài khoản |
| `identifier` | VARCHAR(255) | Định danh (email/phone/oauth_id) |
| `password_hash` | VARCHAR(255) | Mật khẩu đã hash |
| `is_verified` | BOOLEAN | Đã xác thực |
| `verification_token` | VARCHAR(255) | Token xác thực email |
| `reset_token` | VARCHAR(255) | Token đặt lại mật khẩu |
| `oauth_access_token` | TEXT | Token OAuth |
| `oauth_provider_data` | JSONB | Dữ liệu thô từ OAuth provider |
| `failed_login_attempts` | INT | Số lần đăng nhập sai |
| `locked_until` | TIMESTAMP | Thời gian bị khóa tới |
| `last_login_at` | TIMESTAMP | Lần đăng nhập cuối |

> **Ràng buộc:** `(account_type, identifier)` là UNIQUE.

---

### 3. `sessions` — Phiên đăng nhập

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID session |
| `user_id` | FK → users | Người dùng |
| `account_id` | FK → accounts | Tài khoản đăng nhập |
| `session_token` | VARCHAR(500) UNIQUE | Token session (JWT access) |
| `refresh_token` | VARCHAR(500) UNIQUE | Token làm mới |
| `device_type` | VARCHAR(50) | Loại thiết bị |
| `ip_address` | VARCHAR(45) | Địa chỉ IP |
| `is_active` | BOOLEAN | Session còn hiệu lực |
| `expires_at` | TIMESTAMP | Thời hạn hết hạn |

---

### 4. `addresses` — Địa chỉ giao hàng

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID địa chỉ |
| `user_id` | FK → users | Chủ địa chỉ |
| `recipient_name` | VARCHAR(100) | Tên người nhận |
| `recipient_phone` | VARCHAR(15) | SĐT người nhận |
| `province/district/ward` | VARCHAR | Tỉnh / Quận / Phường |
| `street_address` | TEXT | Địa chỉ chi tiết |
| `is_default` | BOOLEAN | Địa chỉ mặc định |
| `address_type` | VARCHAR(20) | Loại: home, office, ... |

---

### 5. `categories` — Danh mục sản phẩm

Hỗ trợ danh mục đa cấp (self-referencing).

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID danh mục |
| `parent_id` | FK → categories | Danh mục cha (null nếu cấp cao nhất) |
| `name` | VARCHAR(100) | Tên danh mục |
| `slug` | VARCHAR(120) UNIQUE | Slug URL |
| `level` | INT | Cấp độ (0 = root) |
| `path` | VARCHAR(500) | Đường dẫn đầy đủ từ root |
| `is_active` | BOOLEAN | Đang hoạt động |
| `is_featured` | BOOLEAN | Hiển thị nổi bật |

---

### 6. `products` — Sản phẩm

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID sản phẩm |
| `category_id` | FK → categories | Danh mục |
| `name` | VARCHAR(255) | Tên sản phẩm |
| `slug` | VARCHAR(300) UNIQUE | Slug URL |
| `sku` | VARCHAR(100) UNIQUE | Mã sản phẩm |
| `base_price` | DECIMAL(12,2) | Giá bán hiện tại |
| `original_price` | DECIMAL(12,2) | Giá gốc (trước giảm) |
| `is_sale` | BOOLEAN | Đang giảm giá |
| `discount_percent` | DECIMAL(5,2) | % giảm giá (0–100) |
| `avg_rating` | DECIMAL(3,2) | Điểm đánh giá trung bình |
| `sold_count` | INT | Số lượng đã bán |
| `view_count` | INT | Lượt xem |
| `status` | product_status | Trạng thái sản phẩm |
| `is_featured` | BOOLEAN | Sản phẩm nổi bật |
| `is_new` | BOOLEAN | Sản phẩm mới |
| `is_bestseller` | BOOLEAN | Bán chạy |

---

### 7. `product_variants` — Biến thể sản phẩm

Mỗi biến thể là một tổ hợp **size + màu sắc** của sản phẩm.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID biến thể |
| `product_id` | FK → products | Sản phẩm |
| `sku` | VARCHAR(100) UNIQUE | Mã biến thể |
| `size` | VARCHAR(20) | Kích thước |
| `color` | VARCHAR(50) | Màu sắc |
| `price` | DECIMAL(12,2) | Giá biến thể |
| `sale_price` | DECIMAL(12,2) | Giá khuyến mãi (< price) |
| `stock_qty` | INT | Tồn kho thực tế |
| `reserved_qty` | INT | Số đang được giữ (chờ thanh toán) |
| `sold_qty` | INT | Đã bán |
| `is_default` | BOOLEAN | Biến thể mặc định |

> **Ràng buộc:** `(product_id, size, color)` là UNIQUE.

---

### 8. `product_images` — Hình ảnh sản phẩm

Là nguồn duy nhất cho hình ảnh (single source of truth). Có thể gắn với sản phẩm hoặc biến thể cụ thể.

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID ảnh |
| `product_id` | FK → products | Sản phẩm |
| `variant_id` | FK → product_variants | Biến thể (nullable) |
| `url` | TEXT | URL ảnh gốc |
| `thumbnail_url` | TEXT | URL ảnh thumbnail |
| `image_type` | VARCHAR(20) | Loại: gallery, cover, ... |
| `is_primary` | BOOLEAN | Ảnh chính |
| `sort_order` | INT | Thứ tự hiển thị |

---

### 9. `vouchers` — Mã giảm giá

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID voucher |
| `code` | VARCHAR(50) UNIQUE | Mã nhập |
| `type` | voucher_type | Loại: percent / fixed / free_ship |
| `value` | DECIMAL(12,2) | Giá trị giảm |
| `min_order_value` | DECIMAL(12,2) | Đơn tối thiểu để áp dụng |
| `max_discount_amount` | DECIMAL(12,2) | Giảm tối đa (cho loại percent) |
| `usage_limit` | INT | Giới hạn tổng lượt dùng |
| `usage_limit_per_user` | INT | Giới hạn mỗi người (mặc định: 1) |
| `used_count` | INT | Số lần đã dùng |
| `min_customer_tier` | user_tier | Hạng thành viên tối thiểu |
| `start_date / end_date` | TIMESTAMP | Thời gian hiệu lực |

---

### 10. `orders` — Đơn hàng

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID đơn hàng |
| `order_code` | VARCHAR(20) UNIQUE | Mã đơn hàng hiển thị |
| `user_id` | FK → users | Khách hàng |
| `voucher_id` | FK → vouchers | Voucher áp dụng |
| `status` | order_status | Trạng thái đơn |
| `subtotal` | DECIMAL | Tổng trước giảm |
| `discount_amount` | DECIMAL | Tiền được giảm |
| `shipping_fee` | DECIMAL | Phí vận chuyển |
| `total` | DECIMAL | Tổng thanh toán |
| `points_earned/used` | INT | Điểm tích lũy / sử dụng |
| `shipping_*` | VARCHAR/TEXT | Thông tin giao hàng (snapshot) |
| `confirmed_at ... cancelled_at` | TIMESTAMP | Mốc thời gian từng trạng thái |

---

### 11. `order_items` — Chi tiết đơn hàng

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID dòng sản phẩm |
| `order_id` | FK → orders | Đơn hàng |
| `variant_id` | FK → product_variants | Biến thể đặt mua |
| `product_name / sku / size / color` | VARCHAR | Snapshot tại thời điểm đặt |
| `unit_price` | DECIMAL | Đơn giá |
| `quantity` | INT | Số lượng |
| `line_total` | DECIMAL | Thành tiền |

---

### 12. `payments` — Thanh toán

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID thanh toán |
| `order_id` | FK → orders | Đơn hàng |
| `method` | payment_method | Phương thức |
| `status` | payment_status | Trạng thái |
| `amount` | DECIMAL | Số tiền |
| `transaction_id` | VARCHAR UNIQUE | Mã giao dịch từ cổng |
| `gateway_response` | JSONB | Response thô từ cổng thanh toán |
| `refund_amount` | DECIMAL | Số tiền hoàn |

---

### 13. `shipments` — Vận chuyển

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID vận đơn |
| `order_id` | FK → orders | Đơn hàng |
| `carrier` | VARCHAR(50) | Đơn vị vận chuyển |
| `tracking_code` | VARCHAR UNIQUE | Mã vận đơn |
| `status` | shipment_status | Trạng thái vận chuyển |
| `shipping_address` | JSONB | Địa chỉ giao hàng |
| `estimated_delivery_date` | DATE | Ngày giao dự kiến |

---

### 14. `reviews` — Đánh giá sản phẩm

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID đánh giá |
| `user_id` | FK → users | Người đánh giá |
| `product_id` | FK → products | Sản phẩm |
| `order_item_id` | FK → order_items | Đơn hàng liên quan |
| `rating` | SMALLINT (1–5) | Số sao |
| `content` | TEXT | Nội dung đánh giá |
| `is_verified_purchase` | BOOLEAN | Đã mua hàng thật |
| `is_approved` | BOOLEAN | Đã được duyệt |
| `admin_reply` | TEXT | Phản hồi từ admin |

> **Ràng buộc:** Mỗi `(user_id, order_item_id)` chỉ được đánh giá 1 lần.

---

### 15. `carts` — Giỏ hàng

Hỗ trợ cả khách vãng lai (dùng `session_id`) và người dùng đã đăng nhập (`user_id`).

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | VARCHAR(50) PK | ID giỏ hàng |
| `user_id` | FK → users | Người dùng (nullable) |
| `session_id` | VARCHAR(100) UNIQUE | Session khách vãng lai |
| `expires_at` | TIMESTAMP | Thời hạn (cho giỏ ẩn danh) |

> **Ràng buộc:** `user_id` hoặc `session_id` phải có ít nhất một.

---

### 16. `cart_items` — Sản phẩm trong giỏ

| Cột | Kiểu | Mô tả |
|---|---|---|
| `cart_id` | FK → carts | Giỏ hàng |
| `variant_id` | FK → product_variants | Biến thể |
| `quantity` | INT | Số lượng |
| `added_price` | DECIMAL | Giá tại thời điểm thêm vào |

---

### 17. `return_requests` — Yêu cầu trả hàng

| Cột | Kiểu | Mô tả |
|---|---|---|
| `order_id` | FK → orders | Đơn hàng cần trả |
| `return_items` | JSONB | Danh sách sản phẩm trả |
| `reason_category` | VARCHAR | Nhóm lý do |
| `reason_detail` | TEXT | Lý do chi tiết |
| `status` | return_status | Trạng thái xử lý |
| `refund_amount` | DECIMAL | Số tiền hoàn |
| `refund_method` | payment_method | Phương thức hoàn tiền |

---

### 18. `voucher_usage` — Lịch sử dùng voucher

| Cột | Kiểu | Mô tả |
|---|---|---|
| `voucher_id` | FK → vouchers | Voucher |
| `user_id` | FK → users | Người dùng |
| `order_id` | FK → orders | Đơn hàng |
| `discount_amount` | DECIMAL | Số tiền thực tế được giảm |

> **Ràng buộc:** `(voucher_id, order_id)` là UNIQUE — mỗi đơn chỉ dùng 1 voucher 1 lần.

---

## Triggers tự động

| Trigger | Mô tả |
|---|---|
| `update_*_updated_at` | Tự động cập nhật `updated_at` khi có thay đổi |
| `trigger_update_product_rating` | Tự tính lại `avg_rating` và `review_count` khi có review mới/thay đổi/xóa |
| `trigger_check_stock` | Kiểm tra tồn kho trước khi tạo `order_items`, báo lỗi nếu không đủ |

# 📚 Tài Liệu Database - Fashion Store

## 📋 Mục Lục

1. [Tổng Quan](#-tổng-quan)
2. [Kiến Trúc Database](#-kiến-trúc-database)
3. [Custom Types (ENUMS)](#-custom-types-enums)
4. [Cấu Trúc Bảng](#-cấu-trúc-bảng)
5. [Relationships (Quan Hệ)](#-relationships-quan-hệ)
6. [Triggers & Functions](#-triggers--functions)
7. [Views](#-views)
8. [Indexes](#-indexes)
9. [Hướng Dẫn Setup](#-hướng-dẫn-setup)
10. [Best Practices](#-best-practices)

---

## 🎯 Tổng Quan

### Thông Tin Cơ Bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Database Name** | Fashion Store Database |
| **DBMS** | PostgreSQL |
| **Version** | 1.0 |
| **Created Date** | 2026-02-13 |
| **Total Tables** | 19 bảng chính |
| **Total Views** | 3 views |
| **Total Functions** | 7 functions |
| **Total Triggers** | 25+ triggers |

### Mục Đích

Database này được thiết kế để phục vụ cho một hệ thống thương mại điện tử bán quần áo (Fashion E-commerce), bao gồm đầy đủ các chức năng:

- ✅ Quản lý người dùng và xác thực (Multi-method authentication)
- ✅ Quản lý sản phẩm và biến thể (Product catalog với variants)
- ✅ Quản lý đơn hàng và thanh toán
- ✅ Quản lý giỏ hàng
- ✅ Quản lý vận chuyển
- ✅ Hệ thống đánh giá sản phẩm
- ✅ Quản lý voucher và khuyến mãi
- ✅ Hệ thống trả hàng/hoàn tiền
- ✅ Loyalty program (điểm thưởng)

---

## 🏗️ Kiến Trúc Database

### Kiến Trúc Tách Biệt: Users + Accounts

Database sử dụng kiến trúc **tách biệt** giữa thông tin người dùng và xác thực:

```
┌─────────────────────┐
│      USERS          │  ← Profile & Business Data
│  - ID               │
│  - Full Name        │
│  - Email/Phone      │
│  - Role, Tier       │
│  - Loyalty Points   │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│     ACCOUNTS        │  ← Authentication Data
│  - User ID (FK)     │
│  - Account Type     │
│  - Password Hash    │
│  - OAuth Data       │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│     SESSIONS        │  ← Active Sessions
│  - Session Token    │
│  - Refresh Token    │
│  - Device Info      │
└─────────────────────┘
```

**Lợi ích của kiến trúc này:**

1. **Separation of Concerns**: Tách biệt dữ liệu nghiệp vụ và xác thực
2. **Multi-auth Support**: Hỗ trợ nhiều phương thức đăng nhập (email, phone, OAuth)
3. **Security**: Dữ liệu nhạy cảm (password) tách biệt khỏi profile
4. **Flexibility**: Một user có thể có nhiều account (VD: cả email lẫn OAuth)

---

## 🎯 Custom Types (ENUMS)

### 1. user_role
Vai trò người dùng trong hệ thống

| Value | Mô tả | Quyền hạn |
|-------|-------|-----------|
| `customer` | Khách hàng | Mua hàng, đánh giá sản phẩm |
| `staff` | Nhân viên | Xử lý đơn hàng, hỗ trợ KH |
| `admin` | Quản trị viên | Quản lý sản phẩm, đơn hàng |
| `super_admin` | Quản trị viên cấp cao | Full quyền hệ thống |

### 2. user_tier
Hạng khách hàng (Loyalty tier)

| Value | Mô tả | Điều kiện |
|-------|-------|-----------|
| `normal` | Khách hàng thường | Mặc định |
| `silver` | Hạng bạc | Tổng chi tiêu > X |
| `gold` | Hạng vàng | Tổng chi tiêu > Y |
| `platinum` | Hạng bạch kim | Tổng chi tiêu > Z |
| `vip` | VIP | Khách hàng đặc biệt |

### 3. account_type
Phương thức xác thực

| Value | Mô tả |
|-------|-------|
| `email` | Đăng ký bằng email + password |
| `phone` | Đăng ký bằng số điện thoại + password |
| `oauth` | Đăng nhập qua OAuth (Google, Facebook...) |

### 4. oauth_provider_enum
Các nhà cung cấp OAuth

| Value | Mô tả |
|-------|-------|
| `google` | Google OAuth |
| `facebook` | Facebook Login |
| `apple` | Sign in with Apple |
| `twitter` | Twitter OAuth |

### 5. product_status
Trạng thái sản phẩm

| Value | Mô tả |
|-------|-------|
| `draft` | Nháp, chưa công khai |
| `active` | Đang hoạt động, hiển thị |
| `archived` | Đã lưu trữ |
| `out_of_stock` | Hết hàng |

### 6. order_status
Trạng thái đơn hàng

| Value | Mô tả |
|-------|-------|
| `pending` | Chờ xác nhận |
| `confirmed` | Đã xác nhận |
| `packing` | Đang đóng gói |
| `shipped` | Đã giao cho vận chuyển |
| `delivered` | Đã giao hàng |
| `completed` | Hoàn thành |
| `cancelled` | Đã hủy |
| `refunded` | Đã hoàn tiền |

### 7. payment_method
Phương thức thanh toán

| Value | Mô tả |
|-------|-------|
| `cod` | Thanh toán khi nhận hàng |
| `vnpay` | VNPay |
| `momo` | MoMo |
| `zalopay` | ZaloPay |
| `bank_transfer` | Chuyển khoản ngân hàng |
| `credit_card` | Thẻ tín dụng |
| `debit_card` | Thẻ ghi nợ |

### 8. payment_status
Trạng thái thanh toán

| Value | Mô tả |
|-------|-------|
| `pending` | Chờ thanh toán |
| `paid` | Đã thanh toán |
| `failed` | Thanh toán thất bại |
| `refunded` | Đã hoàn tiền |
| `partially_refunded` | Hoàn tiền một phần |

### 9. shipment_status
Trạng thái vận chuyển

| Value | Mô tả |
|-------|-------|
| `preparing` | Đang chuẩn bị |
| `picked_up` | Đã lấy hàng |
| `in_transit` | Đang vận chuyển |
| `out_for_delivery` | Đang giao hàng |
| `delivered` | Đã giao |
| `returned` | Đã trả lại |
| `failed` | Giao hàng thất bại |

### 10. voucher_type
Loại voucher

| Value | Mô tả |
|-------|-------|
| `percent` | Giảm theo % |
| `fixed` | Giảm số tiền cố định |
| `free_ship` | Miễn phí vận chuyển |

### 11. return_status
Trạng thái yêu cầu trả hàng

| Value | Mô tả |
|-------|-------|
| `pending` | Chờ xử lý |
| `approved` | Đã chấp nhận |
| `rejected` | Đã từ chối |
| `processing` | Đang xử lý |
| `refunded` | Đã hoàn tiền |
| `completed` | Hoàn tất |

---

## 📊 Cấu Trúc Bảng

### Nhóm 1: Authentication & User Management

#### 1. `users` - Thông Tin Người Dùng

**Mục đích**: Lưu trữ thông tin profile và dữ liệu nghiệp vụ của người dùng

**Các trường chính:**

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | VARCHAR(50) | PRIMARY KEY | ID người dùng |
| `full_name` | VARCHAR(100) | | Họ và tên |
| `avatar_url` | TEXT | | URL avatar |
| `date_of_birth` | DATE | | Ngày sinh |
| `gender` | VARCHAR(10) | | Giới tính |
| `email` | VARCHAR(150) | | Email liên hệ |
| `phone` | VARCHAR(15) | | Số điện thoại |
| `role` | user_role | NOT NULL, DEFAULT 'customer' | Vai trò |
| `tier` | user_tier | NOT NULL, DEFAULT 'normal' | Hạng khách hàng |
| `loyalty_points` | INT | DEFAULT 0, >= 0 | Điểm tích lũy |
| `total_spent` | DECIMAL(15,2) | DEFAULT 0, >= 0 | Tổng chi tiêu |
| `total_orders` | INT | DEFAULT 0, >= 0 | Tổng số đơn hàng |
| `is_active` | BOOLEAN | DEFAULT TRUE | Tài khoản còn hoạt động? |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Đã xác thực? |
| `is_blocked` | BOOLEAN | DEFAULT FALSE | Bị chặn? |

**Business Logic:**
- Constraint: Phải có ít nhất email HOẶC phone
- `loyalty_points`: Tích lũy từ mua hàng
- `tier`: Tự động nâng cấp dựa trên `total_spent`

#### 2. `accounts` - Thông Tin Xác Thực

**Mục đích**: Quản lý credentials và phương thức đăng nhập

**Các trường chính:**

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | VARCHAR(50) | PRIMARY KEY | ID account |
| `user_id` | VARCHAR(50) | FK → users | Người dùng sở hữu |
| `account_type` | account_type | NOT NULL | Loại tài khoản |
| `identifier` | VARCHAR(255) | NOT NULL | Email/phone/OAuth ID |
| `password_hash` | VARCHAR(255) | | Password đã hash |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Đã xác thực? |
| `verification_token` | VARCHAR(255) | | Token xác thực email |
| `verification_token_expires_at` | TIMESTAMP | | Hết hạn token |
| `reset_token` | VARCHAR(255) | | Token reset password |
| `oauth_provider` | oauth_provider_enum | | Nhà cung cấp OAuth |
| `oauth_provider_user_id` | VARCHAR(255) | | User ID từ OAuth |
| `failed_login_attempts` | INT | DEFAULT 0 | Số lần đăng nhập sai |
| `locked_until` | TIMESTAMP | | Khóa tài khoản đến |
| `last_login_at` | TIMESTAMP | | Lần đăng nhập cuối |

**Business Logic:**
- Unique constraint: (account_type, identifier)
- OAuth account PHẢI có `oauth_provider` và `oauth_provider_user_id`
- Non-OAuth account PHẢI có `password_hash`
- Security: Lock account sau N lần đăng nhập sai

#### 3. `sessions` - Quản Lý Phiên

**Mục đ ích**: Lưu trữ và quản lý các phiên đăng nhập

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| `id` | VARCHAR(50) | PRIMARY KEY | ID session |
| `user_id` | VARCHAR(50) | FK → users | User đang đăng nhập |
| `account_id` | VARCHAR(50) | FK → accounts | Account được dùng |
| `session_token` | VARCHAR(500) | UNIQUE, NOT NULL | JWT access token |
| `refresh_token` | VARCHAR(500) | UNIQUE | Refresh token |
| `device_type` | VARCHAR(50) | | mobile/tablet/desktop |
| `ip_address` | VARCHAR(45) | | IP đăng nhập |
| `user_agent` | TEXT | | Thông tin trình duyệt |
| `is_active` | BOOLEAN | DEFAULT TRUE | Session còn hoạt động? |
| `expires_at` | TIMESTAMP | NOT NULL | Thời gian hết hạn |

#### 4. `addresses` - Địa Chỉ Giao Hàng

**Mục đích**: Lưu địa chỉ giao hàng của khách hàng

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID địa chỉ |
| `user_id` | VARCHAR(50) | FK → users |
| `recipient_name` | VARCHAR(100) | Tên người nhận |
| `recipient_phone` | VARCHAR(15) | SĐT người nhận |
| `province` | VARCHAR(100) | Tỉnh/Thành phố |
| `district` | VARCHAR(100) | Quận/Huyện |
| `ward` | VARCHAR(100) | Phường/Xã |
| `street_address` | TEXT | Số nhà, tên đường |
| `address_type` | VARCHAR(20) | home/office/other |
| `is_default` | BOOLEAN | Địa chỉ mặc định? |

**Business Logic:**
- Trigger đảm bảo mỗi user chỉ có 1 địa chỉ default

---

### Nhóm 2: Product Management

#### 5. `categories` - Danh Mục Sản Phẩm

**Mục đích**: Quản lý danh mục phân cấp

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID danh mục |
| `parent_id` | VARCHAR(50) | FK → categories (Self-reference) |
| `name` | VARCHAR(100) | Tên danh mục |
| `slug` | VARCHAR(120) | URL-friendly slug |
| `level` | INT | Cấp độ (0=root, 1=child...) |
| `path` | VARCHAR(500) | Materialized path (VD: "1/5/12") |
| `sort_order` | INT | Thứ tự hiển thị |
| `is_active` | BOOLEAN | Đang hoạt động? |

**Ví dụ Hierarchical Structure:**
```
Thời Trang Nam (id=1, level=0, path="1")
├── Áo Nam (id=5, level=1, path="1/5")
│   ├── Áo Thun (id=12, level=2, path="1/5/12")
│   └── Áo Sơ Mi (id=13, level=2, path="1/5/13")
└── Quần Nam (id=6, level=1, path="1/6")
```

#### 6. `products` - Sản Phẩm

**Mục đích**: Lưu thông tin cơ bản của sản phẩm

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID sản phẩm |
| `category_id` | VARCHAR(50) | FK → categories |
| `name` | VARCHAR(255) | Tên sản phẩm |
| `slug` | VARCHAR(300) | URL slug |
| `sku` | VARCHAR(100) | Mã SKU |
| `brand` | VARCHAR(100) | Thương hiệu |
| `base_price` | DECIMAL(12,2) | Giá cơ bản |
| `description` | TEXT | Mô tả chi tiết |
| `status` | product_status | Trạng thái |
| `view_count` | INT | Số lượt xem |
| `sold_count` | INT | Số lượng đã bán |
| `avg_rating` | DECIMAL(3,2) | Điểm đánh giá TB |
| `review_count` | INT | Số đánh giá |
| `is_featured` | BOOLEAN | Sản phẩm nổi bật? |
| `published_at` | TIMESTAMP | Ngày xuất bản |

**Business Logic:**
- `avg_rating` tự động tính từ bảng `reviews` (trigger)
- `sold_count` tự động cập nhật khi đơn hàng completed

#### 7. `product_variants` - Biến Thể Sản Phẩm

**Mục đích**: Quản lý các biến thể (size, màu) của sản phẩm

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID variant |
| `product_id` | VARCHAR(50) | FK → products |
| `sku` | VARCHAR(100) | SKU riêng của variant |
| `size` | VARCHAR(20) | Size (S, M, L, XL...) |
| `color` | VARCHAR(50) | Màu sắc |
| `price` | DECIMAL(12,2) | Giá bán |
| `sale_price` | DECIMAL(12,2) | Giá khuyến mãi |
| `stock_qty` | INT | Số lượng tồn kho |
| `reserved_qty` | INT | Số lượng đang giữ (trong đơn hàng) |
| `sold_qty` | INT | Số lượng đã bán |
| `is_active` | BOOLEAN | Còn bán? |
| `is_default` | BOOLEAN | Variant mặc định? |

**Ví dụ:**
```
Sản phẩm: Áo Thun Nam Basic
├── Variant 1: Size M, Màu Đen, Giá 199k
├── Variant 2: Size M, Màu Trắng, Giá 199k
├── Variant 3: Size L, Màu Đen, Giá 209k
└── Variant 4: Size L, Màu Trắng, Giá 209k
```

**Business Logic:**
- Unique constraint: (product_id, size, color)
- `stock_qty`: Số lượng thực tế có sẵn
- `reserved_qty`: Số lượng đang trong  giỏ hàng/đơn hàng chưa hoàn thành
- Available stock = `stock_qty - reserved_qty`

#### 8. `product_images` - Hình Ảnh Sản Phẩm

**Mục đích**: Lưu trữ hình ảnh của sản phẩm và variants

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID hình ảnh |
| `product_id` | VARCHAR(50) | FK → products |
| `variant_id` | VARCHAR(50) | FK → product_variants (optional) |
| `url` | TEXT | URL hình ảnh |
| `image_type` | VARCHAR(20) | gallery/thumbnail/detail |
| `is_primary` | BOOLEAN | Hình đại diện? |
| `sort_order` | INT | Thứ tự hiển thị |

---

### Nhóm 3: Shopping & Orders

#### 9. `carts` - Giỏ Hàng

**Mục đích**: Quản lý giỏ hàng của khách

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID giỏ hàng |
| `user_id` | VARCHAR(50) | FK → users (null nếu guest) |
| `session_id` | VARCHAR(100) | Session ID cho guest |
| `expires_at` | TIMESTAMP | Hết hạn |

**Business Logic:**
- Constraint: Phải có `user_id` HOẶC `session_id`
- Guest cart sử dụng `session_id`
- Khi guest đăng nhập → merge cart vào user cart

#### 10. `cart_items` - Sản Phẩm Trong Giỏ

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID cart item |
| `cart_id` | VARCHAR(50) | FK → carts |
| `variant_id` | VARCHAR(50) | FK → product_variants |
| `quantity` | INT | Số lượng |
| `added_price` | DECIMAL(12,2) | Giá lúc thêm vào |

**Business Logic:**
- Unique: (cart_id, variant_id) - không trùng variant trong 1 giỏ
- `added_price`: Snapshot giá để phát hiện thay đổi

#### 11. `orders` - Đơn Hàng

**Mục đích**: Quản lý đơn hàng

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID đơn hàng |
| `order_code` | VARCHAR(20) | Mã đơn hàng (unique) |
| `user_id` | VARCHAR(50) | FK → users |
| `voucher_id` | VARCHAR(50) | FK → vouchers |
| `status` | order_status | Trạng thái |
| `subtotal` | DECIMAL(12,2) | Tổng tiền hàng |
| `discount_amount` | DECIMAL(12,2) | Số tiền giảm giá |
| `shipping_fee` | DECIMAL(12,2) | Phí vận chuyển |
| `tax_amount` | DECIMAL(12,2) | Thuế |
| `total` | DECIMAL(12,2) | Tổng cộng |
| `points_earned` | INT | Điểm tích lũy được |
| `points_used` | INT | Điểm đã dùng |
| `shipping_*` | Various | Thông tin địa chỉ giao hàng |
| `*_at` | TIMESTAMP | Timestamps các trạng thái |

**Business Logic:**
- Tự động reserve stock khi tạo đơn (trigger)
- Cập nhật stock khi order completed (trigger)
- Tính điểm thưởng và cập nhật user tier

#### 12. `order_items` - Chi Tiết Đơn Hàng

**Mục đích**: Lưu các sản phẩm trong đơn hàng

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID order item |
| `order_id` | VARCHAR(50) | FK → orders |
| `variant_id` | VARCHAR(50) | FK → product_variants |
| `product_name` | VARCHAR(255) | Snapshot: Tên sản phẩm |
| `sku` | VARCHAR(100) | Snapshot: SKU |
| `size` | VARCHAR(20) | Snapshot: Size |
| `color` | VARCHAR(50) | Snapshot: Màu |
| `unit_price` | DECIMAL(12,2) | Giá tại thời điểm mua |
| `quantity` | INT | Số lượng |
| `line_total` | DECIMAL(12,2) | Thành tiền |

**Tại sao cần Snapshot?**
- Giá và thông tin sản phẩm có thể thay đổi
- Cần lưu lại chính xác thông tin tại thời điểm mua

---

### Nhóm 4: Payment & Shipping

#### 13. `payments` - Thanh Toán

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID payment |
| `order_id` | VARCHAR(50) | FK → orders |
| `method` | payment_method | Phương thức |
| `status` | payment_status | Trạng thái |
| `amount` | DECIMAL(12,2) | Số tiền |
| `transaction_id` | VARCHAR(255) | Mã GD từ payment gateway |
| `gateway_response` | JSONB | Response từ gateway |
| `refund_amount` | DECIMAL(12,2) | Số tiền đã hoàn |
| `paid_at` | TIMESTAMP | Thời gian thanh toán |

#### 14. `shipments` - Vận Chuyển

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID shipment |
| `order_id` | VARCHAR(50) | FK → orders |
| `carrier` | VARCHAR(50) | Đơn vị vận chuyển |
| `tracking_code` | VARCHAR(100) | Mã vận đơn |
| `status` | shipment_status | Trạng thái |
| `estimated_delivery_date` | DATE | Dự kiến giao |
| `actual_delivery_date` | DATE | Thực tế giao |
| `cod_amount` | DECIMAL(12,2) | Tiền COD |
| `*_at` | TIMESTAMP | Timestamps các sự kiện |

---

### Nhóm 5: Promotions & Reviews

#### 15. `vouchers` - Mã Giảm Giá

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID voucher |
| `code` | VARCHAR(50) | Mã voucher (unique) |
| `type` | voucher_type | Loại giảm giá |
| `value` | DECIMAL(12,2) | Giá trị giảm |
| `min_order_value` | DECIMAL(12,2) | Giá trị đơn tối thiểu |
| `max_discount_amount` | DECIMAL(12,2) | Giảm tối đa |
| `usage_limit` | INT | Giới hạn số lần dùng |
| `usage_limit_per_user` | INT | Giới hạn mỗi user |
| `used_count` | INT | Đã dùng bao nhiêu lần |
| `min_customer_tier` | user_tier | Hạng KH tối thiểu |
| `start_date` | TIMESTAMP | Bắt đầu |
| `end_date` | TIMESTAMP | Kết thúc |

**Ví dụ:**
```sql
-- Voucher giảm 10%
type = 'percent', value = 10

-- Voucher giảm 50k
type = 'fixed', value = 50000

-- Free ship
type = 'free_ship', value = 0
```

#### 16. `voucher_usage` - Lịch Sử Dùng Voucher

| Column | Type | Mô tả |
|--------|------|-------|
| `voucher_id` | VARCHAR(50) | FK → vouchers |
| `user_id` | VARCHAR(50) | FK → users |
| `order_id` | VARCHAR(50) | FK → orders |
| `discount_amount` | DECIMAL(12,2) | Số tiền đã giảm |
| `used_at` | TIMESTAMP | Thời gian dùng |

#### 17. `reviews` - Đánh Giá Sản Phẩm

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID review |
| `user_id` | VARCHAR(50) | FK → users |
| `product_id` | VARCHAR(50) | FK → products |
| `order_item_id` | VARCHAR(50) | FK → order_items |
| `rating` | SMALLINT | Điểm (1-5) |
| `title` | VARCHAR(200) | Tiêu đề |
| `content` | TEXT | Nội dung |
| `images` | JSONB | Hình ảnh đính kèm |
| `is_verified_purchase` | BOOLEAN | Mua hàng xác thực? |
| `is_approved` | BOOLEAN | Đã duyệt? |
| `helpful_count` | INT | Số người thấy hữu ích |
| `admin_reply` | TEXT | Phản hồi từ admin |

**Business Logic:**
- Unique: (user_id, order_item_id) - mỗi order item chỉ review 1 lần
- Trigger tự động cập nhật `avg_rating` và `review_count` của product

#### 18. `return_requests` - Yêu Cầu Trả Hàng

| Column | Type | Mô tả |
|--------|------|-------|
| `id` | VARCHAR(50) | ID request |
| `order_id` | VARCHAR(50) | FK → orders |
| `user_id` | VARCHAR(50) | FK → users |
| `return_items` | JSONB | Danh sách sản phẩm trả |
| `reason_category` | VARCHAR(50) | Loại lý do |
| `reason_detail` | TEXT | Chi tiết lý do |
| `images` | JSONB | Hình ảnh chứng minh |
| `status` | return_status | Trạng thái |
| `refund_amount` | DECIMAL(12,2) | Số tiền hoàn |
| `admin_note` | TEXT | Ghi chú từ admin |

---

## 🔗 Relationships (Quan Hệ)

### Entity Relationship Diagram (ERD) Simplified

```
users (1) ←→ (N) accounts
users (1) ←→ (N) sessions
users (1) ←→ (N) addresses
users (1) ←→ (N) orders
users (1) ←→ (N) reviews
users (1) ←→ (1) carts

categories (1) ←→ (N) products
categories (1) ←→ (N) categories (self-reference - hierarchical)

products (1) ←→ (N) product_variants
products (1) ←→ (N) product_images
products (1) ←→ (N) reviews

orders (1) ←→ (N) order_items
orders (1) ←→ (1) payments
orders (1) ←→ (1) shipments
orders (1) ←→ (N) return_requests

product_variants (1) ←→ (N) cart_items
product_variants (1) ←→ (N) order_items

vouchers (1) ←→ (N) orders
vouchers (1) ←→ (N) voucher_usage

carts (1) ←→ (N) cart_items
```

### Các Quan Hệ Chính

#### 1. User Authentication Flow
```
User → Accounts (1:N) → Sessions (1:N)
```
Một user có thể có nhiều accounts (email + OAuth), mỗi account có nhiều sessions.

#### 2. Product Hierarchy
```
Category → Products (1:N) → Variants (1:N) → Images (1:N)
```

#### 3. Order Lifecycle
```
User → Cart → Order → Order Items
                  ↓
            [Payment, Shipment, Reviews, Returns]
```

---

## ⚙️ Triggers & Functions

### 1. `update_updated_at_column()`
**Mục đích**: Tự động cập nhật trường `updated_at` khi có thay đổi

**Áp dụng cho**: Tất cả bảng có cột `updated_at`

```sql
BEFORE UPDATE ON [table]
→ SET updated_at = CURRENT_TIMESTAMP
```

### 2. `update_product_rating()`
**Mục đích**: Cap nhật `avg_rating` và `review_count` của sản phẩm

**Trigger**: Sau khi INSERT/UPDATE/DELETE trên bảng `reviews`

**Logic:**
```sql
UPDATE products
SET 
  avg_rating = AVG(rating) FROM approved reviews
  review_count = COUNT(*) FROM approved reviews
WHERE product_id = [current_product]
```

### 3. `check_stock_availability()`
**Mục đích**: Kiểm tra tồn kho trước khi tạo order_item

**Trigger**: BEFORE INSERT ON `order_items`

**Logic:**
```sql
available_stock = stock_qty - reserved_qty
IF available_stock < requested_quantity THEN
  RAISE EXCEPTION 'Insufficient stock'
END IF
```

### 4. `reserve_stock()`
**Mục đích**: Giữ hàng khi tạo đơn

**Trigger**: AFTER INSERT ON `orders`

**Logic:**
```sql
UPDATE product_variants
SET reserved_qty = reserved_qty + order_item.quantity
FOR each order_item in new_order
```

### 5. `update_stock_on_status_change()`
**Mục đích**: Cập nhật stock khi trạng thái đơn hàng thay đổi

**Trigger**: AFTER UPDATE ON `orders` (khi status thay đổi)

**Logic:**

**Khi order COMPLETED:**
```sql
-- Chuyển reserved → sold, giảm stock
reserved_qty -= quantity
sold_qty += quantity
stock_qty -= quantity

-- Cập nhật sold_count của product
product.sold_count += total_quantity

-- Thưởng điểm cho user
user.loyalty_points += order.points_earned
user.total_spent += order.total
user.total_orders += 1
```

**Khi order CANCELLED:**
```sql
-- Trả lại stock
reserved_qty -= quantity
```

### 6. `increment_voucher_usage()`
**Mục đích**: Tăng số lần dùng voucher

**Trigger**: AFTER INSERT ON `orders` (khi có voucher_id)

**Logic:**
```sql
UPDATE vouchers
SET used_count = used_count + 1

INSERT INTO voucher_usage (...)
```

### 7. `ensure_one_default_address()`
**Mục đích**: Đảm bảo mỗi user chỉ có 1 địa chỉ default

**Trigger**: BEFORE INSERT/UPDATE ON `addresses` (khi is_default = TRUE)

**Logic:**
```sql
IF new.is_default = TRUE THEN
  UPDATE addresses
  SET is_default = FALSE
  WHERE user_id = new.user_id AND id != new.id
END IF
```

---

## 👁️ Views

### 1. `v_users_with_accounts`
**Mục đích**: Lấy thông tin user kèm tất cả accounts

```sql
SELECT 
  users.*,
  json_agg(accounts info) as accounts
FROM users
LEFT JOIN accounts
GROUP BY users.id
```

**Use case**: Dashboard admin, hiển thị user có bao nhiêu phương thức đăng nhập

### 2. `v_product_catalog`
**Mục đích**: View catalog sản phẩm với thông tin đầy đủ

```sql
SELECT 
  products.*,
  category info,
  primary_image,
  variant_count,
  min_price,
  max_price,
  total_stock
FROM products
WHERE status = 'active'
```

**Use case**: Trang danh sách sản phẩm, API  product listing

### 3. `v_order_summary`
**Mục đích**: Tổng hợp thông tin đơn hàng

```sql
SELECT 
  orders.*,
  customer info,
  payment info,
  shipment info,
  item_count,
  total_quantity
FROM orders
JOIN users, payments, shipments
```

**Use case**: Dashboard quản lý đơn hàng, tracking page

---

## 🔍 Indexes

### Strategy: Index cho Performance

#### 1. Primary Keys
- Tất cả bảng đều có PK index (tự động)

#### 2. Foreign Keys
```sql
-- User relationships
idx_accounts_user_id
idx_sessions_user_id
idx_addresses_user_id
idx_orders_user_id

-- Product relationships
idx_products_category_id
idx_variants_product_id
idx_images_product_id
```

#### 3. Unique Constraints
```sql
-- Unique indexes
idx_users_email (WHERE email IS NOT NULL)
idx_users_phone (WHERE phone IS NOT NULL)
idx_products_slug
idx_vouchers_code
idx_orders_order_code
```

#### 4. Search & Filter
```sql
-- Products
idx_products_status
idx_products_brand
idx_products_is_featured
idx_products_avg_rating DESC
idx_products_sold_count DESC
idx_products_published_at DESC

-- Orders
idx_orders_status
idx_orders_created_at DESC
idx_orders_total DESC

-- Reviews
idx_reviews_rating
idx_reviews_created_at DESC
idx_reviews_is_approved
```

#### 5. Session & Token
```sql
idx_sessions_session_token
idx_sessions_refresh_token
idx_sessions_expires_at
idx_accounts_verification_token
idx_accounts_reset_token
```

### Composite Indexes

```sql
-- Cart
idx_carts_user_id WHERE user_id IS NOT NULL
idx_carts_session_id WHERE session_id IS NOT NULL

-- Addresses
idx_addresses_is_default (user_id, is_default)

-- Variants
idx_variants_is_default (product_id, is_default)

-- Images
idx_images_is_primary (product_id, is_primary)
```

---

## 🚀 Hướng Dẫn Setup

### Bước 1: Chuẩn Bị

**Requirements:**
- PostgreSQL 12+
- Database client (psql, pgAdmin, DBeaver...)

### Bước 2: Tạo Database

```sql
CREATE DATABASE fashion_store;
\c fashion_store
```

### Bước 3: Chạy Script

```bash
psql -U postgres -d fashion_store -f script.sql
```

Hoặc trong psql:
```sql
\i /path/to/script.sql
```

### Bước 4: Verify

```sql
-- Check tables
\dt

-- Check views
\dv

-- Check functions
\df

-- Check triggers
SELECT tgname FROM pg_trigger;
```

### Bước 5: Test Sample Data

Script đã include sample data:
- 5 users mẫu
- 5 accounts tương ứng

Verify:
```sql
SELECT * FROM v_users_with_accounts;
```

---

## ✅ Best Practices

### 1. ID Generation
```javascript
// Sử dụng custom ID generator
const userId = generateId('usr'); // usr001, usr002...
const orderId = generateId('ord'); // ord001, ord002...
```

### 2. Password Hashing
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 10);
```

### 3. Transaction cho Orders
```sql
BEGIN;
  -- Insert order
  -- Insert order_items
  -- Update stock (via trigger)
  -- Insert payment
COMMIT;
```

### 4. Handling Stock
```javascript
// Always check available stock
const available = stock_qty - reserved_qty;
if (available < requested_qty) {
  throw new Error('Out of stock');
}
```

### 5. Session Management
```javascript
// Expire old sessions
DELETE FROM sessions 
WHERE expires_at < NOW() 
OR last_activity_at < NOW() - INTERVAL '30 days';
```

### 6. Soft Delete (Optional)
Có thể thêm `deleted_at` timestamp cho các bảng quan trọng thay vì DELETE thật:
```sql
UPDATE users SET deleted_at = NOW() WHERE id = ?;
-- Query: WHERE deleted_at IS NULL
```

### 7. Caching Strategy
Các bảng nên cache:
- `categories` (ít thay đổi)
- `products` (cache product list)
- `vouchers` (active vouchers)

### 8. Query Optimization
```sql  -- BAD: N+1 query
SELECT * FROM orders;
-- Then for each order, query order_items

-- GOOD: JOIN
SELECT o.*, oi.* 
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id;
```

### 9. JSON Fields
```sql
-- Storing images in reviews
INSERT INTO reviews (..., images) VALUES 
(..., '["url1.jpg", "url2.jpg"]'::jsonb);

-- Query JSON
SELECT * FROM reviews 
WHERE images @> '["url1.jpg"]'::jsonb;
```

### 10. Monitoring
```sql
-- Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC;

-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text))
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 📝 Changelog

### Version 1.0 (2026-02-13)
- ✅ Initial database schema
- ✅ 19 tables created
- ✅ All triggers and functions implemented
- ✅ 3 views created
- ✅ Sample data included
- ✅ Full documentation completed

---

## 🤝 Support

Nếu có vấn đề về database, vui lòng kiểm tra:

1. **Errors**: Check PostgreSQL logs
2. **Performance**: Analyze query plans với `EXPLAIN ANALYZE`
3. **Data Integrity**: Verify constraints and triggers
4. **Indexes**: Ensure proper indexes for your queries

---

## 📚 References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQL Style Guide](https://www.sqlstyle.guide/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/tutorial.html)

---

**Last Updated**: 2026-02-13  
**Maintained by**: Development Team  
**Database Version**: 1.0
| `phone` | Xác thực qua số điện thoại |
| `oauth` | Xác thực qua nhà cung cấp OAuth |

### oauth_provider_enum
Các nhà cung cấp OAuth.

| Value | Mô tả |
|-------|-------|
| `google` | Google OAuth |
| `facebook` | Facebook OAuth |
| `apple` | Apple OAuth |
| `twitter` | Twitter OAuth |

### product_status
Trạng thái sản phẩm.

| Value | Mô tả |
|-------|-------|
| `draft` | Nháp, chưa công khai |
| `active` | Đang hoạt động |
| `archived` | Đã lưu trữ |
| `out_of_stock` | Hết hàng |

### order_status
Trạng thái đơn hàng.

| Value | Mô tả |
|-------|-------|
| `pending` | Chờ xác nhận |
| `confirmed` | Đã xác nhận |
| `packing` | Đang đóng gói |
| `shipped` | Đã gửi hàng |
| `delivered` | Đã giao hàng |
| `completed` | Hoàn thành |
| `cancelled` | Đã hủy |
| `refunded` | Đã hoàn tiền |

### payment_method
Phương thức thanh toán.

| Value | Mô tả |
|-------|-------|
| `cod` | Thanh toán khi nhận hàng |
| `vnpay` | VNPay |
| `momo` | MoMo |
| `zalopay` | ZaloPay |
| `bank_transfer` | Chuyển khoản ngân hàng |
| `credit_card` | Thẻ tín dụng |
| `debit_card` | Thẻ ghi nợ |

### payment_status
Trạng thái thanh toán.

| Value | Mô tả |
|-------|-------|
| `pending` | Chờ thanh toán |
| `paid` | Đã thanh toán |
| `failed` | Thanh toán thất bại |
| `refunded` | Đã hoàn tiền |
| `partially_refunded` | Hoàn tiền một phần |

### shipment_status
Trạng thái vận chuyển.

| Value | Mô tả |
|-------|-------|
| `preparing` | Đang chuẩn bị |
| `picked_up` | Đã lấy hàng |
| `in_transit` | Đang vận chuyển |
| `out_for_delivery` | Đang giao hàng |
| `delivered` | Đã giao hàng |
| `returned` | Đã trả lại |
| `failed` | Giao hàng thất bại |

### voucher_type
Loại voucher giảm giá.

| Value | Mô tả |
|-------|-------|
| `percent` | Giảm theo phần trăm |
| `fixed` | Giảm số tiền cố định |
| `free_ship` | Miễn phí vận chuyển |

### return_status
Trạng thái yêu cầu trả hàng.

| Value | Mô tả |
|-------|-------|
| `pending` | Chờ xử lý |
| `approved` | Đã chấp nhận |
| `rejected` | Đã từ chối |
| `processing` | Đang xử lý |
| `refunded` | Đã hoàn tiền |
| `completed` | Hoàn thành |

---

## 📊 Tables

### 1. users
**Mô tả**: Lưu trữ thông tin profile và dữ liệu nghiệp vụ của người dùng (không bao gồm xác thực).

**Indexes**:
- `idx_users_email`: Index trên email (WHERE email IS NOT NULL)
- `idx_users_phone`: Index trên phone (WHERE phone IS NOT NULL)
- `idx_users_role`: Index trên role
- `idx_users_tier`: Index trên tier
- `idx_users_is_active`: Index trên is_active

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất của người dùng |
| **full_name** | VARCHAR(100) | | NULL | Họ và tên đầy đủ |
| **display_name** | VARCHAR(50) | | NULL | Tên hiển thị |
| **avatar_url** | TEXT | | NULL | URL ảnh đại diện |
| **date_of_birth** | DATE | | NULL | Ngày sinh |
| **gender** | VARCHAR(10) | | NULL | Giới tính (male, female, other, prefer_not_to_say) |
| **email** | VARCHAR(150) | | NULL | Địa chỉ email |
| **phone** | VARCHAR(15) | | NULL | Số điện thoại |
| **role** | user_role | NOT NULL | 'customer' | Vai trò trong hệ thống |
| **tier** | user_tier | NOT NULL | 'normal' | Hạng khách hàng |
| **loyalty_points** | INT | CHECK >= 0 | 0 | Điểm thành viên tích lũy |
| **total_spent** | DECIMAL(15,2) | CHECK >= 0 | 0 | Tổng chi tiêu |
| **total_orders** | INT | CHECK >= 0 | 0 | Tổng số đơn hàng |
| **is_active** | BOOLEAN | | TRUE | Tài khoản đang hoạt động |
| **is_verified** | BOOLEAN | | FALSE | Đã xác minh tài khoản |
| **is_blocked** | BOOLEAN | | FALSE | Tài khoản bị khóa |
| **blocked_reason** | TEXT | | NULL | Lý do khóa tài khoản |
| **preferred_language** | VARCHAR(5) | | 'vi' | Ngôn ngữ ưu tiên |
| **timezone** | VARCHAR(50) | | 'Asia/Ho_Chi_Minh' | Múi giờ |
| **last_seen_at** | TIMESTAMP | | NULL | Lần cuối cùng online |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Constraints**:
- Email hoặc phone phải có ít nhất 1 giá trị không NULL

---

### 2. accounts
**Mô tả**: Xử lý tất cả các phương thức xác thực (email/phone/OAuth).

**Indexes**:
- `idx_accounts_user_id`: Index trên user_id
- `idx_accounts_identifier`: Index trên identifier
- `idx_accounts_oauth`: Index trên (oauth_provider, oauth_provider_user_id)
- `idx_accounts_verification_token`: Index trên verification_token
- `idx_accounts_reset_token`: Index trên reset_token

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Tham chiếu đến user |
| **account_type** | account_type | NOT NULL | | Loại tài khoản (email/phone/oauth) |
| **identifier** | VARCHAR(255) | NOT NULL | | Email, phone hoặc OAuth provider user ID |
| **password_hash** | VARCHAR(255) | | NULL | Mật khẩu đã hash (cho email/phone) |
| **password_salt** | VARCHAR(255) | | NULL | Salt để hash mật khẩu |
| **is_verified** | BOOLEAN | | FALSE | Đã xác minh |
| **verification_token** | VARCHAR(255) | | NULL | Token xác minh |
| **verification_token_expires_at** | TIMESTAMP | | NULL | Thời gian hết hạn token xác minh |
| **verified_at** | TIMESTAMP | | NULL | Thời gian xác minh |
| **reset_token** | VARCHAR(255) | | NULL | Token reset mật khẩu |
| **reset_token_expires_at** | TIMESTAMP | | NULL | Thời gian hết hạn reset token |
| **oauth_provider** | oauth_provider_enum | | NULL | Nhà cung cấp OAuth |
| **oauth_provider_user_id** | VARCHAR(255) | | NULL | User ID từ OAuth provider |
| **oauth_access_token** | TEXT | | NULL | OAuth access token |
| **oauth_refresh_token** | TEXT | | NULL | OAuth refresh token |
| **oauth_token_expires_at** | TIMESTAMP | | NULL | Thời gian hết hạn OAuth token |
| **oauth_profile_data** | JSONB | | NULL | Dữ liệu profile từ OAuth |
| **failed_login_attempts** | INT | | 0 | Số lần đăng nhập thất bại |
| **locked_until** | TIMESTAMP | | NULL | Khóa tài khoản đến thời gian |
| **last_login_at** | TIMESTAMP | | NULL | Lần đăng nhập cuối |
| **last_login_ip** | VARCHAR(45) | | NULL | IP đăng nhập cuối |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Unique Constraints**:
- (account_type, identifier)
- (oauth_provider, oauth_provider_user_id)

**Check Constraints**:
- Nếu account_type = 'oauth' thì oauth_provider và oauth_provider_user_id phải NOT NULL
- Nếu account_type != 'oauth' thì password_hash phải NOT NULL

---

### 3. sessions
**Mô tả**: Quản lý các phiên đăng nhập của người dùng.

**Indexes**:
- `idx_sessions_user_id`: Index trên user_id
- `idx_sessions_session_token`: Index trên session_token
- `idx_sessions_refresh_token`: Index trên refresh_token
- `idx_sessions_expires_at`: Index trên expires_at
- `idx_sessions_is_active`: Index trên is_active

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Tham chiếu đến user |
| **account_id** | BIGINT | NOT NULL, FK → accounts(id) | | Tham chiếu đến account |
| **session_token** | VARCHAR(500) | UNIQUE, NOT NULL | | Token phiên đăng nhập |
| **refresh_token** | VARCHAR(500) | UNIQUE | NULL | Token làm mới phiên |
| **device_name** | VARCHAR(200) | | NULL | Tên thiết bị |
| **device_type** | VARCHAR(50) | | NULL | Loại thiết bị (mobile, tablet, desktop) |
| **browser** | VARCHAR(100) | | NULL | Trình duyệt |
| **os** | VARCHAR(100) | | NULL | Hệ điều hành |
| **ip_address** | VARCHAR(45) | | NULL | Địa chỉ IP |
| **user_agent** | TEXT | | NULL | User agent string |
| **is_active** | BOOLEAN | | TRUE | Phiên đang hoạt động |
| **expires_at** | TIMESTAMP | NOT NULL | | Thời gian hết hạn phiên |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **last_activity_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Hoạt động cuối cùng |

---

### 4. oauth_providers
**Mô tả**: Lưu trữ metadata bổ sung về OAuth (bảng này deprecated, dữ liệu OAuth chính lưu trong accounts).

**Indexes**:
- `idx_oauth_providers_account_id`: Index trên account_id

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **account_id** | BIGINT | NOT NULL, FK → accounts(id) | | Tham chiếu đến account |
| **provider** | oauth_provider_enum | NOT NULL | | Nhà cung cấp OAuth |
| **provider_user_id** | VARCHAR(255) | NOT NULL | | User ID từ provider |
| **email** | VARCHAR(150) | | NULL | Email từ OAuth |
| **name** | VARCHAR(100) | | NULL | Tên từ OAuth |
| **avatar_url** | TEXT | | NULL | Avatar từ OAuth |
| **raw_data** | JSONB | | NULL | Dữ liệu thô từ OAuth |
| **linked_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian liên kết |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Unique Constraints**:
- (provider, provider_user_id)

---

### 5. addresses
**Mô tả**: Địa chỉ giao hàng/thanh toán của người dùng.

**Indexes**:
- `idx_addresses_user_id`: Index trên user_id
- `idx_addresses_is_default`: Index trên (user_id, is_default)
- `idx_addresses_location`: Index trên (latitude, longitude)

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Tham chiếu đến user |
| **recipient_name** | VARCHAR(100) | NOT NULL | | Tên người nhận |
| **recipient_phone** | VARCHAR(15) | NOT NULL | | SĐT người nhận |
| **province** | VARCHAR(100) | NOT NULL | | Tỉnh/Thành phố |
| **province_code** | VARCHAR(10) | | NULL | Mã tỉnh/thành phố |
| **district** | VARCHAR(100) | NOT NULL | | Quận/Huyện |
| **district_code** | VARCHAR(10) | | NULL | Mã quận/huyện |
| **ward** | VARCHAR(100) | NOT NULL | | Phường/Xã |
| **ward_code** | VARCHAR(10) | | NULL | Mã phường/xã |
| **street_address** | TEXT | NOT NULL | | Địa chỉ đường phố |
| **latitude** | DECIMAL(10,8) | | NULL | Vĩ độ |
| **longitude** | DECIMAL(11,8) | | NULL | Kinh độ |
| **address_type** | VARCHAR(20) | | 'home' | Loại địa chỉ (home, office, other) |
| **label** | VARCHAR(50) | | NULL | Nhãn tùy chỉnh |
| **is_default** | BOOLEAN | | FALSE | Địa chỉ mặc định |
| **note** | TEXT | | NULL | Ghi chú |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 6. categories
**Mô tả**: Danh mục sản phẩm có cấu trúc phân cấp.

**Indexes**:
- `idx_categories_parent_id`: Index trên parent_id
- `idx_categories_slug`: Index trên slug
- `idx_categories_active`: Index trên is_active
- `idx_categories_path`: Index trên path

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | SERIAL | PRIMARY KEY | auto | ID duy nhất |
| **parent_id** | INT | FK → categories(id) | NULL | Danh mục cha |
| **name** | VARCHAR(100) | NOT NULL | | Tên danh mục |
| **slug** | VARCHAR(120) | UNIQUE, NOT NULL | | Slug URL-friendly |
| **description** | TEXT | | NULL | Mô tả |
| **image_url** | TEXT | | NULL | URL hình ảnh |
| **banner_url** | TEXT | | NULL | URL banner |
| **icon** | VARCHAR(50) | | NULL | Icon |
| **sort_order** | INT | | 0 | Thứ tự sắp xếp |
| **level** | INT | | 0 | Cấp độ (0=root, 1=child, 2=grandchild) |
| **path** | VARCHAR(500) | | NULL | Đường dẫn phân cấp (materialized path) |
| **meta_title** | VARCHAR(200) | | NULL | Meta title cho SEO |
| **meta_description** | VARCHAR(300) | | NULL | Meta description cho SEO |
| **meta_keywords** | TEXT | | NULL | Meta keywords cho SEO |
| **is_active** | BOOLEAN | | TRUE | Danh mục đang hoạt động |
| **is_featured** | BOOLEAN | | FALSE | Danh mục nổi bật |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 7. products
**Mô tả**: Catalog sản phẩm chính.

**Indexes**:
- `idx_products_category_id`: Index trên category_id
- `idx_products_slug`: Index trên slug
- `idx_products_sku`: Index trên sku
- `idx_products_status`: Index trên status
- `idx_products_brand`: Index trên brand
- `idx_products_is_featured`: Index trên is_featured
- `idx_products_avg_rating`: Index trên avg_rating DESC
- `idx_products_sold_count`: Index trên sold_count DESC
- `idx_products_created_at`: Index trên created_at DESC
- `idx_products_published_at`: Index trên published_at DESC

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **category_id** | INT | NOT NULL, FK → categories(id) | | Danh mục sản phẩm |
| **name** | VARCHAR(255) | NOT NULL | | Tên sản phẩm |
| **slug** | VARCHAR(300) | UNIQUE, NOT NULL | | Slug URL-friendly |
| **sku** | VARCHAR(100) | UNIQUE | NULL | Mã SKU |
| **short_description** | VARCHAR(500) | | NULL | Mô tả ngắn |
| **description** | TEXT | | NULL | Mô tả chi tiết |
| **brand** | VARCHAR(100) | | NULL | Thương hiệu |
| **manufacturer** | VARCHAR(150) | | NULL | Nhà sản xuất |
| **origin_country** | VARCHAR(100) | | NULL | Xuất xứ |
| **material** | VARCHAR(200) | | NULL | Chất liệu |
| **style** | VARCHAR(100) | | NULL | Phong cách |
| **season** | VARCHAR(50) | | NULL | Mùa (Spring/Summer/Fall/Winter/All Season) |
| **care_instructions** | TEXT | | NULL | Hướng dẫn bảo quản |
| **features** | JSONB | | NULL | Đặc điểm sản phẩm (array) |
| **base_price** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Giá cơ bản |
| **compare_at_price** | DECIMAL(12,2) | CHECK >= base_price | NULL | Giá so sánh (giá gốc) |
| **cost_price** | DECIMAL(12,2) | CHECK >= 0 | NULL | Giá vốn |
| **tax_rate** | DECIMAL(5,2) | | 0 | Thuế suất |
| **requires_shipping** | BOOLEAN | | TRUE | Yêu cầu vận chuyển |
| **weight_grams** | INT | | NULL | Khối lượng (gram) |
| **view_count** | INT | | 0 | Số lượt xem |
| **sold_count** | INT | | 0 | Số lượng đã bán |
| **avg_rating** | DECIMAL(3,2) | CHECK 0-5 | 0.0 | Đánh giá trung bình |
| **review_count** | INT | | 0 | Số lượng đánh giá |
| **status** | product_status | NOT NULL | 'draft' | Trạng thái sản phẩm |
| **is_featured** | BOOLEAN | | FALSE | Sản phẩm nổi bật |
| **is_new** | BOOLEAN | | FALSE | Sản phẩm mới |
| **is_bestseller** | BOOLEAN | | FALSE | Sản phẩm bán chạy |
| **published_at** | TIMESTAMP | | NULL | Thời gian xuất bản |
| **meta_title** | VARCHAR(200) | | NULL | Meta title cho SEO |
| **meta_description** | VARCHAR(300) | | NULL | Meta description cho SEO |
| **meta_keywords** | TEXT | | NULL | Meta keywords cho SEO |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 8. product_variants
**Mô tả**: Biến thể sản phẩm theo size và màu sắc, có quản lý tồn kho.

**Indexes**:
- `idx_variants_product_id`: Index trên product_id
- `idx_variants_sku`: Index trên sku
- `idx_variants_barcode`: Index trên barcode
- `idx_variants_stock`: Index trên stock_qty
- `idx_variants_active`: Index trên is_active
- `idx_variants_is_default`: Index trên (product_id, is_default)

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **product_id** | BIGINT | NOT NULL, FK → products(id) | | Tham chiếu sản phẩm |
| **sku** | VARCHAR(100) | UNIQUE, NOT NULL | | Mã SKU biến thể |
| **barcode** | VARCHAR(100) | UNIQUE | NULL | Mã vạch |
| **size** | VARCHAR(20) | NOT NULL | | Kích thước (S, M, L, XL, ...) |
| **color** | VARCHAR(50) | NOT NULL | | Màu sắc |
| **color_hex** | VARCHAR(7) | | NULL | Mã màu hex (#RRGGBB) |
| **color_image_url** | TEXT | | NULL | URL hình màu sắc |
| **price** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Giá bán |
| **sale_price** | DECIMAL(12,2) | CHECK >= 0 và < price | NULL | Giá khuyến mãi |
| **cost_price** | DECIMAL(12,2) | CHECK >= 0 | NULL | Giá vốn |
| **stock_qty** | INT | CHECK >= 0 | 0 | Số lượng tồn kho |
| **reserved_qty** | INT | CHECK >= 0 | 0 | Số lượng đang giữ (đơn chưa hoàn thành) |
| **sold_qty** | INT | CHECK >= 0 | 0 | Số lượng đã bán |
| **low_stock_threshold** | INT | | 5 | Ngưỡng cảnh báo tồn kho thấp |
| **weight_grams** | INT | | NULL | Khối lượng (gram) |
| **length_cm** | DECIMAL(8,2) | | NULL | Chiều dài (cm) |
| **width_cm** | DECIMAL(8,2) | | NULL | Chiều rộng (cm) |
| **height_cm** | DECIMAL(8,2) | | NULL | Chiều cao (cm) |
| **image_url** | TEXT | | NULL | URL hình ảnh biến thể |
| **is_active** | BOOLEAN | | TRUE | Biến thể đang hoạt động |
| **is_default** | BOOLEAN | | FALSE | Biến thể mặc định |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Unique Constraints**:
- (product_id, size, color)

---

### 9. product_images
**Mô tả**: Hình ảnh sản phẩm và biến thể.

**Indexes**:
- `idx_images_product_id`: Index trên product_id
- `idx_images_variant_id`: Index trên variant_id
- `idx_images_is_primary`: Index trên (product_id, is_primary)
- `idx_images_sort_order`: Index trên (product_id, sort_order)

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **product_id** | BIGINT | NOT NULL, FK → products(id) | | Tham chiếu sản phẩm |
| **variant_id** | BIGINT | FK → product_variants(id) | NULL | Tham chiếu biến thể (nếu có) |
| **url** | TEXT | NOT NULL | | URL hình ảnh |
| **thumbnail_url** | TEXT | | NULL | URL thumbnail |
| **alt_text** | VARCHAR(200) | | NULL | Văn bản thay thế |
| **image_type** | VARCHAR(20) | | 'gallery' | Loại hình (gallery, thumbnail, lifestyle, detail) |
| **is_primary** | BOOLEAN | | FALSE | Hình ảnh chính |
| **sort_order** | INT | | 0 | Thứ tự sắp xếp |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |

---

### 10. vouchers
**Mô tả**: Mã giảm giá và khuyến mãi.

**Indexes**:
- `idx_vouchers_code`: Index trên code
- `idx_vouchers_active`: Index trên is_active
- `idx_vouchers_dates`: Index trên (start_date, end_date)
- `idx_vouchers_type`: Index trên type

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **code** | VARCHAR(50) | UNIQUE, NOT NULL | | Mã voucher |
| **name** | VARCHAR(150) | NOT NULL | | Tên voucher |
| **description** | TEXT | | NULL | Mô tả |
| **type** | voucher_type | NOT NULL | | Loại giảm giá (percent/fixed/free_ship) |
| **value** | DECIMAL(12,2) | NOT NULL, CHECK > 0 | | Giá trị giảm (% hoặc số tiền) |
| **min_order_value** | DECIMAL(12,2) | | 0 | Giá trị đơn hàng tối thiểu |
| **max_discount_amount** | DECIMAL(12,2) | | NULL | Số tiền giảm tối đa |
| **applicable_categories** | INT[] | | NULL | Mảng ID danh mục áp dụng |
| **applicable_products** | BIGINT[] | | NULL | Mảng ID sản phẩm áp dụng |
| **usage_limit** | INT | CHECK > 0 | NULL | Giới hạn sử dụng tổng |
| **usage_limit_per_user** | INT | | 1 | Giới hạn sử dụng mỗi user |
| **used_count** | INT | CHECK >= 0 | 0 | Số lần đã sử dụng |
| **min_customer_tier** | user_tier | | 'normal' | Hạng khách hàng tối thiểu |
| **new_customers_only** | BOOLEAN | | FALSE | Chỉ khách hàng mới |
| **is_active** | BOOLEAN | | TRUE | Voucher đang hoạt động |
| **start_date** | TIMESTAMP | NOT NULL | | Ngày bắt đầu |
| **end_date** | TIMESTAMP | NOT NULL | | Ngày kết thúc |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Check Constraints**:
- end_date > start_date

---

### 11. orders
**Mô tả**: Đơn hàng của khách hàng.

**Indexes**:
- `idx_orders_order_code`: Index trên order_code
- `idx_orders_user_id`: Index trên user_id
- `idx_orders_status`: Index trên status
- `idx_orders_created_at`: Index trên created_at DESC
- `idx_orders_total`: Index trên total DESC
- `idx_orders_voucher_id`: Index trên voucher_id

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **order_code** | VARCHAR(20) | UNIQUE, NOT NULL | | Mã đơn hàng |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Khách hàng |
| **voucher_id** | BIGINT | FK → vouchers(id) | NULL | Voucher đã dùng |
| **status** | order_status | NOT NULL | 'pending' | Trạng thái đơn hàng |
| **subtotal** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Tổng tiền hàng |
| **discount_amount** | DECIMAL(12,2) | CHECK >= 0 | 0 | Số tiền giảm |
| **shipping_fee** | DECIMAL(12,2) | CHECK >= 0 | 0 | Phí vận chuyển |
| **tax_amount** | DECIMAL(12,2) | CHECK >= 0 | 0 | Tiền thuế |
| **total** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Tổng cộng |
| **points_earned** | INT | | 0 | Điểm thưởng |
| **points_used** | INT | | 0 | Điểm đã dùng |
| **points_value** | DECIMAL(12,2) | | 0 | Giá trị điểm đã dùng |
| **shipping_name** | VARCHAR(100) | NOT NULL | | Tên người nhận |
| **shipping_phone** | VARCHAR(15) | NOT NULL | | SĐT người nhận |
| **shipping_email** | VARCHAR(150) | | NULL | Email người nhận |
| **shipping_province** | VARCHAR(100) | NOT NULL | | Tỉnh/TP giao hàng |
| **shipping_district** | VARCHAR(100) | NOT NULL | | Quận/Huyện giao hàng |
| **shipping_ward** | VARCHAR(100) | NOT NULL | | Phường/Xã giao hàng |
| **shipping_street** | TEXT | NOT NULL | | Địa chỉ đường phố |
| **shipping_note** | TEXT | | NULL | Ghi chú giao hàng |
| **billing_address** | JSONB | | NULL | Địa chỉ thanh toán (nếu khác) |
| **customer_note** | TEXT | | NULL | Ghi chú khách hàng |
| **admin_note** | TEXT | | NULL | Ghi chú admin |
| **cancellation_reason** | TEXT | | NULL | Lý do hủy |
| **cancelled_by** | VARCHAR(20) | | NULL | Người hủy (customer/admin/system) |
| **confirmed_at** | TIMESTAMP | | NULL | Thời gian xác nhận |
| **packed_at** | TIMESTAMP | | NULL | Thời gian đóng gói |
| **shipped_at** | TIMESTAMP | | NULL | Thời gian gửi hàng |
| **delivered_at** | TIMESTAMP | | NULL | Thời gian giao hàng |
| **completed_at** | TIMESTAMP | | NULL | Thời gian hoàn thành |
| **cancelled_at** | TIMESTAMP | | NULL | Thời gian hủy |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 12. order_items
**Mô tả**: Các mục trong đơn hàng với snapshot sản phẩm tại thời điểm mua.

**Indexes**:
- `idx_order_items_order_id`: Index trên order_id
- `idx_order_items_variant_id`: Index trên variant_id

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **order_id** | BIGINT | NOT NULL, FK → orders(id) | | Đơn hàng |
| **variant_id** | BIGINT | NOT NULL, FK → product_variants(id) | | Biến thể sản phẩm |
| **product_name** | VARCHAR(255) | NOT NULL | | Tên sản phẩm (snapshot) |
| **product_slug** | VARCHAR(300) | NOT NULL | | Slug sản phẩm (snapshot) |
| **sku** | VARCHAR(100) | NOT NULL | | SKU (snapshot) |
| **size** | VARCHAR(20) | NOT NULL | | Size (snapshot) |
| **color** | VARCHAR(50) | NOT NULL | | Màu sắc (snapshot) |
| **image_url** | TEXT | | NULL | URL hình ảnh (snapshot) |
| **unit_price** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Đơn giá |
| **quantity** | INT | NOT NULL, CHECK > 0 | | Số lượng |
| **line_total** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Thành tiền |
| **discount_amount** | DECIMAL(12,2) | | 0 | Giảm giá cấp item |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |

---

### 13. payments
**Mô tả**: Giao dịch thanh toán.

**Indexes**:
- `idx_payments_order_id`: Index trên order_id
- `idx_payments_transaction_id`: Index trên transaction_id
- `idx_payments_status`: Index trên status
- `idx_payments_method`: Index trên method

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **order_id** | BIGINT | NOT NULL, FK → orders(id) | | Đơn hàng |
| **method** | payment_method | NOT NULL | | Phương thức thanh toán |
| **status** | payment_status | NOT NULL | 'pending' | Trạng thái thanh toán |
| **amount** | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | | Số tiền |
| **transaction_id** | VARCHAR(255) | UNIQUE | NULL | Mã giao dịch |
| **gateway_order_id** | VARCHAR(255) | | NULL | Mã đơn từ cổng thanh toán |
| **gateway_response** | JSONB | | NULL | Response từ gateway |
| **error_code** | VARCHAR(50) | | NULL | Mã lỗi |
| **error_message** | TEXT | | NULL | Thông báo lỗi |
| **refund_amount** | DECIMAL(12,2) | CHECK >= 0 | 0 | Số tiền hoàn |
| **refund_reason** | TEXT | | NULL | Lý do hoàn tiền |
| **refunded_at** | TIMESTAMP | | NULL | Thời gian hoàn tiền |
| **paid_at** | TIMESTAMP | | NULL | Thời gian thanh toán |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 14. shipments
**Mô tả**: Quản lý vận chuyển và theo dõi đơn hàng.

**Indexes**:
- `idx_shipments_order_id`: Index trên order_id
- `idx_shipments_tracking_code`: Index trên tracking_code
- `idx_shipments_status`: Index trên status
- `idx_shipments_carrier`: Index trên carrier

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **order_id** | BIGINT | NOT NULL, FK → orders(id) | | Đơn hàng |
| **carrier** | VARCHAR(50) | NOT NULL | | Đơn vị vận chuyển (GHTK, GHN, Viettel Post, ...) |
| **carrier_service** | VARCHAR(100) | | NULL | Dịch vụ vận chuyển |
| **tracking_code** | VARCHAR(100) | UNIQUE | NULL | Mã tracking |
| **status** | shipment_status | NOT NULL | 'preparing' | Trạng thái vận chuyển |
| **shipping_address** | JSONB | NOT NULL | | Địa chỉ giao hàng |
| **estimated_delivery_date** | DATE | | NULL | Ngày giao dự kiến |
| **actual_delivery_date** | DATE | | NULL | Ngày giao thực tế |
| **weight_grams** | INT | | NULL | Khối lượng |
| **length_cm** | DECIMAL(8,2) | | NULL | Chiều dài |
| **width_cm** | DECIMAL(8,2) | | NULL | Chiều rộng |
| **height_cm** | DECIMAL(8,2) | | NULL | Chiều cao |
| **shipping_fee** | DECIMAL(12,2) | | NULL | Phí vận chuyển |
| **cod_amount** | DECIMAL(12,2) | | NULL | Số tiền COD |
| **insurance_fee** | DECIMAL(12,2) | | 0 | Phí bảo hiểm |
| **note** | TEXT | | NULL | Ghi chú |
| **return_note** | TEXT | | NULL | Ghi chú trả hàng |
| **picked_up_at** | TIMESTAMP | | NULL | Thời gian lấy hàng |
| **in_transit_at** | TIMESTAMP | | NULL | Thời gian vận chuyển |
| **out_for_delivery_at** | TIMESTAMP | | NULL | Thời gian đang giao |
| **delivered_at** | TIMESTAMP | | NULL | Thời gian giao thành công |
| **returned_at** | TIMESTAMP | | NULL | Thời gian trả lại |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 15. reviews
**Mô tả**: Đánh giá và nhận xét sản phẩm.

**Indexes**:
- `idx_reviews_user_id`: Index trên user_id
- `idx_reviews_product_id`: Index trên product_id
- `idx_reviews_variant_id`: Index trên variant_id
- `idx_reviews_rating`: Index trên rating
- `idx_reviews_created_at`: Index trên created_at DESC
- `idx_reviews_is_approved`: Index trên is_approved
- `idx_reviews_helpful`: Index trên helpful_count DESC

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Người đánh giá |
| **product_id** | BIGINT | NOT NULL, FK → products(id) | | Sản phẩm được đánh giá |
| **order_item_id** | BIGINT | FK → order_items(id) | NULL | Item trong đơn hàng |
| **variant_id** | BIGINT | FK → product_variants(id) | NULL | Biến thể được đánh giá |
| **rating** | SMALLINT | NOT NULL, CHECK 1-5 | | Điểm đánh giá (1-5 sao) |
| **title** | VARCHAR(200) | | NULL | Tiêu đề đánh giá |
| **content** | TEXT | | NULL | Nội dung đánh giá |
| **images** | JSONB | | NULL | Hình ảnh kèm theo |
| **videos** | JSONB | | NULL | Video kèm theo |
| **quality_rating** | SMALLINT | CHECK 1-5 | NULL | Đánh giá chất lượng |
| **fit_rating** | SMALLINT | CHECK 1-5 | NULL | Đánh giá độ vừa vặn |
| **value_rating** | SMALLINT | CHECK 1-5 | NULL | Đánh giá giá trị |
| **is_verified_purchase** | BOOLEAN | | FALSE | Đã mua hàng xác minh |
| **is_approved** | BOOLEAN | | TRUE | Đã được duyệt |
| **is_featured** | BOOLEAN | | FALSE | Đánh giá nổi bật |
| **helpful_count** | INT | | 0 | Số lượt hữu ích |
| **unhelpful_count** | INT | | 0 | Số lượt không hữu ích |
| **admin_reply** | TEXT | | NULL | Phản hồi từ admin |
| **admin_replied_by** | BIGINT | FK → users(id) | NULL | Admin phản hồi |
| **replied_at** | TIMESTAMP | | NULL | Thời gian phản hồi |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Unique Constraints**:
- (user_id, order_item_id)

---

### 16. carts
**Mô tả**: Giỏ hàng cho người dùng đã đăng nhập và khách (guest session).

**Indexes**:
- `idx_carts_user_id`: Index trên user_id
- `idx_carts_session_id`: Index trên session_id
- `idx_carts_expires_at`: Index trên expires_at

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **user_id** | BIGINT | FK → users(id) | NULL | User (nếu đã đăng nhập) |
| **session_id** | VARCHAR(100) | UNIQUE | NULL | Session ID (cho khách) |
| **merged_from_session** | VARCHAR(100) | | NULL | Tracking nếu merge từ guest cart |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |
| **expires_at** | TIMESTAMP | | NULL | Thời gian hết hạn |

**Check Constraints**:
- user_id hoặc session_id phải có 1 giá trị NOT NULL

---

### 17. cart_items
**Mô tả**: Các mục trong giỏ hàng.

**Indexes**:
- `idx_cart_items_cart_id`: Index trên cart_id
- `idx_cart_items_variant_id`: Index trên variant_id

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **cart_id** | BIGINT | NOT NULL, FK → carts(id) | | Giỏ hàng |
| **variant_id** | BIGINT | NOT NULL, FK → product_variants(id) | | Biến thể sản phẩm |
| **quantity** | INT | NOT NULL, CHECK > 0 | | Số lượng |
| **added_price** | DECIMAL(12,2) | | NULL | Giá khi thêm vào (để phát hiện thay đổi giá) |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

**Unique Constraints**:
- (cart_id, variant_id)

---

### 18. return_requests
**Mô tả**: Yêu cầu trả hàng và hoàn tiền.

**Indexes**:
- `idx_return_requests_order_id`: Index trên order_id
- `idx_return_requests_user_id`: Index trên user_id
- `idx_return_requests_status`: Index trên status
- `idx_return_requests_created_at`: Index trên created_at DESC

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **order_id** | BIGINT | NOT NULL, FK → orders(id) | | Đơn hàng |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Người yêu cầu |
| **return_items** | JSONB | NOT NULL | | Các item trả (array of {order_item_id, quantity, reason}) |
| **reason_category** | VARCHAR(50) | NOT NULL | | Danh mục lý do (defective, wrong_item, not_as_described, changed_mind) |
| **reason_detail** | TEXT | NOT NULL | | Chi tiết lý do |
| **images** | JSONB | | NULL | Hình ảnh minh chứng |
| **videos** | JSONB | | NULL | Video minh chứng |
| **status** | return_status | NOT NULL | 'pending' | Trạng thái |
| **refund_amount** | DECIMAL(12,2) | CHECK >= 0 | NULL | Số tiền hoàn |
| **refund_method** | payment_method | | NULL | Phương thức hoàn tiền |
| **restock_items** | BOOLEAN | | TRUE | Nhập lại kho |
| **admin_note** | TEXT | | NULL | Ghi chú admin |
| **processed_by** | BIGINT | FK → users(id) | NULL | Admin xử lý |
| **return_tracking_code** | VARCHAR(100) | | NULL | Mã tracking trả hàng |
| **return_carrier** | VARCHAR(50) | | NULL | Đơn vị vận chuyển trả hàng |
| **approved_at** | TIMESTAMP | | NULL | Thời gian chấp nhận |
| **rejected_at** | TIMESTAMP | | NULL | Thời gian từ chối |
| **refunded_at** | TIMESTAMP | | NULL | Thời gian hoàn tiền |
| **completed_at** | TIMESTAMP | | NULL | Thời gian hoàn thành |
| **created_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian tạo |
| **updated_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian cập nhật |

---

### 19. voucher_usage
**Mô tả**: Lịch sử sử dụng voucher.

**Indexes**:
- `idx_voucher_usage_voucher_id`: Index trên voucher_id
- `idx_voucher_usage_user_id`: Index trên user_id
- `idx_voucher_usage_order_id`: Index trên order_id

| Field | Type | Constraints | Default | Mô tả |
|-------|------|-------------|---------|-------|
| **id** | BIGSERIAL | PRIMARY KEY | auto | ID duy nhất |
| **voucher_id** | BIGINT | NOT NULL, FK → vouchers(id) | | Voucher |
| **user_id** | BIGINT | NOT NULL, FK → users(id) | | Người dùng |
| **order_id** | BIGINT | NOT NULL, FK → orders(id) | | Đơn hàng |
| **discount_amount** | DECIMAL(12,2) | NOT NULL | | Số tiền giảm |
| **used_at** | TIMESTAMP | | CURRENT_TIMESTAMP | Thời gian sử dụng |

**Unique Constraints**:
- (voucher_id, order_id)

---

## 🔧 Triggers & Functions

### 1. update_updated_at_column()
**Mô tả**: Tự động cập nhật cột `updated_at` khi có UPDATE.  
**Applied to**: Tất cả bảng có cột `updated_at`.

### 2. update_product_rating()
**Mô tả**: Cập nhật `avg_rating` và `review_count` của sản phẩm khi có đánh giá mới/sửa/xóa.  
**Trigger**: `trigger_update_product_rating` on `reviews` table.

### 3. check_stock_availability()
**Mô tả**: Kiểm tra tồn kho trước khi thêm item vào đơn hàng.  
**Trigger**: `trigger_check_stock` BEFORE INSERT on `order_items`.  
**Logic**: Ném exception nếu `stock_qty - reserved_qty < quantity`.

### 4. reserve_stock()
**Mô tả**: Giữ hàng (tăng `reserved_qty`) khi tạo đơn hàng.  
**Trigger**: `trigger_reserve_stock` AFTER INSERT on `orders`.

### 5. update_stock_on_status_change()
**Mô tả**: Cập nhật tồn kho khi trạng thái đơn hàng thay đổi.  
**Trigger**: `trigger_update_stock_on_status_change` AFTER UPDATE on `orders`.  
**Logic**:
- `completed`: Chuyển từ `reserved_qty` sang `sold_qty`, giảm `stock_qty`, tăng `sold_count`, tặng loyalty points cho user.
- `cancelled`: Giải phóng `reserved_qty`.

### 6. increment_voucher_usage()
**Mô tả**: Tăng số lượt sử dụng voucher và ghi lại lịch sử.  
**Trigger**: `trigger_increment_voucher_usage` AFTER INSERT on `orders`.

### 7. ensure_one_default_address()
**Mô tả**: Đảm bảo mỗi user chỉ có 1 địa chỉ mặc định.  
**Trigger**: `trigger_one_default_address` BEFORE INSERT/UPDATE on `addresses`.  
**Logic**: Nếu set `is_default=TRUE`, tự động set các địa chỉ khác của user thành `FALSE`.

---

## ✅ Auto-updated vs Manual Fields

**Ghi chú**: “Auto-updated” là các cột được trigger tự động cập nhật. Các cột khác bạn phải tự set trong app (hoặc dùng default khi INSERT).

| Table | Auto-updated by trigger | Notes |
|-------|--------------------------|-------|
| users | updated_at; loyalty_points; total_spent; total_orders | Điểm/tổng chi tiêu/tổng đơn cập nhật khi order chuyển sang completed |
| accounts | updated_at | |
| oauth_providers | updated_at | |
| addresses | updated_at; is_default (các row khác bị set FALSE) | Khi set is_default=TRUE cho 1 địa chỉ |
| categories | updated_at | |
| products | updated_at; avg_rating; review_count; sold_count | avg_rating/review_count khi có review, sold_count khi order completed |
| product_variants | updated_at; reserved_qty; sold_qty; stock_qty | reserve khi tạo order, chuyển khi completed/cancelled |
| vouchers | updated_at; used_count | Tăng khi tạo order có voucher |
| orders | updated_at | |
| payments | updated_at | |
| shipments | updated_at | |
| reviews | updated_at | |
| carts | updated_at | |
| cart_items | updated_at | |
| return_requests | updated_at | |
| voucher_usage | (row auto-insert) | Trigger tự insert row khi tạo order có voucher |
| order_items | none | Không có trigger cập nhật |
| product_images | none | |
| sessions | none | |

**Manual/App-managed**: Tất cả các cột không nằm trong bảng trên (bao gồm các field nghiệp vụ như role, tier, status, address fields, pricing, v.v.).  
**Defaults** như `created_at`, `is_active`, `is_verified`, `points_earned`... sẽ tự lấy giá trị mặc định nếu bạn không truyền khi INSERT.

---

## 📈 Views

### 1. v_users_with_accounts
**Mô tả**: View kết hợp user với tất cả accounts của họ (dạng JSON array).  
**Columns**: Tất cả columns từ `users` + `accounts` array.

### 2. v_product_catalog
**Mô tả**: Catalog sản phẩm đang active với thông tin đầy đủ.  
**Columns**:
- Tất cả columns từ `products`
- `category_name`, `category_slug`, `category_path`
- `primary_image`: URL hình ảnh chính
- `variant_count`: Số lượng biến thể active
- `min_price`, `max_price`: Giá min/max trong các biến thể
- `total_stock`: Tổng tồn kho

**Filter**: Chỉ sản phẩm có `status='active'`.

### 3. v_order_summary
**Mô tả**: Tóm tắt đơn hàng với thông tin khách hàng, thanh toán, vận chuyển.  
**Columns**:
- Tất cả columns từ `orders`
- Thông tin khách hàng: `customer_name`, `customer_email`, `customer_phone`, `customer_tier`
- Thống kê: `item_count`, `total_quantity`
- Thông tin thanh toán: `payment_status`, `payment_method`, `paid_at`
- Thông tin vận chuyển: `carrier`, `tracking_code`, `shipment_status`, `estimated_delivery_date`

---

## 🔗 Relationships

### User & Authentication Flow
```
users (1) ←→ (N) accounts
accounts (1) ←→ (N) sessions
users (1) ←→ (N) oauth_providers (via accounts)
```

### User Profile & Data
```
users (1) ←→ (N) addresses
users (1) ←→ (N) orders
users (1) ←→ (N) reviews
users (1) ←→ (N) carts
users (1) ←→ (N) return_requests
```

### Product Catalog
```
categories (1) ←→ (N) categories (self-reference, hierarchical)
categories (1) ←→ (N) products
products (1) ←→ (N) product_variants
products (1) ←→ (N) product_images
product_variants (1) ←→ (N) product_images
products (1) ←→ (N) reviews
```

### Shopping Cart
```
users/sessions (1) ←→ (N) carts
carts (1) ←→ (N) cart_items
product_variants (1) ←→ (N) cart_items
```

### Order Flow
```
users (1) ←→ (N) orders
vouchers (1) ←→ (N) orders
orders (1) ←→ (N) order_items
product_variants (1) ←→ (N) order_items
orders (1) ←→ (N) payments
orders (1) ←→ (N) shipments
orders (1) ←→ (N) return_requests
```

### Voucher System
```
vouchers (1) ←→ (N) orders
vouchers (1) ←→ (N) voucher_usage
users (1) ←→ (N) voucher_usage
orders (1) ←→ (1) voucher_usage
```

---

## 📝 Notes

### Security Considerations
1. **Password Storage**: Sử dụng `password_hash` và `password_salt` - luôn hash với bcrypt hoặc argon2.
2. **Token Expiration**: Tất cả tokens (verification, reset, session, OAuth) đều có expiration time.
3. **Failed Login Tracking**: `failed_login_attempts` và `locked_until` để chống brute force.
4. **Separation of Concerns**: Tách biệt authentication (accounts) và user data (users).

### Business Logic
1. **Stock Management**: Hệ thống tracking 3-tier: `stock_qty` (tổng), `reserved_qty` (đang giữ), `sold_qty` (đã bán).
2. **Loyalty System**: Tự động tích điểm và nâng hạng dựa trên `total_spent` và `total_orders`.
3. **Price Snapshot**: `order_items` lưu snapshot của sản phẩm tại thời điểm mua để tránh thay đổi giá ảnh hưởng.
4. **Cart Merge**: Guest cart có thể merge vào user cart khi đăng nhập (tracking bằng `merged_from_session`).

### Performance Optimization
1. **Materialized Path**: `categories.path` cho phép query tree nhanh chóng.
2. **Denormalization**: `products.sold_count`, `products.avg_rating` để tránh JOIN/aggregation.
3. **Partial Indexes**: Nhiều indexes có WHERE clause để giảm kích thước index.
4. **JSONB**: Sử dụng JSONB cho dữ liệu flexible (OAuth profile, shipping address, features).

### Data Integrity
1. **CHECK Constraints**: Đảm bảo giá trị hợp lệ (rating 1-5, quantities >= 0, dates logic).
2. **Foreign Keys**: Tất cả relationships đều có FK với appropriate ON DELETE actions.
3. **UNIQUE Constraints**: Ngăn duplicate (voucher code, SKU, tracking code, etc).
4. **Triggers**: Tự động enforce business rules và maintain consistency.

---
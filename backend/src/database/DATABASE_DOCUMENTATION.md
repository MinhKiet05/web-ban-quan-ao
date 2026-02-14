# Fashion Store Database Documentation

## 📋 Tổng Quan

**Database**: Fashion Store  
**Platform**: PostgreSQL  
**Architecture**: Separated Users & Accounts  
**Created**: 2026-02-13  
**Total Tables**: 19  
**Total Views**: 3  
**Version**: 1.0

### Kiến Trúc Hệ Thống

Database được thiết kế với kiến trúc tách biệt giữa:
- **Users Table**: Lưu thông tin profile và dữ liệu nghiệp vụ
- **Accounts Table**: Xử lý xác thực (email/phone/OAuth)
- **Sessions Table**: Quản lý phiên đăng nhập

---

## 🎯 Custom Types (ENUMS)

### user_role
Vai trò người dùng trong hệ thống.

| Value | Mô tả |
|-------|-------|
| `customer` | Khách hàng |
| `admin` | Quản trị viên |
| `staff` | Nhân viên |
| `super_admin` | Quản trị viên cấp cao |

### user_tier
Hạng khách hàng dựa trên lịch sử mua hàng.

| Value | Mô tả |
|-------|-------|
| `normal` | Khách hàng thường |
| `silver` | Hạng bạc |
| `gold` | Hạng vàng |
| `platinum` | Hạng bạch kim |
| `vip` | Khách hàng VIP |

### account_type
Phương thức xác thực tài khoản.

| Value | Mô tả |
|-------|-------|
| `email` | Xác thực qua email |
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
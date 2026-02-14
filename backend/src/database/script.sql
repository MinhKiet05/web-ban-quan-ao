-- =====================================================
-- FASHION STORE DATABASE SCHEMA - PostgreSQL
-- =====================================================
-- Created: 2026-02-13
-- Description: Complete database schema with separated Users & Accounts architecture
-- Architecture: users (profile data) + accounts (authentication)
-- =====================================================

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS return_requests CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS voucher_usage CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS oauth_providers CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_tier CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;
DROP TYPE IF EXISTS oauth_provider_enum CASCADE;
DROP TYPE IF EXISTS product_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS shipment_status CASCADE;
DROP TYPE IF EXISTS voucher_type CASCADE;
DROP TYPE IF EXISTS return_status CASCADE;

-- =====================================================
-- CUSTOM TYPES (ENUMS)
-- =====================================================

CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff', 'super_admin');
CREATE TYPE user_tier AS ENUM ('normal', 'silver', 'gold', 'platinum', 'vip');
CREATE TYPE account_type AS ENUM ('email', 'phone', 'oauth');
CREATE TYPE oauth_provider_enum AS ENUM ('google', 'facebook', 'apple', 'twitter');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived', 'out_of_stock');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'packing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded');
CREATE TYPE payment_method AS ENUM ('cod', 'vnpay', 'momo', 'zalopay', 'bank_transfer', 'credit_card', 'debit_card');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE shipment_status AS ENUM ('preparing', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'failed');
CREATE TYPE voucher_type AS ENUM ('percent', 'fixed', 'free_ship');
CREATE TYPE return_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'refunded', 'completed');

-- =====================================================
-- TABLE: users (Profile & Business Data)
-- =====================================================
-- This table stores user profile information, NOT authentication data
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    
    -- Profile Information
    full_name VARCHAR(100),
    display_name VARCHAR(50),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10), -- male, female, other, prefer_not_to_say
    
    -- Contact (can be nullable if using OAuth only)
    email VARCHAR(150),
    phone VARCHAR(15),
    
    -- Business Data
    role user_role DEFAULT 'customer' NOT NULL,
    tier user_tier DEFAULT 'normal' NOT NULL,
    loyalty_points INT DEFAULT 0 CHECK (loyalty_points >= 0),
    total_spent DECIMAL(15,2) DEFAULT 0 CHECK (total_spent >= 0),
    total_orders INT DEFAULT 0 CHECK (total_orders >= 0),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    
    -- Preferences
    preferred_language VARCHAR(5) DEFAULT 'vi',
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    
    -- Metadata
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMENT ON TABLE users IS 'User profile and business data (separated from authentication)';
COMMENT ON COLUMN users.loyalty_points IS 'Points earned from purchases for rewards';
COMMENT ON COLUMN users.tier IS 'Customer loyalty tier for special benefits';

-- =====================================================
-- TABLE: accounts (Authentication Data)
-- =====================================================
-- This table handles all authentication methods
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Account Type & Identifier
    account_type account_type NOT NULL,
    identifier VARCHAR(255) NOT NULL, -- email, phone, or oauth provider_user_id
    
    -- For email/phone authentication
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires_at TIMESTAMP,
    verified_at TIMESTAMP,
    
    -- Password Reset
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    
    -- OAuth specific (if account_type = 'oauth')
    oauth_provider oauth_provider_enum,
    oauth_provider_user_id VARCHAR(255),
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_token_expires_at TIMESTAMP,
    oauth_profile_data JSONB,
    
    -- Security
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(account_type, identifier),
    UNIQUE(oauth_provider, oauth_provider_user_id),
    CHECK (
        (account_type = 'oauth' AND oauth_provider IS NOT NULL AND oauth_provider_user_id IS NOT NULL) OR
        (account_type != 'oauth' AND password_hash IS NOT NULL)
    )
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_identifier ON accounts(identifier);
CREATE INDEX idx_accounts_oauth ON accounts(oauth_provider, oauth_provider_user_id) WHERE oauth_provider IS NOT NULL;
CREATE INDEX idx_accounts_verification_token ON accounts(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX idx_accounts_reset_token ON accounts(reset_token) WHERE reset_token IS NOT NULL;

COMMENT ON TABLE accounts IS 'Authentication credentials (email/phone/OAuth) - separated from user profile';
COMMENT ON COLUMN accounts.identifier IS 'Email, phone number, or OAuth provider user ID';
COMMENT ON COLUMN accounts.account_type IS 'Type of authentication: email, phone, or oauth';

-- =====================================================
-- TABLE: sessions (User Sessions)
-- =====================================================
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Session Data
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    
    -- Device Info
    device_name VARCHAR(200),
    device_type VARCHAR(50), -- mobile, tablet, desktop
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Session Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

COMMENT ON TABLE sessions IS 'Active user sessions with JWT/token management';

-- =====================================================
-- TABLE: oauth_providers (Deprecated - kept for reference)
-- =====================================================
-- Note: OAuth data is now stored directly in accounts table
-- This table can be used for additional OAuth metadata if needed
CREATE TABLE oauth_providers (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider oauth_provider_enum NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    name VARCHAR(100),
    avatar_url TEXT,
    raw_data JSONB,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_providers_account_id ON oauth_providers(account_id);

COMMENT ON TABLE oauth_providers IS 'Extended OAuth provider data (optional, main OAuth in accounts table)';

-- =====================================================
-- TABLE: addresses
-- =====================================================
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Recipient Info
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(15) NOT NULL,
    
    -- Address Components
    province VARCHAR(100) NOT NULL,
    province_code VARCHAR(10),
    district VARCHAR(100) NOT NULL,
    district_code VARCHAR(10),
    ward VARCHAR(100) NOT NULL,
    ward_code VARCHAR(10),
    street_address TEXT NOT NULL,
    
    -- Location (for mapping)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Metadata
    address_type VARCHAR(20) DEFAULT 'home', -- home, office, other
    label VARCHAR(50), -- "Nhà riêng", "Văn phòng công ty", etc.
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Additional
    note TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default);
CREATE INDEX idx_addresses_location ON addresses(latitude, longitude) WHERE latitude IS NOT NULL;

COMMENT ON TABLE addresses IS 'User shipping/billing addresses';

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Category Info
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    
    -- Media
    image_url TEXT,
    banner_url TEXT,
    icon VARCHAR(50),
    
    -- Display
    sort_order INT DEFAULT 0,
    level INT DEFAULT 0, -- 0 = root, 1 = child, 2 = grandchild
    path VARCHAR(500), -- Full path like "1/5/12" for hierarchical queries
    
    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(300),
    meta_keywords TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_path ON categories(path);

COMMENT ON TABLE categories IS 'Hierarchical product categories';
COMMENT ON COLUMN categories.path IS 'Materialized path for efficient tree queries';

-- =====================================================
-- TABLE: products
-- =====================================================
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE,
    
    -- Description
    short_description VARCHAR(500),
    description TEXT,
    
    -- Product Details
    brand VARCHAR(100),
    manufacturer VARCHAR(150),
    origin_country VARCHAR(100),
    material VARCHAR(200),
    style VARCHAR(100),
    season VARCHAR(50), -- Spring/Summer/Fall/Winter/All Season
    
    -- Care & Features
    care_instructions TEXT,
    features JSONB, -- Array of feature points
    
    -- Pricing
    base_price DECIMAL(12,2) NOT NULL CHECK (base_price >= 0),
    compare_at_price DECIMAL(12,2) CHECK (compare_at_price >= base_price),
    cost_price DECIMAL(12,2) CHECK (cost_price >= 0),
    
    -- Tax & Shipping
    tax_rate DECIMAL(5,2) DEFAULT 0,
    requires_shipping BOOLEAN DEFAULT TRUE,
    weight_grams INT,
    
    -- Stats
    view_count INT DEFAULT 0,
    sold_count INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0.0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    review_count INT DEFAULT 0,
    
    -- Status & Visibility
    status product_status DEFAULT 'draft' NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    
    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(300),
    meta_keywords TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_avg_rating ON products(avg_rating DESC);
CREATE INDEX idx_products_sold_count ON products(sold_count DESC);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_published_at ON products(published_at DESC) WHERE published_at IS NOT NULL;

COMMENT ON TABLE products IS 'Main product catalog';

-- =====================================================
-- TABLE: product_variants
-- =====================================================
CREATE TABLE product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Variant Attributes
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7),
    color_image_url TEXT,
    
    -- Pricing
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    sale_price DECIMAL(12,2) CHECK (sale_price >= 0 AND sale_price < price),
    cost_price DECIMAL(12,2) CHECK (cost_price >= 0),
    
    -- Inventory
    stock_qty INT DEFAULT 0 CHECK (stock_qty >= 0),
    reserved_qty INT DEFAULT 0 CHECK (reserved_qty >= 0),
    sold_qty INT DEFAULT 0 CHECK (sold_qty >= 0),
    low_stock_threshold INT DEFAULT 5,
    
    -- Physical Properties
    weight_grams INT,
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    
    -- Media
    image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, size, color)
);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_barcode ON product_variants(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_variants_stock ON product_variants(stock_qty);
CREATE INDEX idx_variants_active ON product_variants(is_active);
CREATE INDEX idx_variants_is_default ON product_variants(product_id, is_default);

COMMENT ON TABLE product_variants IS 'Product variations by size and color with inventory tracking';

-- =====================================================
-- TABLE: product_images
-- =====================================================
CREATE TABLE product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE,
    
    -- Image Data
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(200),
    
    -- Classification
    image_type VARCHAR(20) DEFAULT 'gallery', -- gallery, thumbnail, lifestyle, detail
    
    -- Display
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_product_id ON product_images(product_id);
CREATE INDEX idx_images_variant_id ON product_images(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_images_is_primary ON product_images(product_id, is_primary);
CREATE INDEX idx_images_sort_order ON product_images(product_id, sort_order);

COMMENT ON TABLE product_images IS 'Product and variant images';

-- =====================================================
-- TABLE: vouchers
-- =====================================================
CREATE TABLE vouchers (
    id BIGSERIAL PRIMARY KEY,
    
    -- Voucher Info
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    
    -- Discount Config
    type voucher_type NOT NULL,
    value DECIMAL(12,2) NOT NULL CHECK (value > 0),
    
    -- Conditions
    min_order_value DECIMAL(12,2) DEFAULT 0,
    max_discount_amount DECIMAL(12,2),
    applicable_categories INT[], -- Array of category IDs
    applicable_products BIGINT[], -- Array of product IDs
    
    -- Usage Limits
    usage_limit INT, -- Total usage limit
    usage_limit_per_user INT DEFAULT 1,
    used_count INT DEFAULT 0 CHECK (used_count >= 0),
    
    -- Customer Restrictions
    min_customer_tier user_tier DEFAULT 'normal',
    new_customers_only BOOLEAN DEFAULT FALSE,
    
    -- Validity Period
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (end_date > start_date),
    CHECK (usage_limit IS NULL OR usage_limit > 0)
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_active ON vouchers(is_active);
CREATE INDEX idx_vouchers_dates ON vouchers(start_date, end_date);
CREATE INDEX idx_vouchers_type ON vouchers(type);

COMMENT ON TABLE vouchers IS 'Discount vouchers and promotional codes';

-- =====================================================
-- TABLE: orders
-- =====================================================
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    
    -- Order Identification
    order_code VARCHAR(20) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    voucher_id BIGINT REFERENCES vouchers(id) ON DELETE SET NULL,
    
    -- Status
    status order_status DEFAULT 'pending' NOT NULL,
    
    -- Pricing Breakdown
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    shipping_fee DECIMAL(12,2) DEFAULT 0 CHECK (shipping_fee >= 0),
    tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    
    -- Points & Rewards
    points_earned INT DEFAULT 0,
    points_used INT DEFAULT 0,
    points_value DECIMAL(12,2) DEFAULT 0,
    
    -- Shipping Address
    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(15) NOT NULL,
    shipping_email VARCHAR(150),
    shipping_province VARCHAR(100) NOT NULL,
    shipping_district VARCHAR(100) NOT NULL,
    shipping_ward VARCHAR(100) NOT NULL,
    shipping_street TEXT NOT NULL,
    shipping_note TEXT,
    
    -- Billing Address (if different)
    billing_address JSONB,
    
    -- Customer Notes
    customer_note TEXT,
    admin_note TEXT,
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20), -- customer, admin, system
    
    -- Timestamps
    confirmed_at TIMESTAMP,
    packed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_code ON orders(order_code);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_total ON orders(total DESC);
CREATE INDEX idx_orders_voucher_id ON orders(voucher_id) WHERE voucher_id IS NOT NULL;

COMMENT ON TABLE orders IS 'Customer orders';

-- =====================================================
-- TABLE: order_items
-- =====================================================
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    
    -- Product Snapshot (at time of purchase)
    product_name VARCHAR(255) NOT NULL,
    product_slug VARCHAR(300) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    image_url TEXT,
    
    -- Pricing
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
    
    -- Discount (item-level)
    discount_amount DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

COMMENT ON TABLE order_items IS 'Line items in orders with product snapshots';

-- =====================================================
-- TABLE: payments
-- =====================================================
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Payment Info
    method payment_method NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    
    -- Transaction Details
    transaction_id VARCHAR(255) UNIQUE,
    gateway_order_id VARCHAR(255),
    
    -- Gateway Response
    gateway_response JSONB,
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Refund Info
    refund_amount DECIMAL(12,2) DEFAULT 0 CHECK (refund_amount >= 0),
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    
    -- Timestamps
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);

COMMENT ON TABLE payments IS 'Payment transactions';

-- =====================================================
-- TABLE: shipments
-- =====================================================
CREATE TABLE shipments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Carrier Info
    carrier VARCHAR(50) NOT NULL, -- GHTK, GHN, Viettel Post, etc.
    carrier_service VARCHAR(100),
    tracking_code VARCHAR(100) UNIQUE,
    
    -- Status
    status shipment_status DEFAULT 'preparing' NOT NULL,
    
    -- Shipping Details
    shipping_address JSONB NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Package Info
    weight_grams INT,
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    
    -- Costs
    shipping_fee DECIMAL(12,2),
    cod_amount DECIMAL(12,2), -- Cash on delivery amount
    insurance_fee DECIMAL(12,2) DEFAULT 0,
    
    -- Additional Info
    note TEXT,
    return_note TEXT,
    
    -- Events
    picked_up_at TIMESTAMP,
    in_transit_at TIMESTAMP,
    out_for_delivery_at TIMESTAMP,
    delivered_at TIMESTAMP,
    returned_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_code ON shipments(tracking_code) WHERE tracking_code IS NOT NULL;
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_carrier ON shipments(carrier);

COMMENT ON TABLE shipments IS 'Shipment tracking and delivery management';

-- =====================================================
-- TABLE: reviews
-- =====================================================
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_item_id BIGINT REFERENCES order_items(id) ON DELETE SET NULL,
    variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
    
    -- Rating & Content
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    
    -- Media
    images JSONB,
    videos JSONB,
    
    -- Detailed Ratings (optional)
    quality_rating SMALLINT CHECK (quality_rating >= 1 AND quality_rating <= 5),
    fit_rating SMALLINT CHECK (fit_rating >= 1 AND fit_rating <= 5),
    value_rating SMALLINT CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Verification & Moderation
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    
    -- Admin Response
    admin_reply TEXT,
    admin_replied_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    replied_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, order_item_id)
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_variant_id ON reviews(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_helpful ON reviews(helpful_count DESC);

COMMENT ON TABLE reviews IS 'Product reviews and ratings';

-- =====================================================
-- TABLE: carts
-- =====================================================
CREATE TABLE carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE,
    
    -- Cart Metadata
    merged_from_session VARCHAR(100), -- Track if guest cart was merged
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_carts_user_id ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session_id ON carts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_carts_expires_at ON carts(expires_at);

COMMENT ON TABLE carts IS 'Shopping carts for authenticated users and guest sessions';

-- =====================================================
-- TABLE: cart_items
-- =====================================================
CREATE TABLE cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    
    quantity INT NOT NULL CHECK (quantity > 0),
    
    -- Price snapshot (to detect price changes)
    added_price DECIMAL(12,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(cart_id, variant_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_variant_id ON cart_items(variant_id);

COMMENT ON TABLE cart_items IS 'Items in shopping carts';

-- =====================================================
-- TABLE: return_requests
-- =====================================================
CREATE TABLE return_requests (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Return Items (which order items to return)
    return_items JSONB NOT NULL, -- [{order_item_id, quantity, reason}]
    
    -- Reason
    reason_category VARCHAR(50) NOT NULL, -- defective, wrong_item, not_as_described, changed_mind
    reason_detail TEXT NOT NULL,
    
    -- Evidence
    images JSONB,
    videos JSONB,
    
    -- Status
    status return_status DEFAULT 'pending' NOT NULL,
    
    -- Processing
    refund_amount DECIMAL(12,2) CHECK (refund_amount >= 0),
    refund_method payment_method,
    restock_items BOOLEAN DEFAULT TRUE,
    
    -- Admin Actions
    admin_note TEXT,
    processed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Return Shipping
    return_tracking_code VARCHAR(100),
    return_carrier VARCHAR(50),
    
    -- Timestamps
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    refunded_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX idx_return_requests_status ON return_requests(status);
CREATE INDEX idx_return_requests_created_at ON return_requests(created_at DESC);

COMMENT ON TABLE return_requests IS 'Product return and refund requests';

-- =====================================================
-- TABLE: voucher_usage
-- =====================================================
CREATE TABLE voucher_usage (
    id BIGSERIAL PRIMARY KEY,
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    discount_amount DECIMAL(12,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(voucher_id, order_id)
);

CREATE INDEX idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
CREATE INDEX idx_voucher_usage_user_id ON voucher_usage(user_id);
CREATE INDEX idx_voucher_usage_order_id ON voucher_usage(order_id);

COMMENT ON TABLE voucher_usage IS 'Voucher usage history and tracking';

-- =====================================================
-- TRIGGERS: Updated_at auto-update
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_updated_at 
                       BEFORE UPDATE ON %I 
                       FOR EACH ROW 
                       EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- =====================================================
-- TRIGGERS: Business Logic
-- =====================================================

-- Update product rating when review is added/updated
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET 
        avg_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
            FROM reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) 
            AND is_approved = TRUE
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) 
            AND is_approved = TRUE
        )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_rating
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();

-- Check stock before adding to order
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INT;
BEGIN
    SELECT (stock_qty - reserved_qty) INTO available_stock
    FROM product_variants
    WHERE id = NEW.variant_id;
    
    IF available_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant %. Available: %, Requested: %',
            NEW.variant_id, available_stock, NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_stock
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_availability();

-- Reserve stock when order created
CREATE OR REPLACE FUNCTION reserve_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE product_variants pv
    SET reserved_qty = pv.reserved_qty + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reserve_stock
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION reserve_stock();

-- Update stock on order status change
CREATE OR REPLACE FUNCTION update_stock_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Completed: reserve → sold, decrease stock
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE product_variants pv
        SET 
            reserved_qty = pv.reserved_qty - oi.quantity,
            sold_qty = pv.sold_qty + oi.quantity,
            stock_qty = pv.stock_qty - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;
        
        UPDATE products p
        SET sold_count = p.sold_count + (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN product_variants pv ON pv.id = oi.variant_id
            WHERE oi.order_id = NEW.id AND pv.product_id = p.id
        )
        WHERE id IN (
            SELECT DISTINCT pv.product_id
            FROM order_items oi
            JOIN product_variants pv ON pv.id = oi.variant_id
            WHERE oi.order_id = NEW.id
        );
        
        -- Award loyalty points
        UPDATE users
        SET 
            loyalty_points = loyalty_points + NEW.points_earned,
            total_spent = total_spent + NEW.total,
            total_orders = total_orders + 1
        WHERE id = NEW.user_id;
    END IF;
    
    -- Cancelled: release reserved stock
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE product_variants pv
        SET reserved_qty = pv.reserved_qty - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_stock_on_status_change();

-- Increment voucher usage
CREATE OR REPLACE FUNCTION increment_voucher_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.voucher_id IS NOT NULL THEN
        UPDATE vouchers
        SET used_count = used_count + 1
        WHERE id = NEW.voucher_id;
        
        INSERT INTO voucher_usage (voucher_id, user_id, order_id, discount_amount)
        VALUES (NEW.voucher_id, NEW.user_id, NEW.id, NEW.discount_amount);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_voucher_usage
    AFTER INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.voucher_id IS NOT NULL)
    EXECUTE FUNCTION increment_voucher_usage();

-- Ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_one_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE addresses
        SET is_default = FALSE
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_one_default_address
    BEFORE INSERT OR UPDATE ON addresses
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION ensure_one_default_address();

-- =====================================================
-- VIEWS
-- =====================================================

-- User with primary account info
CREATE OR REPLACE VIEW v_users_with_accounts AS
SELECT 
    u.*,
    json_agg(
        json_build_object(
            'account_id', a.id,
            'account_type', a.account_type,
            'identifier', a.identifier,
            'is_verified', a.is_verified,
            'oauth_provider', a.oauth_provider,
            'last_login_at', a.last_login_at
        )
    ) as accounts
FROM users u
LEFT JOIN accounts a ON a.user_id = u.id
GROUP BY u.id;

-- Product catalog with variants
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT 
    p.*,
    c.name AS category_name,
    c.slug AS category_slug,
    c.path AS category_path,
    (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image,
    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id AND is_active = TRUE) AS variant_count,
    (SELECT MIN(price) FROM product_variants WHERE product_id = p.id AND is_active = TRUE) AS min_price,
    (SELECT MAX(price) FROM product_variants WHERE product_id = p.id AND is_active = TRUE) AS max_price,
    (SELECT SUM(stock_qty) FROM product_variants WHERE product_id = p.id AND is_active = TRUE) AS total_stock
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active';

-- Order summary
CREATE OR REPLACE VIEW v_order_summary AS
SELECT 
    o.*,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    u.tier AS customer_tier,
    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
    (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS total_quantity,
    p.status AS payment_status,
    p.method AS payment_method,
    p.paid_at,
    s.carrier,
    s.tracking_code,
    s.status AS shipment_status,
    s.estimated_delivery_date
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN shipments s ON s.order_id = o.id;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Sample users
INSERT INTO users (full_name, email, phone, role, is_verified) VALUES
    ('Super Admin', 'admin@fashionstore.vn', '0901234567', 'super_admin', TRUE),
    ('Nguyễn Văn A', 'nguyenvana@gmail.com', '0912345678', 'customer', TRUE),
    ('Trần Thị B', 'tranthib@gmail.com', '0923456789', 'customer', TRUE);

-- Sample accounts for users
INSERT INTO accounts (user_id, account_type, identifier, password_hash, is_verified) VALUES
    (1, 'email', 'admin@fashionstore.vn', '$2b$10$example_hash_1', TRUE),
    (2, 'email', 'nguyenvana@gmail.com', '$2b$10$example_hash_2', TRUE),
    (3, 'phone', '0923456789', '$2b$10$example_hash_3', TRUE);

-- Sample categories
INSERT INTO categories (name, slug, level, path, is_active) VALUES
    ('Nam', 'nam', 0, '1', TRUE),
    ('Nữ', 'nu', 0, '2', TRUE),
    ('Trẻ em', 'tre-em', 0, '3', TRUE),
    ('Phụ kiện', 'phu-kien', 0, '4', TRUE);

INSERT INTO categories (parent_id, name, slug, level, path, is_active) VALUES
    (1, 'Áo thun nam', 'ao-thun-nam', 1, '1/5', TRUE),
    (1, 'Áo sơ mi nam', 'ao-so-mi-nam', 1, '1/6', TRUE),
    (1, 'Quần jean nam', 'quan-jean-nam', 1, '1/7', TRUE),
    (2, 'Áo thun nữ', 'ao-thun-nu', 1, '2/8', TRUE),
    (2, 'Váy', 'vay', 1, '2/9', TRUE),
    (2, 'Quần jean nữ', 'quan-jean-nu', 1, '2/10', TRUE);

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Fashion Store Database Schema Created!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Architecture: Separated Users & Accounts';
    RAISE NOTICE '------------------------------------------------';
    RAISE NOTICE 'Core Tables:';
    RAISE NOTICE '  - users (profile data)';
    RAISE NOTICE '  - accounts (authentication)';
    RAISE NOTICE '  - sessions (active sessions)';
    RAISE NOTICE '------------------------------------------------';
    RAISE NOTICE 'Total Tables: 19';
    RAISE NOTICE 'Total Views: 3';
    RAISE NOTICE 'Total Functions: 7';
    RAISE NOTICE 'Total Triggers: 25+';
    RAISE NOTICE '================================================';
END $$;
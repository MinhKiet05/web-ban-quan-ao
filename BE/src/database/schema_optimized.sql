-- =====================================================
-- FASHION STORE DATABASE SCHEMA - OPTIMIZED & CLEAN
-- =====================================================
-- Created: 2026-04-24
-- Version: 2.0 - Refactored for Learning
-- Improvements:
--   - Removed oauth_providers table (merged into accounts)
--   - Removed product_variants.image_url (single source: product_images)
--   - Fixed duplicate indexes
--   - Added comprehensive views
--   - Optimized queries
-- =====================================================

-- =====================================================
-- DROP EXISTING OBJECTS
-- =====================================================
DROP TABLE IF EXISTS return_requests CASCADE;
DROP TABLE IF EXISTS voucher_usage CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
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
CREATE TYPE account_type AS ENUM ('email', 'phone', 'oauth_google', 'oauth_facebook', 'oauth_apple');
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
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10),
    email VARCHAR(150),
    phone VARCHAR(15),
    country VARCHAR(100),
    state VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    role user_role DEFAULT 'customer' NOT NULL,
    tier user_tier DEFAULT 'normal' NOT NULL,
    loyalty_points INT DEFAULT 0 CHECK (loyalty_points >= 0),
    total_spent DECIMAL(15,2) DEFAULT 0 CHECK (total_spent >= 0),
    total_orders INT DEFAULT 0 CHECK (total_orders >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tier ON users(tier);

-- =====================================================
-- TABLE: accounts (Authentication - CONSOLIDATED)
-- =====================================================
-- Consolidation: OAuth data now stored directly here (no separate oauth_providers table)
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_type account_type NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires_at TIMESTAMP,
    verified_at TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    
    -- OAuth data (consolidated from old oauth_providers table)
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    oauth_provider_data JSONB, -- {name, email, avatar_url, raw_data}
    
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(account_type, identifier)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_identifier ON accounts(identifier);

-- =====================================================
-- TABLE: sessions (User Sessions)
-- =====================================================
CREATE TABLE sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    device_type VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =====================================================
-- TABLE: addresses
-- =====================================================
CREATE TABLE addresses (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(15) NOT NULL,
    province VARCHAR(100) NOT NULL,
    province_code VARCHAR(10),
    district VARCHAR(100) NOT NULL,
    district_code VARCHAR(10),
    ward VARCHAR(100) NOT NULL,
    ward_code VARCHAR(10),
    street_address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address_type VARCHAR(20) DEFAULT 'home',
    label VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default);

-- =====================================================
-- TABLE: categories
-- =====================================================
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    parent_id VARCHAR(50) REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    banner_url TEXT,
    icon VARCHAR(50),
    sort_order INT DEFAULT 0,
    level INT DEFAULT 0,
    path VARCHAR(500),
    meta_title VARCHAR(200),
    meta_description VARCHAR(300),
    meta_keywords TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- =====================================================
-- TABLE: products
-- =====================================================
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(300) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE,
    short_description VARCHAR(500),
    description TEXT,
    brand VARCHAR(100),
    base_price DECIMAL(12,2) NOT NULL CHECK (base_price >= 0),
    original_price DECIMAL(12,2),
    is_sale BOOLEAN DEFAULT FALSE,
    discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    requires_shipping BOOLEAN DEFAULT TRUE,
    weight_grams INT,
    view_count INT DEFAULT 0,
    sold_count INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0.0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    review_count INT DEFAULT 0,
    status product_status DEFAULT 'draft' NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
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
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_avg_rating ON products(avg_rating DESC);
CREATE INDEX idx_products_sold_count ON products(sold_count DESC);
CREATE INDEX idx_products_is_sale ON products(is_sale);

-- =====================================================
-- TABLE: product_variants (CLEANED UP)
-- =====================================================
-- Removed: image_url (use product_images table instead)
CREATE TABLE product_variants (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    sale_price DECIMAL(12,2) CHECK (sale_price >= 0 AND sale_price < price),
    stock_qty INT DEFAULT 0 CHECK (stock_qty >= 0),
    reserved_qty INT DEFAULT 0 CHECK (reserved_qty >= 0),
    sold_qty INT DEFAULT 0 CHECK (sold_qty >= 0),
    low_stock_threshold INT DEFAULT 5,
    weight_grams INT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, size, color)
);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_stock ON product_variants(stock_qty);
CREATE INDEX idx_variants_active ON product_variants(is_active);

-- =====================================================
-- TABLE: product_images (SINGLE SOURCE OF TRUTH)
-- =====================================================
CREATE TABLE product_images (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id VARCHAR(50) REFERENCES product_variants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(200),
    image_type VARCHAR(20) DEFAULT 'gallery',
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_product_id ON product_images(product_id);
CREATE INDEX idx_images_variant_id ON product_images(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX idx_images_is_primary ON product_images(product_id, is_primary);

-- =====================================================
-- TABLE: vouchers
-- =====================================================
CREATE TABLE vouchers (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    type voucher_type NOT NULL,
    value DECIMAL(12,2) NOT NULL CHECK (value > 0),
    min_order_value DECIMAL(12,2) DEFAULT 0,
    max_discount_amount DECIMAL(12,2),
    applicable_categories VARCHAR(50)[],
    applicable_products VARCHAR(50)[],
    usage_limit INT,
    usage_limit_per_user INT DEFAULT 1,
    used_count INT DEFAULT 0 CHECK (used_count >= 0),
    min_customer_tier user_tier DEFAULT 'normal',
    new_customers_only BOOLEAN DEFAULT FALSE,
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

-- =====================================================
-- TABLE: orders
-- =====================================================
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    order_code VARCHAR(20) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    voucher_id VARCHAR(50) REFERENCES vouchers(id) ON DELETE SET NULL,
    status order_status DEFAULT 'pending' NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    shipping_fee DECIMAL(12,2) DEFAULT 0 CHECK (shipping_fee >= 0),
    tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
    points_earned INT DEFAULT 0,
    points_used INT DEFAULT 0,
    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(15) NOT NULL,
    shipping_email VARCHAR(150),
    shipping_province VARCHAR(100) NOT NULL,
    shipping_district VARCHAR(100) NOT NULL,
    shipping_ward VARCHAR(100) NOT NULL,
    shipping_street TEXT NOT NULL,
    shipping_note TEXT,
    customer_note TEXT,
    admin_note TEXT,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20),
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

-- =====================================================
-- TABLE: order_items
-- =====================================================
CREATE TABLE order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id VARCHAR(50) NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    product_slug VARCHAR(300) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    image_url TEXT,
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);

-- =====================================================
-- TABLE: payments
-- =====================================================
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method payment_method NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    transaction_id VARCHAR(255) UNIQUE,
    gateway_order_id VARCHAR(255),
    gateway_response JSONB,
    error_code VARCHAR(50),
    error_message TEXT,
    refund_amount DECIMAL(12,2) DEFAULT 0 CHECK (refund_amount >= 0),
    refund_reason TEXT,
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);

-- =====================================================
-- TABLE: shipments
-- =====================================================
CREATE TABLE shipments (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier VARCHAR(50) NOT NULL,
    carrier_service VARCHAR(100),
    tracking_code VARCHAR(100) UNIQUE,
    status shipment_status DEFAULT 'preparing' NOT NULL,
    shipping_address JSONB NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    weight_grams INT,
    shipping_fee DECIMAL(12,2),
    cod_amount DECIMAL(12,2),
    note TEXT,
    return_note TEXT,
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

-- =====================================================
-- TABLE: reviews
-- =====================================================
CREATE TABLE reviews (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_item_id VARCHAR(50) REFERENCES order_items(id) ON DELETE SET NULL,
    variant_id VARCHAR(50) REFERENCES product_variants(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    images JSONB,
    videos JSONB,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    unhelpful_count INT DEFAULT 0,
    admin_reply TEXT,
    admin_replied_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, order_item_id)
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- =====================================================
-- TABLE: carts
-- =====================================================
CREATE TABLE carts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE,
    merged_from_session VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_carts_user_id ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session_id ON carts(session_id) WHERE session_id IS NOT NULL;

-- =====================================================
-- TABLE: cart_items
-- =====================================================
CREATE TABLE cart_items (
    id VARCHAR(50) PRIMARY KEY,
    cart_id VARCHAR(50) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id VARCHAR(50) NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    added_price DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, variant_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- =====================================================
-- TABLE: return_requests
-- =====================================================
CREATE TABLE return_requests (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    return_items JSONB NOT NULL,
    reason_category VARCHAR(50) NOT NULL,
    reason_detail TEXT NOT NULL,
    images JSONB,
    videos JSONB,
    status return_status DEFAULT 'pending' NOT NULL,
    refund_amount DECIMAL(12,2) CHECK (refund_amount >= 0),
    refund_method payment_method,
    restock_items BOOLEAN DEFAULT TRUE,
    admin_note TEXT,
    processed_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    return_tracking_code VARCHAR(100),
    return_carrier VARCHAR(50),
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

-- =====================================================
-- TABLE: voucher_usage
-- =====================================================
CREATE TABLE voucher_usage (
    id VARCHAR(50) PRIMARY KEY,
    voucher_id VARCHAR(50) NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(12,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(voucher_id, order_id)
);

CREATE INDEX idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
CREATE INDEX idx_voucher_usage_user_id ON voucher_usage(user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at 
                       BEFORE UPDATE ON %I 
                       FOR EACH ROW 
                       EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- Update product rating
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

-- Check stock
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER AS $$
DECLARE
    available_stock INT;
BEGIN
    SELECT (stock_qty - reserved_qty) INTO available_stock
    FROM product_variants
    WHERE id = NEW.variant_id;
    
    IF available_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %', available_stock;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_stock
    BEFORE INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION check_stock_availability();

-- Reserve stock on order create
CREATE OR REPLACE FUNCTION reserve_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE product_variants pv
    SET reserved_qty = reserved_qty + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reserve_stock
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION reserve_stock();

-- Update stock on order completion
CREATE OR REPLACE FUNCTION update_stock_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE product_variants pv
        SET 
            reserved_qty = reserved_qty - oi.quantity,
            sold_qty = sold_qty + oi.quantity,
            stock_qty = stock_qty - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id AND pv.id = oi.variant_id;
        
        UPDATE products p
        SET sold_count = sold_count + (
            SELECT COALESCE(SUM(oi.quantity), 0)
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
        
        UPDATE users
        SET 
            loyalty_points = loyalty_points + COALESCE(NEW.points_earned, 0),
            total_spent = total_spent + NEW.total,
            total_orders = total_orders + 1
        WHERE id = NEW.user_id;
    END IF;
    
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE product_variants pv
        SET reserved_qty = reserved_qty - oi.quantity
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
        UPDATE vouchers SET used_count = used_count + 1 WHERE id = NEW.voucher_id;
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

-- One default address per user
CREATE OR REPLACE FUNCTION ensure_one_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE addresses SET is_default = FALSE
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
-- VIEWS - COMPREHENSIVE PRODUCT QUERIES
-- =====================================================

-- Product with images & basic info
CREATE OR REPLACE VIEW v_product_with_images AS
SELECT 
    p.id,
    p.name,
    p.slug,
    p.sku,
    p.brand,
    p.base_price,
    p.original_price,
    p.is_sale,
    p.discount_percent,
    p.short_description,
    p.avg_rating,
    p.review_count,
    p.sold_count,
    c.name AS category_name,
    c.slug AS category_slug,
    p.created_at,
    (SELECT jsonb_agg(
        jsonb_build_object(
            'id', pi.id,
            'url', pi.url,
            'thumbnail_url', pi.thumbnail_url,
            'is_primary', pi.is_primary,
            'sort_order', pi.sort_order
        ) ORDER BY pi.is_primary DESC, pi.sort_order ASC
    ) FROM product_images pi WHERE pi.product_id = p.id AND pi.variant_id IS NULL)
    AS product_images
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active';

-- Product variants with images
CREATE OR REPLACE VIEW v_variant_with_images AS
SELECT 
    pv.id,
    pv.product_id,
    pv.sku,
    pv.size,
    pv.color,
    pv.price,
    pv.sale_price,
    pv.stock_qty,
    pv.is_active,
    pv.is_default,
    (SELECT jsonb_agg(
        jsonb_build_object(
            'id', pi.id,
            'url', pi.url,
            'thumbnail_url', pi.thumbnail_url,
            'alt_text', pi.alt_text
        ) ORDER BY pi.sort_order ASC
    ) FROM product_images pi WHERE pi.variant_id = pv.id)
    AS images
FROM product_variants pv
WHERE pv.is_active = TRUE;

-- Product detail (everything in one query!)
CREATE OR REPLACE VIEW v_product_detail AS
SELECT 
    p.id,
    p.name,
    p.slug,
    p.sku,
    p.brand,
    p.base_price,
    p.original_price,
    p.is_sale,
    p.discount_percent,
    p.description,
    p.short_description,
    p.avg_rating,
    p.review_count,
    p.sold_count,
    p.is_featured,
    p.is_new,
    p.is_bestseller,
    c.id AS category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id AND is_active = TRUE)
    AS variant_count,
    (SELECT jsonb_agg(
        jsonb_build_object(
            'id', pi.id,
            'url', pi.url,
            'thumbnail_url', pi.thumbnail_url,
            'is_primary', pi.is_primary,
            'sort_order', pi.sort_order
        ) ORDER BY pi.is_primary DESC, pi.sort_order ASC
    ) FROM product_images pi WHERE pi.product_id = p.id AND pi.variant_id IS NULL)
    AS product_images,
    (SELECT jsonb_agg(
        jsonb_build_object(
            'id', pv.id,
            'sku', pv.sku,
            'size', pv.size,
            'color', pv.color,
            'price', pv.price,
            'sale_price', pv.sale_price,
            'stock_qty', pv.stock_qty,
            'is_active', pv.is_active,
            'is_default', pv.is_default,
            'images', COALESCE((SELECT jsonb_agg(
                jsonb_build_object('id', pi.id, 'url', pi.url, 'thumbnail_url', pi.thumbnail_url)
                ORDER BY pi.sort_order ASC
            ) FROM product_images pi WHERE pi.variant_id = pv.id), '[]'::jsonb)
        ) ORDER BY pv.is_default DESC, pv.created_at ASC
    ) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = TRUE)
    AS variants
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active';

-- User with accounts info
CREATE OR REPLACE VIEW v_user_with_accounts AS
SELECT 
    u.*,
    json_agg(
        json_build_object(
            'id', a.id,
            'account_type', a.account_type,
            'identifier', a.identifier,
            'is_verified', a.is_verified,
            'last_login_at', a.last_login_at
        )
    ) FILTER (WHERE a.id IS NOT NULL) as accounts
FROM users u
LEFT JOIN accounts a ON a.user_id = u.id
GROUP BY u.id;

-- Order summary
CREATE OR REPLACE VIEW v_order_summary AS
SELECT 
    o.id,
    o.order_code,
    o.status,
    o.total,
    o.subtotal,
    o.discount_amount,
    o.shipping_fee,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
    (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS total_quantity,
    p.status AS payment_status,
    p.method AS payment_method,
    p.paid_at,
    s.carrier,
    s.tracking_code,
    s.status AS shipment_status,
    s.estimated_delivery_date,
    o.created_at,
    o.updated_at
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN payments p ON p.order_id = o.id
LEFT JOIN shipments s ON s.order_id = o.id;



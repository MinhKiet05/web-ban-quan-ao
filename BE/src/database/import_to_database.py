"""
Script import dữ liệu sản phẩm từ JSON vào PostgreSQL database
Import theo thứ tự: categories -> products -> product_variants -> product_images
"""

import json
import sys
import os
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import execute_batch
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Thiếu thư viện: {e}")
    print("Cài đặt: pip install psycopg2-binary python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv('./BE/.env')

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'fashion_store'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

class DatabaseImporter:
    def __init__(self, json_file='products_data.json', clear_existing=False):
        self.json_file = json_file
        self.clear_existing = clear_existing
        self.data = None
        self.conn = None
        self.cursor = None
        
        # Statistics
        self.stats = {
            'categories_inserted': 0,
            'products_inserted': 0,
            'variants_inserted': 0,
            'images_inserted': 0,
            'categories_skipped': 0,
            'products_skipped': 0,
            'variants_skipped': 0,
            'images_skipped': 0
        }
    
    def load_json(self):
        """Load dữ liệu từ file JSON"""
        print(f"📂 Đang đọc file: {self.json_file}")
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            
            print(f"✅ Đã load thành công:")
            print(f"   • Categories: {len(self.data.get('categories', []))}")
            print(f"   • Products: {len(self.data.get('products', []))}")
            print(f"   • Variants: {len(self.data.get('product_variants', []))}")
            print(f"   • Images: {len(self.data.get('product_images', []))}")
            print()
            return True
        except Exception as e:
            print(f"❌ Lỗi đọc file: {e}")
            return False
    
    def connect_db(self):
        """Kết nối PostgreSQL"""
        print("🔌 Kết nối database...")
        try:
            self.conn = psycopg2.connect(**DB_CONFIG)
            self.cursor = self.conn.cursor()
            
            # Test connection
            self.cursor.execute("SELECT version();")
            version = self.cursor.fetchone()[0]
            print(f"✅ Đã kết nối PostgreSQL")
            print(f"   Database: {DB_CONFIG['database']}")
            print(f"   Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
            print()
            return True
        except Exception as e:
            print(f"❌ Lỗi kết nối database: {e}")
            print("\n💡 Kiểm tra:")
            print("   1. PostgreSQL đã chạy chưa?")
            print("   2. File .env có đúng thông tin database?")
            print("   3. Database đã được tạo chưa?")
            return False
    
    def clear_product_data(self):
        """Xóa dữ liệu sản phẩm cũ (và orders liên quan)"""
        print("🗑️  Xóa dữ liệu cũ...")
        
        try:
            # Xóa theo thứ tự: từ bảng con đến bảng cha
            # Xóa cả orders để tránh foreign key constraint
            tables_to_clear = [
                'return_requests',
                'cart_items',
                'reviews',
                'shipments',
                'payments',
                'order_items',
                'orders',
                'voucher_usage',
                'product_images',
                'product_variants',
                'products',
                'categories'
            ]
            
            for table in tables_to_clear:
                try:
                    self.cursor.execute(f"DELETE FROM {table};")
                    deleted = self.cursor.rowcount
                    if deleted > 0:
                        print(f"   ✓ Đã xóa {deleted} records từ {table}")
                except Exception as e:
                    # Bỏ qua nếu table không tồn tại
                    if 'does not exist' not in str(e):
                        print(f"   ⚠️  Lỗi xóa {table}: {str(e)[:50]}...")
            
            self.conn.commit()
            print("✅ Đã xóa dữ liệu cũ\n")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi xóa dữ liệu: {e}")
            self.conn.rollback()
            return False
    
    def import_categories(self):
        """Import categories vào database"""
        print("📦 Import categories...")
        categories = self.data.get('categories', [])
        
        if not categories:
            print("⚠️  Không có categories để import")
            return True
        
        insert_query = """
            INSERT INTO categories (
                id, parent_id, name, slug, description, 
                sort_order, level, is_active, is_featured,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO NOTHING;
        """
        
        try:
            for idx, cat in enumerate(categories, 1):
                try:
                    values = (
                        cat['id'],
                        cat.get('parent_id'),
                        cat['name'],
                        cat['slug'],
                        cat.get('description', ''),
                        cat.get('sort_order', idx),
                        cat.get('level', 0),
                        cat.get('is_active', True),
                        cat.get('is_featured', False)
                    )
                    
                    self.cursor.execute(insert_query, values)
                    self.conn.commit()  # Commit ngay để tránh transaction aborted
                    
                    if self.cursor.rowcount > 0:
                        self.stats['categories_inserted'] += 1
                    else:
                        self.stats['categories_skipped'] += 1
                    
                    # Progress log
                    if idx % 20 == 0:
                        print(f"   ⏳ {idx}/{len(categories)} categories...", end='\r')
                    
                except Exception as e:
                    # Rollback transaction bị lỗi và tiếp tục
                    self.conn.rollback()
                    self.stats['categories_skipped'] += 1
                    if idx <= 3:  # Log 3 lỗi đầu
                        print(f"\n   ⚠️  Bỏ qua category {cat.get('name', 'unknown')}: {str(e)[:50]}")
                    continue
            print(f"   ✅ {self.stats['categories_inserted']}/{len(categories)} categories imported     ")
            return True
            
        except Exception as e:
            print(f"\n❌ Lỗi import categories: {e}")
            self.conn.rollback()
            return False
    
    def import_products(self):
        """Import products vào database"""
        print("👕 Import products...")
        products = self.data.get('products', [])
        
        if not products:
            print("⚠️  Không có products để import")
            return True
        
        insert_query = """
            INSERT INTO products (
                id, category_id, name, slug, sku,
                short_description, description, brand,
                base_price, requires_shipping,
                view_count, sold_count, avg_rating, review_count,
                status, is_featured, is_new, is_bestseller,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s::product_status, %s, %s, %s,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO NOTHING;
        """
        
        try:
            for idx, prod in enumerate(products, 1):
                try:
                    values = (
                        prod['id'],
                        prod['category_id'],
                        prod['name'],
                        prod['slug'],
                        prod.get('sku', f"SKU-{prod['id'][-8:]}"),
                        prod.get('short_description', prod['name'][:200]),
                        prod.get('description', ''),
                        prod.get('brand', 'Unknown'),
                        prod.get('base_price', 0),
                        prod.get('requires_shipping', True),
                        0,  # view_count
                        0,  # sold_count
                        0.0,  # avg_rating
                        0,  # review_count
                        prod.get('status', 'active'),
                        prod.get('is_featured', False),
                        prod.get('is_new', False),
                        prod.get('is_bestseller', False)
                    )
                    
                    self.cursor.execute(insert_query, values)
                    self.conn.commit()  # Commit ngay để tránh transaction aborted
                    
                    if self.cursor.rowcount > 0:
                        self.stats['products_inserted'] += 1
                    else:
                        self.stats['products_skipped'] += 1
                    
                    # Progress log
                    if idx % 50 == 0:
                        print(f"   ⏳ {idx}/{len(products)} products...", end='\r')
                    
                except Exception as e:
                    # Rollback transaction bị lỗi và tiếp tục
                    self.conn.rollback()
                    self.stats['products_skipped'] += 1
                    if idx <= 5 or idx % 100 == 0:  # Log một số lỗi đầu tiên
                        print(f"\n   ⚠️  Bỏ qua product {prod.get('name', 'unknown')[:30]}...: {str(e)[:60]}")
                    continue
            print(f"   ✅ {self.stats['products_inserted']}/{len(products)} products imported       ")
            return True
            
        except Exception as e:
            print(f"\n❌ Lỗi import products: {e}")
            self.conn.rollback()
            return False
    
    def import_variants(self):
        """Import product variants vào database"""
        print("🏷️  Import variants...")
        variants = self.data.get('product_variants', [])
        
        if not variants:
            print("⚠️  Không có variants để import")
            return True
        
        insert_query = """
            INSERT INTO product_variants (
                id, product_id, sku, size, color,
                price, sale_price,
                stock_qty, reserved_qty, sold_qty,
                is_active, is_default,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO NOTHING;
        """
        
        try:
            for idx, var in enumerate(variants, 1):
                try:
                    values = (
                        var['id'],
                        var['product_id'],
                        var.get('sku', f"VAR-{var['id'][-8:]}"),
                        var.get('size', 'M'),
                        var.get('color', 'Default'),
                        var.get('price', 0),
                        var.get('sale_price'),
                        var.get('stock_qty', 100),
                        0,  # reserved_qty
                        0,  # sold_qty
                        var.get('is_active', True),
                        var.get('is_default', False)
                    )
                    
                    self.cursor.execute(insert_query, values)
                    self.conn.commit()  # Commit ngay để tránh transaction aborted
                    
                    if self.cursor.rowcount > 0:
                        self.stats['variants_inserted'] += 1
                    else:
                        self.stats['variants_skipped'] += 1
                    
                    # Progress log
                    if idx % 100 == 0:
                        print(f"   ⏳ {idx}/{len(variants)} variants...", end='\r')
                    
                except Exception as e:
                    # Rollback transaction bị lỗi và tiếp tục
                    self.conn.rollback()
                    self.stats['variants_skipped'] += 1
                    if idx % 200 == 0:  # Chỉ log một số lỗi
                        print(f"\n   ⚠️  Bỏ qua variant {var.get('id', 'unknown')[:15]}...: {str(e)[:50]}")
                    continue
            print(f"   ✅ {self.stats['variants_inserted']}/{len(variants)} variants imported       ")
            return True
            
        except Exception as e:
            print(f"\n❌ Lỗi import variants: {e}")
            self.conn.rollback()
            return False
    
    def import_images(self):
        """Import product images vào database"""
        print("📸 Import images...")
        images = self.data.get('product_images', [])
        
        if not images:
            print("⚠️  Không có images để import")
            return True
        
        insert_query = """
            INSERT INTO product_images (
                id, product_id, variant_id,
                url, thumbnail_url, alt_text,
                image_type, is_primary, sort_order,
                created_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO NOTHING;
        """
        
        try:
            for idx, img in enumerate(images, 1):
                try:
                    values = (
                        img['id'],
                        img['product_id'],
                        img.get('variant_id'),
                        img['url'],
                        img.get('thumbnail_url', img['url']),
                        img.get('alt_text', ''),
                        img.get('image_type', 'gallery'),
                        img.get('is_primary', False),
                        img.get('sort_order', 0)
                    )
                    
                    self.cursor.execute(insert_query, values)
                    self.conn.commit()  # Commit ngay để tránh transaction aborted
                    
                    if self.cursor.rowcount > 0:
                        self.stats['images_inserted'] += 1
                    else:
                        self.stats['images_skipped'] += 1
                    
                    # Progress log
                    if idx % 100 == 0:
                        print(f"   ⏳ {idx}/{len(images)} images...", end='\r')
                    
                except Exception as e:
                    # Rollback transaction bị lỗi và tiếp tục
                    self.conn.rollback()
                    self.stats['images_skipped'] += 1
                    if idx % 200 == 0:
                        print(f"\n   ⚠️  Bỏ qua image {img.get('id', 'unknown')[:15]}...")
                    continue
            print(f"   ✅ {self.stats['images_inserted']}/{len(images)} images imported         ")
            return True
            
        except Exception as e:
            print(f"\n❌ Lỗi import images: {e}")
            self.conn.rollback()
            return False
    
    def verify_import(self):
        """Kiểm tra dữ liệu đã import"""
        print("\n🔍 Kiểm tra dữ liệu...")
        
        try:
            # Count records
            self.cursor.execute("SELECT COUNT(*) FROM categories;")
            cat_count = self.cursor.fetchone()[0]
            
            self.cursor.execute("SELECT COUNT(*) FROM products;")
            prod_count = self.cursor.fetchone()[0]
            
            self.cursor.execute("SELECT COUNT(*) FROM product_variants;")
            var_count = self.cursor.fetchone()[0]
            
            self.cursor.execute("SELECT COUNT(*) FROM product_images;")
            img_count = self.cursor.fetchone()[0]
            
            print(f"✅ Dữ liệu trong database:")
            print(f"   • Categories: {cat_count}")
            print(f"   • Products: {prod_count}")
            print(f"   • Variants: {var_count}")
            print(f"   • Images: {img_count}")
            
            return True
        except Exception as e:
            print(f"⚠️  Lỗi kiểm tra: {e}")
            return False
    
    def run(self):
        """Chạy import"""
        print("""
╔══════════════════════════════════════════════════════════╗
║          IMPORT DỮ LIỆU SẢN PHẨM VÀO DATABASE          ║
╚══════════════════════════════════════════════════════════╝
""")
        
        start_time = datetime.now()
        
        # Load JSON
        if not self.load_json():
            return False
        
        # Connect DB
        if not self.connect_db():
            return False
        
        try:
            # Clear existing data if requested
            if self.clear_existing:
                if not self.clear_product_data():
                    return False
            
            # Import theo thứ tự
            print("🚀 Bắt đầu import...\n")
            
            if not self.import_categories():
                return False
            
            if not self.import_products():
                return False
            
            if not self.import_variants():
                return False
            
            if not self.import_images():
                return False
            
            # Verify
            self.verify_import()
            
            # Summary
            elapsed = (datetime.now() - start_time).total_seconds()
            
            print("\n" + "="*60)
            print("📊 TỔNG KẾT IMPORT")
            print("="*60)
            print(f"✅ Thành công:")
            print(f"   • Categories: {self.stats['categories_inserted']}")
            print(f"   • Products:   {self.stats['products_inserted']}")
            print(f"   • Variants:   {self.stats['variants_inserted']}")
            print(f"   • Images:     {self.stats['images_inserted']}")
            
            if any([
                self.stats['categories_skipped'],
                self.stats['products_skipped'],
                self.stats['variants_skipped'],
                self.stats['images_skipped']
            ]):
                print(f"\n⚠️  Bỏ qua (đã tồn tại hoặc lỗi):")
                if self.stats['categories_skipped']:
                    print(f"   • Categories: {self.stats['categories_skipped']}")
                if self.stats['products_skipped']:
                    print(f"   • Products:   {self.stats['products_skipped']}")
                if self.stats['variants_skipped']:
                    print(f"   • Variants:   {self.stats['variants_skipped']}")
                if self.stats['images_skipped']:
                    print(f"   • Images:     {self.stats['images_skipped']}")
            
            print(f"\n⏱️  Thời gian: {elapsed:.1f}s")
            print("="*60)
            print("\n✅ HOÀN THÀNH!\n")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Lỗi nghiêm trọng: {e}")
            return False
        
        finally:
            # Close connection
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            print("🔌 Đã đóng kết nối database\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Import product data vào database')
    parser.add_argument('--clear', action='store_true', help='Xóa dữ liệu cũ trước khi import')
    parser.add_argument('--file', default='products_data.json', help='File JSON chứa dữ liệu')
    
    args = parser.parse_args()
    
    if args.clear:
        print("⚠️  Chế độ: XÓA dữ liệu cũ và import mới\n")
    else:
        print("ℹ️  Chế độ: Thêm vào dữ liệu có sẵn (bỏ qua trùng ID)\n")
        print("💡 Dùng --clear để xóa dữ liệu cũ trước khi import\n")
    
    importer = DatabaseImporter(args.file, clear_existing=args.clear)
    success = importer.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

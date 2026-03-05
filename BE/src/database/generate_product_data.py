"""
Script crawl 500 sản phẩm quần áo từ các trang web
Data output: categories, products, product_variants, product_images
"""

import json
import time
import re
import logging
from datetime import datetime
from typing import List, Dict, Any
import uuid
import random

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Thiếu thư viện: {e}")
    print("Cài đặt: pip install requests beautifulsoup4 lxml")
    exit(1)

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('product_crawl.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProductDataGenerator:
    def __init__(self, target_count=500):
        self.target_count = target_count
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Data storage
        self.categories = []
        self.products = []
        self.product_variants = []
        self.product_images = []
        
        # Tracking
        self.product_count = 0
        
        # Danh mục áo quần (filter)
        self.clothing_keywords = [
            'áo', 'quần', 'shirt', 'jean', 'polo', 'sơ mi', 'thun', 'khoác',
            'vest', 'blazer', 'short', 'pant', 'trouser', 'tee', 'hoodie'
        ]
        self.exclude_keywords = [
            'deal', 'khuyến mãi', 'sale', 'ưu đãi', 'giảm giá', 'trang chủ',
            'home', 'new', 'mới về', 'hot', 'bán chạy'
        ]
    
    def generate_id(self, prefix=""):
        """Tạo ID"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    def slugify(self, text):
        """Tạo slug"""
        text = text.lower()
        text = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', text)
        text = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', text)
        text = re.sub(r'[ìíịỉĩ]', 'i', text)
        text = re.sub(r'[òóọỏõôồốộổỗơờớợởỡ]', 'o', text)
        text = re.sub(r'[ùúụủũưừứựửữ]', 'u', text)
        text = re.sub(r'[ỳýỵỷỹ]', 'y', text)
        text = re.sub(r'[đ]', 'd', text)
        text = re.sub(r'[^a-z0-9\s-]', '', text)
        text = re.sub(r'[\s-]+', '-', text)
        return text.strip('-')
    
    def extract_price(self, price_text):
        """Trích xuất giá"""
        if not price_text:
            return 0
        price_text = str(price_text).replace('.', '').replace(',', '').replace('₫', '').replace('đ', '').strip()
        numbers = re.findall(r'\d+', price_text)
        return int(numbers[0]) if numbers else 0
    
    def is_clothing_category(self, name):
        """Check xem có phải danh mục áo quần không"""
        name_lower = name.lower()
        # Loại bỏ các danh mục không mong muốn
        for keyword in self.exclude_keywords:
            if keyword in name_lower:
                return False
        # Kiểm tra có chứa từ khóa áo quần
        for keyword in self.clothing_keywords:
            if keyword in name_lower:
                return True
        return False
    
    def get_with_retry(self, url, max_retries=3):
        """GET với retry"""
        for i in range(max_retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except Exception as e:
                logger.warning(f"Lỗi {url} (lần {i+1}): {e}")
                if i < max_retries - 1:
                    time.sleep(1)
        return None
    
    # ==================== YODY.VN ====================
    def crawl_yody(self):
        """Crawl Yody"""
        if self.product_count >= self.target_count:
            return
            
        logger.info("🔄 Crawl YODY.VN...")
        base_url = "https://yody.vn"
        
        try:
            response = self.get_with_retry(base_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm menu items
            menu_items = soup.select('nav a, .header a, [class*="menu"] a')
            
            categories_to_crawl = []
            for item in menu_items:
                cat_name = item.get_text(strip=True)
                cat_url = item.get('href', '')
                
                if not self.is_clothing_category(cat_name):
                    continue
                
                if cat_url and '/collections/' in cat_url:
                    if not cat_url.startswith('http'):
                        cat_url = base_url + cat_url
                    
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name}',
                        'level': 0,
                        'is_active': True,
                        'source': 'yody.vn'
                    }
                    self.categories.append(category)
                    categories_to_crawl.append((cat_id, cat_name, cat_url))
                    logger.info(f"  ✓ {cat_name}")
            
            # Crawl products
            for cat_id, cat_name, cat_url in categories_to_crawl:
                if self.product_count >= self.target_count:
                    break
                self.crawl_yody_category(cat_id, cat_name, cat_url)
                time.sleep(0.5)
            
            logger.info(f"  → Đã crawl {len([p for p in self.products if p.get('source')=='yody.vn'])} sản phẩm từ Yody")
            
        except Exception as e:
            logger.error(f"Lỗi Yody: {e}")
    
    def crawl_yody_category(self, cat_id, cat_name, cat_url):
        """Crawl danh mục Yody"""
        try:
            response = self.get_with_retry(cat_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm products (nhiều selector khác nhau)
            products = soup.select('.product-loop, .product-item, .product-block, [class*="product-"]')
            
            # Crawl nhiều page nếu cần
            for page in range(1, 6):  # Crawl tối đa 5 trang
                if self.product_count >= self.target_count:
                    break
                
                if page > 1:
                    page_url = f"{cat_url}?page={page}"
                    response = self.get_with_retry(page_url)
                    if response:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        products = soup.select('.product-loop, .product-item, .product-block, [class*="product-"]')
                    else:
                        break
                
                for product_div in products:
                    if self.product_count >= self.target_count:
                        break
                    
                    try:
                        # Tên sản phẩm
                        name_elem = product_div.select_one('h3, .product-name, .product-title, [class*="name"]')
                        name = name_elem.get_text(strip=True) if name_elem else None
                        
                        if not name or len(name) < 5:
                            continue
                        
                        # Link
                        link_elem = product_div.select_one('a')
                        product_url = link_elem.get('href', '') if link_elem else ''
                        if product_url and not product_url.startswith('http'):
                            product_url = 'https://yody.vn' + product_url
                        
                        # Giá
                        price_elem = product_div.select_one('.price, [class*="price"]')
                        price = self.extract_price(price_elem.get_text() if price_elem else '0')
                        if price == 0:
                            price = random.randint(200, 800) * 1000
                        
                        # Hình ảnh
                        img_elem = product_div.select_one('img')
                        image_url = None
                        if img_elem:
                            image_url = img_elem.get('src', '') or img_elem.get('data-src', '')
                            if image_url:
                                if image_url.startswith('//'):
                                    image_url = 'https:' + image_url
                                elif not image_url.startswith('http'):
                                    image_url = 'https://yody.vn' + image_url
                        
                        if not image_url:
                            continue  # Bỏ qua nếu không có ảnh
                        
                        # Tạo product
                        product_id = self.generate_id("prod_")
                        product = {
                            'id': product_id,
                            'category_id': cat_id,
                            'name': name,
                            'slug': self.slugify(name),
                            'sku': f"YODY-{product_id[-8:].upper()}",
                            'description': f'{name} - Sản phẩm chất lượng từ YODY',
                            'brand': 'YODY',
                            'base_price': price,
                            'status': 'active',
                            'source': 'yody.vn',
                            'source_url': product_url
                        }
                        self.products.append(product)
                        
                        # Variants (tạo multiple sizes)
                        sizes = ['S', 'M', 'L', 'XL']
                        colors = [
                            {'name': 'Trắng', 'code': '#FFFFFF'},
                            {'name': 'Đen', 'code': '#000000'},
                            {'name': 'Xanh Navy', 'code': '#001F3F'}
                        ]
                        
                        for idx, size in enumerate(sizes):
                            color = colors[idx % len(colors)]
                            variant_id = self.generate_id("var_")
                            variant = {
                                'id': variant_id,
                                'product_id': product_id,
                                'sku': f"{product['sku']}-{size}-{color['name'][:3].upper()}",
                                'size': size,
                                'color': color['name'],
                                'price': price,
                                'stock_qty': random.randint(50, 200),
                                'is_active': True,
                                'is_default': (idx == 1)  # Size M là default
                            }
                            self.product_variants.append(variant)
                        
                        # Images
                        image_id = self.generate_id("img_")
                        image = {
                            'id': image_id,
                            'product_id': product_id,
                            'variant_id': None,
                            'url': image_url,
                            'thumbnail_url': image_url,
                            'image_type': 'gallery',
                            'is_primary': True,
                            'sort_order': 0
                        }
                        self.product_images.append(image)
                        
                        self.product_count += 1
                        
                    except Exception as e:
                        continue
                
                if self.product_count >= self.target_count:
                    break
                time.sleep(0.3)
                
        except Exception as e:
            logger.warning(f"Lỗi category {cat_name}: {e}")
    
    # ==================== YAME.VN ====================
    def crawl_yame(self):
        """Crawl Yame"""
        if self.product_count >= self.target_count:
            return
            
        logger.info("🔄 Crawl YAME.VN...")
        base_url = "https://yame.vn"
        
        try:
            response = self.get_with_retry(base_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            menu_items = soup.select('nav a, .menu a, header a')
            
            categories_to_crawl = []
            for item in menu_items:
                cat_name = item.get_text(strip=True)
                cat_url = item.get('href', '')
                
                if not self.is_clothing_category(cat_name):
                    continue
                
                if cat_url and ('/collections/' in cat_url or '/danh-muc/' in cat_url):
                    if not cat_url.startswith('http'):
                        cat_url = base_url + cat_url
                    
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name}',
                        'level': 0,
                        'is_active': True,
                        'source': 'yame.vn'
                    }
                    self.categories.append(category)
                    categories_to_crawl.append((cat_id, cat_name, cat_url))
                    logger.info(f"  ✓ {cat_name}")
            
            for cat_id, cat_name, cat_url in categories_to_crawl:
                if self.product_count >= self.target_count:
                    break
                self.crawl_yame_category(cat_id, cat_name, cat_url)
                time.sleep(0.5)
            
            logger.info(f"  → Đã crawl {len([p for p in self.products if p.get('source')=='yame.vn'])} sản phẩm từ Yame")
            
        except Exception as e:
            logger.error(f"Lỗi Yame: {e}")
    
    def crawl_yame_category(self, cat_id, cat_name, cat_url):
        """Crawl danh mục Yame - tương tự Yody"""
        base_url = "https://yame.vn"
        try:
            for page in range(1, 6):
                if self.product_count >= self.target_count:
                    break
                
                page_url = cat_url if page == 1 else f"{cat_url}?page={page}"
                response = self.get_with_retry(page_url)
                if not response:
                    break
                
                soup = BeautifulSoup(response.content, 'html.parser')
                products = soup.select('.product-loop, .product-item, [class*="product"]')
                
                for product_div in products:
                    if self.product_count >= self.target_count:
                        break
                    
                    try:
                        name_elem = product_div.select_one('h3, h2, .product-title, [class*="name"]')
                        name = name_elem.get_text(strip=True) if name_elem else None
                        
                        if not name or len(name) < 5:
                            continue
                        
                        link_elem = product_div.select_one('a')
                        product_url = link_elem.get('href', '') if link_elem else ''
                        if product_url and not product_url.startswith('http'):
                            product_url = base_url + product_url
                        
                        price_elem = product_div.select_one('.price, [class*="price"]')
                        price = self.extract_price(price_elem.get_text() if price_elem else '0')
                        if price == 0:
                            price = random.randint(150, 600) * 1000
                        
                        img_elem = product_div.select_one('img')
                        image_url = None
                        if img_elem:
                            image_url = img_elem.get('src', '') or img_elem.get('data-src', '')
                            if image_url:
                                if image_url.startswith('//'):
                                    image_url = 'https:' + image_url
                                elif not image_url.startswith('http'):
                                    image_url = base_url + image_url
                        
                        if not image_url:
                            continue
                        
                        product_id = self.generate_id("prod_")
                        product = {
                            'id': product_id,
                            'category_id': cat_id,
                            'name': name,
                            'slug': self.slugify(name),
                            'sku': f"YAME-{product_id[-8:].upper()}",
                            'description': f'{name} - Thời trang YAME',
                            'brand': 'YAME',
                            'base_price': price,
                            'status': 'active',
                            'source': 'yame.vn',
                            'source_url': product_url
                        }
                        self.products.append(product)
                        
                        # Variants
                        sizes = ['S', 'M', 'L', 'XL', 'XXL']
                        for idx, size in enumerate(sizes):
                            variant_id = self.generate_id("var_")
                            variant = {
                                'id': variant_id,
                                'product_id': product_id,
                                'sku': f"{product['sku']}-{size}",
                                'size': size,
                                'color': 'Standard',
                                'price': price,
                                'stock_qty': random.randint(30, 150),
                                'is_active': True,
                                'is_default': (size == 'M')
                            }
                            self.product_variants.append(variant)
                        
                        # Image
                        image_id = self.generate_id("img_")
                        image = {
                            'id': image_id,
                            'product_id': product_id,
                            'url': image_url,
                            'thumbnail_url': image_url,
                            'is_primary': True,
                            'sort_order': 0
                        }
                        self.product_images.append(image)
                        
                        self.product_count += 1
                        
                    except Exception as e:
                        continue
                
                time.sleep(0.3)
                
        except Exception as e:
            logger.warning(f"Lỗi category: {e}")
    
    # ==================== SAVANI.VN ====================
    def crawl_savani(self):
        """Crawl Savani"""
        if self.product_count >= self.target_count:
            return
            
        logger.info("🔄 Crawl SAVANI.VN...")
        base_url = "https://savani.vn"
        
        try:
            response = self.get_with_retry(base_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            menu_items = soup.select('nav a, .menu a, header a')
            
            categories_to_crawl = []
            for item in menu_items:
                cat_name = item.get_text(strip=True)
                cat_url = item.get('href', '')
                
                if not self.is_clothing_category(cat_name):
                    continue
                
                if cat_url:
                    if not cat_url.startswith('http'):
                        cat_url = base_url + cat_url
                    
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name}',
                        'level': 0,
                        'is_active': True,
                        'source': 'savani.vn'
                    }
                    self.categories.append(category)
                    categories_to_crawl.append((cat_id, cat_name, cat_url))
                    logger.info(f"  ✓ {cat_name}")
            
            for cat_id, cat_name, cat_url in categories_to_crawl:
                if self.product_count >= self.target_count:
                    break
                self.crawl_savani_category(cat_id, cat_name, cat_url)
                time.sleep(0.5)
            
            logger.info(f"  → Đã crawl {len([p for p in self.products if p.get('source')=='savani.vn'])} sản phẩm từ Savani")
            
        except Exception as e:
            logger.error(f"Lỗi Savani: {e}")
    
    def crawl_savani_category(self, cat_id, cat_name, cat_url):
        """Crawl danh mục Savani"""
        base_url = "https://savani.vn"
        try:
            for page in range(1, 6):
                if self.product_count >= self.target_count:
                    break
                
                page_url = cat_url if page == 1 else f"{cat_url}?page={page}"
                response = self.get_with_retry(page_url)
                if not response:
                    break
                
                soup = BeautifulSoup(response.content, 'html.parser')
                products = soup.select('.product-loop, .product-item, [class*="product"]')
                
                for product_div in products:
                    if self.product_count >= self.target_count:
                        break
                    
                    try:
                        name_elem = product_div.select_one('h3, h2, .product-title, [class*="title"]')
                        name = name_elem.get_text(strip=True) if name_elem else None
                        
                        if not name or len(name) < 5:
                            continue
                        
                        link_elem = product_div.select_one('a')
                        product_url = link_elem.get('href', '') if link_elem else ''
                        if product_url and not product_url.startswith('http'):
                            product_url = base_url + product_url
                        
                        price_elem = product_div.select_one('.price, [class*="price"]')
                        price = self.extract_price(price_elem.get_text() if price_elem else '0')
                        if price == 0:
                            price = random.randint(300, 900) * 1000
                        
                        img_elem = product_div.select_one('img')
                        image_url = None
                        if img_elem:
                            image_url = img_elem.get('src', '') or img_elem.get('data-src', '')
                            if image_url:
                                if image_url.startswith('//'):
                                    image_url = 'https:' + image_url
                                elif not image_url.startswith('http'):
                                    image_url = base_url + image_url
                        
                        if not image_url:
                            continue
                        
                        product_id = self.generate_id("prod_")
                        product = {
                            'id': product_id,
                            'category_id': cat_id,
                            'name': name,
                            'slug': self.slugify(name),
                            'sku': f"SAVANI-{product_id[-8:].upper()}",
                            'description': f'{name} - Thời trang công sở SAVANI',
                            'brand': 'SAVANI',
                            'base_price': price,
                            'status': 'active',
                            'source': 'savani.vn',
                            'source_url': product_url
                        }
                        self.products.append(product)
                        
                        # Variants
                        sizes = ['S', 'M', 'L', 'XL']
                        colors = ['Đen', 'Xanh đen', 'Xám', 'Be']
                        for idx, size in enumerate(sizes):
                            color = colors[idx % len(colors)]
                            variant_id = self.generate_id("var_")
                            variant = {
                                'id': variant_id,
                                'product_id': product_id,
                                'sku': f"{product['sku']}-{size}-{color[:2].upper()}",
                                'size': size,
                                'color': color,
                                'price': price,
                                'stock_qty': random.randint(40, 180),
                                'is_active': True,
                                'is_default': (size == 'M' and color == 'Đen')
                            }
                            self.product_variants.append(variant)
                        
                        # Image
                        image_id = self.generate_id("img_")
                        image = {
                            'id': image_id,
                            'product_id': product_id,
                            'url': image_url,
                            'thumbnail_url': image_url,
                            'is_primary': True,
                            'sort_order': 0
                        }
                        self.product_images.append(image)
                        
                        self.product_count += 1
                        
                    except Exception as e:
                        continue
                
                time.sleep(0.3)
                
        except Exception as e:
            logger.warning(f"Lỗi category: {e}")
    
    # ==================== EXPORT ====================
    def export_to_json(self, filename='products_data.json'):
        """Export data to JSON"""
        data = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'total_categories': len(self.categories),
                'total_products': len(self.products),
                'total_variants': len(self.product_variants),
                'total_images': len(self.product_images),
                'sources': {
                    'yody.vn': len([p for p in self.products if p.get('source') == 'yody.vn']),
                    'yame.vn': len([p for p in self.products if p.get('source') == 'yame.vn']),
                    'savani.vn': len([p for p in self.products if p.get('source') == 'savani.vn']),
                }
            },
            'categories': self.categories,
            'products': self.products,
            'product_variants': self.product_variants,
            'product_images': self.product_images
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"\n💾 Đã lưu vào: {filename}")
        
        # Summary
        print("\n" + "="*60)
        print("📊 TỔNG KẾT DỮ LIỆU SẢN PHẨM")
        print("="*60)
        print(f"📁 File: {filename}")
        print(f"⏰ Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("")
        print(f"📦 Danh mục:     {len(self.categories):>4} categories")
        print(f"👕 Sản phẩm:     {len(self.products):>4} products")
        print(f"🏷️  Biến thể:     {len(self.product_variants):>4} variants")
        print(f"📸 Hình ảnh:     {len(self.product_images):>4} images")
        print("")
        print("🌐 Nguồn dữ liệu:")
        for source, count in data['metadata']['sources'].items():
            print(f"   • {source:<15} {count:>3} sản phẩm")
        print("="*60 + "\n")


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║     THU THẬP DỮ LIỆU SẢN PHẨM QUẦN ÁO (~500 SP)        ║
║                                                          ║
║  Nguồn: yody.vn, yame.vn, savani.vn                     ║
║  Data: categories, products, variants, images            ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    generator = ProductDataGenerator(target_count=500)
    
    print("🚀 Bắt đầu thu thập...\n")
    
    start_time = time.time()
    
    try:
        # Crawl từng site
        generator.crawl_yody()
        generator.crawl_yame()
        generator.crawl_savani()
        
        # Export
        generator.export_to_json('products_data.json')
        
        elapsed = time.time() - start_time
        print(f"⏱️  Tổng thời gian: {elapsed:.1f}s")
        print(f"✅ HOÀN THÀNH!\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Đã dừng! Đang lưu dữ liệu hiện có...")
        generator.export_to_json('products_data_partial.json')
        print("💾 Đã lưu dữ liệu vào: products_data_partial.json\n")
    except Exception as e:
        logger.error(f"❌ Lỗi: {e}")
        print(f"\n❌ Có lỗi: {e}\n")


if __name__ == "__main__":
    main()

"""
Script crawl dữ liệu sản phẩm quần áo từ các trang web
Thu thập data theo cấu trúc database: categories, products, product_variants, product_images
"""

import json
import time
import re
import logging
from datetime import datetime
from typing import List, Dict, Any
import uuid

try:
    import requests
    from bs4 import BeautifulSoup
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
except ImportError as e:
    print(f"Thiếu thư viện: {e}")
    print("Cài đặt bằng: pip install requests beautifulsoup4 selenium lxml")
    exit(1)

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crawl_log.txt', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProductCrawler:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Data storage
        self.categories = []
        self.products = []
        self.product_variants = []
        self.product_images = []
        
        # ID tracking
        self.category_ids = {}
        self.product_ids = {}
        
    def generate_id(self, prefix=""):
        """Tạo ID duy nhất"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    def slugify(self, text):
        """Tạo slug từ text"""
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
        """Trích xuất giá từ text"""
        if not price_text:
            return 0
        price_text = str(price_text).replace('.', '').replace(',', '').replace('₫', '').replace('đ', '').strip()
        numbers = re.findall(r'\d+', price_text)
        return int(numbers[0]) if numbers else 0

    def get_with_retry(self, url, max_retries=3):
        """GET request với retry"""
        for i in range(max_retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response
            except Exception as e:
                logger.warning(f"Lỗi khi truy cập {url} (lần {i+1}/{max_retries}): {e}")
                if i < max_retries - 1:
                    time.sleep(2 ** i)
        return None

    # ==================== YODY.VN ====================
    def crawl_yody(self):
        """Crawl dữ liệu từ yody.vn"""
        logger.info("🔄 Bắt đầu crawl YODY.VN...")
        base_url = "https://yody.vn"
        
        try:
            # Lấy danh sách danh mục
            response = self.get_with_retry(base_url)
            if not response:
                logger.error("Không thể truy cập yody.vn")
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm menu categories (có thể cần điều chỉnh selector)
            menu_items = soup.select('nav a[href*="/collections/"]')
            
            categories_to_crawl = []
            for item in menu_items[:10]:  # Giới hạn 10 danh mục để test
                cat_name = item.get_text(strip=True)
                cat_url = item.get('href', '')
                if cat_url and not cat_url.startswith('http'):
                    cat_url = base_url + cat_url
                
                if cat_name and cat_url:
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name} từ Yody',
                        'image_url': None,
                        'sort_order': len(self.categories),
                        'level': 0,
                        'is_active': True,
                        'is_featured': False,
                        'source': 'yody.vn'
                    }
                    self.categories.append(category)
                    self.category_ids[cat_name] = cat_id
                    categories_to_crawl.append((cat_id, cat_name, cat_url))
                    logger.info(f"✓ Tìm thấy danh mục: {cat_name}")
            
            # Crawl sản phẩm từ mỗi danh mục
            for cat_id, cat_name, cat_url in categories_to_crawl[:3]:  # Giới hạn 3 danh mục
                self.crawl_yody_category(cat_id, cat_name, cat_url)
                time.sleep(1)
            
            logger.info(f"✅ Hoàn thành crawl YODY: {len([p for p in self.products if p.get('source')=='yody.vn'])} sản phẩm")
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi crawl Yody: {e}")
    
    def crawl_yody_category(self, cat_id, cat_name, cat_url):
        """Crawl sản phẩm từ một danh mục của Yody"""
        logger.info(f"  Crawl danh mục: {cat_name}")
        
        try:
            response = self.get_with_retry(cat_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm các sản phẩm (cần điều chỉnh selector phù hợp)
            products = soup.select('.product-item, .product-loop, .product-card, [class*="product"]')[:10]  # Giới hạn 10 sản phẩm/danh mục
            
            for product_div in products:
                try:
                    # Trích xuất thông tin sản phẩm
                    name_elem = product_div.select_one('h3, .product-title, .product-name, [class*="title"]')
                    name = name_elem.get_text(strip=True) if name_elem else "Unknown Product"
                    
                    link_elem = product_div.select_one('a[href*="/products/"]')
                    product_url = link_elem.get('href', '') if link_elem else ''
                    if product_url and not product_url.startswith('http'):
                        product_url = 'https://yody.vn' + product_url
                    
                    price_elem = product_div.select_one('.price, [class*="price"]')
                    price_text = price_elem.get_text(strip=True) if price_elem else '0'
                    price = self.extract_price(price_text)
                    
                    img_elem = product_div.select_one('img')
                    image_url = img_elem.get('src', '') or img_elem.get('data-src', '') if img_elem else ''
                    if image_url and not image_url.startswith('http'):
                        image_url = 'https:' + image_url if image_url.startswith('//') else 'https://yody.vn' + image_url
                    
                    if not name or name == "Unknown Product":
                        continue
                    
                    # Tạo product
                    product_id = self.generate_id("prod_")
                    product = {
                        'id': product_id,
                        'category_id': cat_id,
                        'name': name,
                        'slug': self.slugify(name),
                        'sku': f"YODY-{product_id[-8:]}",
                        'short_description': f'{name} từ Yody',
                        'description': f'Sản phẩm {name} chất lượng cao từ Yody',
                        'brand': 'YODY',
                        'base_price': price if price > 0 else 299000,
                        'requires_shipping': True,
                        'status': 'active',
                        'is_featured': False,
                        'is_new': False,
                        'source': 'yody.vn',
                        'source_url': product_url
                    }
                    self.products.append(product)
                    
                    # Tạo variant mặc định
                    variant_id = self.generate_id("var_")
                    variant = {
                        'id': variant_id,
                        'product_id': product_id,
                        'sku': f"{product['sku']}-DEFAULT",
                        'size': 'M',
                        'color': 'Default',
                        'price': price if price > 0 else 299000,
                        'sale_price': None,
                        'stock_qty': 100,
                        'is_active': True,
                        'is_default': True
                    }
                    self.product_variants.append(variant)
                    
                    # Tạo product image
                    if image_url:
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
                    
                    logger.info(f"    ✓ {name} - {price:,}đ")
                    
                except Exception as e:
                    logger.warning(f"    ⚠ Lỗi khi parse sản phẩm: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"  ❌ Lỗi crawl category {cat_name}: {e}")

    # ==================== YAME.VN ====================
    def crawl_yame(self):
        """Crawl dữ liệu từ yame.vn"""
        logger.info("🔄 Bắt đầu crawl YAME.VN...")
        base_url = "https://yame.vn"
        
        try:
            response = self.get_with_retry(base_url)
            if not response:
                logger.error("Không thể truy cập yame.vn")
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm danh mục
            menu_items = soup.select('nav a[href*="/collections/"], a[href*="/danh-muc/"]')
            
            categories_to_crawl = []
            for item in menu_items[:10]:
                cat_name = item.get_text(strip=True)
                cat_url = item.get('href', '')
                if cat_url and not cat_url.startswith('http'):
                    cat_url = base_url + cat_url
                
                if cat_name and cat_url and len(cat_name) > 2:
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name} từ Yame',
                        'sort_order': len(self.categories),
                        'level': 0,
                        'is_active': True,
                        'is_featured': False,
                        'source': 'yame.vn'
                    }
                    self.categories.append(category)
                    categories_to_crawl.append((cat_id, cat_name, cat_url))
                    logger.info(f"✓ Tìm thấy danh mục: {cat_name}")
            
            # Crawl sản phẩm
            for cat_id, cat_name, cat_url in categories_to_crawl[:3]:
                self.crawl_yame_category(cat_id, cat_name, cat_url)
                time.sleep(1)
            
            logger.info(f"✅ Hoàn thành crawl YAME: {len([p for p in self.products if p.get('source')=='yame.vn'])} sản phẩm")
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi crawl Yame: {e}")
    
    def crawl_yame_category(self, cat_id, cat_name, cat_url):
        """Crawl sản phẩm từ danh mục Yame"""
        logger.info(f"  Crawl danh mục: {cat_name}")
        base_url = "https://yame.vn"
        
        try:
            response = self.get_with_retry(cat_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            products = soup.select('.product-item, .product-block, [class*="product"]')[:10]
            
            for product_div in products:
                try:
                    name_elem = product_div.select_one('h3, .product-title, [class*="name"]')
                    name = name_elem.get_text(strip=True) if name_elem else None
                    
                    if not name:
                        continue
                    
                    link_elem = product_div.select_one('a')
                    product_url = link_elem.get('href', '') if link_elem else ''
                    if product_url and not product_url.startswith('http'):
                        product_url = base_url + product_url
                    
                    price_elem = product_div.select_one('.price, [class*="price"]')
                    price = self.extract_price(price_elem.get_text() if price_elem else '0')
                    
                    img_elem = product_div.select_one('img')
                    image_url = img_elem.get('src', '') or img_elem.get('data-src', '') if img_elem else ''
                    if image_url and not image_url.startswith('http'):
                        image_url = 'https:' + image_url if image_url.startswith('//') else base_url + image_url
                    
                    # Tạo product
                    product_id = self.generate_id("prod_")
                    product = {
                        'id': product_id,
                        'category_id': cat_id,
                        'name': name,
                        'slug': self.slugify(name),
                        'sku': f"YAME-{product_id[-8:]}",
                        'short_description': f'{name} từ Yame',
                        'description': f'Sản phẩm {name} thời trang từ Yame',
                        'brand': 'YAME',
                        'base_price': price if price > 0 else 250000,
                        'requires_shipping': True,
                        'status': 'active',
                        'source': 'yame.vn',
                        'source_url': product_url
                    }
                    self.products.append(product)
                    
                    # Variant
                    variant_id = self.generate_id("var_")
                    variant = {
                        'id': variant_id,
                        'product_id': product_id,
                        'sku': f"{product['sku']}-DEFAULT",
                        'size': 'M',
                        'color': 'Default',
                        'price': price if price > 0 else 250000,
                        'stock_qty': 100,
                        'is_active': True,
                        'is_default': True
                    }
                    self.product_variants.append(variant)
                    
                    # Image
                    if image_url:
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
                    
                    logger.info(f"    ✓ {name} - {price:,}đ")
                    
                except Exception as e:
                    logger.warning(f"    ⚠ Lỗi parse sản phẩm: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"  ❌ Lỗi crawl category: {e}")

    # ==================== UNIQLO ====================
    def crawl_uniqlo(self):
        """Crawl dữ liệu từ uniqlo.com/vn"""
        logger.info("🔄 Bắt đầu crawl UNIQLO...")
        
        # Uniqlo sử dụng React/Next.js, cần Selenium
        driver = None
        try:
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument(f'user-agent={self.headers["User-Agent"]}')
            
            driver = webdriver.Chrome(options=chrome_options)
            driver.set_page_load_timeout(30)
            
            # Truy cập trang chủ
            driver.get('https://www.uniqlo.com/vn/vi/')
            time.sleep(3)
            
            # Tìm danh mục
            try:
                menu_links = driver.find_elements(By.CSS_SELECTOR, 'nav a, [class*="menu"] a, [class*="nav"] a')
                
                categories_data = []
                for link in menu_links[:15]:
                    try:
                        cat_name = link.text.strip()
                        cat_url = link.get_attribute('href')
                        
                        if cat_name and cat_url and len(cat_name) > 2 and '/c/' in cat_url:
                            categories_data.append((cat_name, cat_url))
                    except:
                        continue
                
                # Tạo categories
                for cat_name, cat_url in categories_data[:5]:
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name} từ Uniqlo',
                        'sort_order': len(self.categories),
                        'level': 0,
                        'is_active': True,
                        'source': 'uniqlo.com'
                    }
                    self.categories.append(category)
                    logger.info(f"✓ Tìm thấy danh mục: {cat_name}")
                    
                    # Crawl sản phẩm từ category
                    self.crawl_uniqlo_category(driver, cat_id, cat_name, cat_url)
                    time.sleep(2)
                
            except Exception as e:
                logger.error(f"Lỗi tìm danh mục Uniqlo: {e}")
            
            logger.info(f"✅ Hoàn thành crawl UNIQLO: {len([p for p in self.products if p.get('source')=='uniqlo.com'])} sản phẩm")
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi crawl Uniqlo: {e}")
        finally:
            if driver:
                driver.quit()
    
    def crawl_uniqlo_category(self, driver, cat_id, cat_name, cat_url):
        """Crawl sản phẩm từ danh mục Uniqlo"""
        logger.info(f"  Crawl danh mục: {cat_name}")
        
        try:
            driver.get(cat_url)
            time.sleep(3)
            
            # Scroll để load lazy images
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
            time.sleep(1)
            
            products = driver.find_elements(By.CSS_SELECTOR, '[class*="product"], [class*="item"]')[:10]
            
            for product_elem in products:
                try:
                    name = product_elem.find_element(By.CSS_SELECTOR, 'h3, [class*="name"], [class*="title"]').text.strip()
                    
                    if not name:
                        continue
                    
                    try:
                        price_text = product_elem.find_element(By.CSS_SELECTOR, '[class*="price"]').text
                        price = self.extract_price(price_text)
                    except:
                        price = 390000
                    
                    try:
                        img = product_elem.find_element(By.TAG_NAME, 'img')
                        image_url = img.get_attribute('src') or img.get_attribute('data-src')
                    except:
                        image_url = None
                    
                    try:
                        link = product_elem.find_element(By.TAG_NAME, 'a')
                        product_url = link.get_attribute('href')
                    except:
                        product_url = cat_url
                    
                    # Tạo product
                    product_id = self.generate_id("prod_")
                    product = {
                        'id': product_id,
                        'category_id': cat_id,
                        'name': name,
                        'slug': self.slugify(name),
                        'sku': f"UNIQLO-{product_id[-8:]}",
                        'short_description': f'{name} từ Uniqlo',
                        'description': f'Sản phẩm {name} chất lượng Nhật Bản từ Uniqlo',
                        'brand': 'UNIQLO',
                        'base_price': price,
                        'requires_shipping': True,
                        'status': 'active',
                        'source': 'uniqlo.com',
                        'source_url': product_url
                    }
                    self.products.append(product)
                    
                    # Variant
                    variant_id = self.generate_id("var_")
                    variant = {
                        'id': variant_id,
                        'product_id': product_id,
                        'sku': f"{product['sku']}-DEFAULT",
                        'size': 'M',
                        'color': 'Default',
                        'price': price,
                        'stock_qty': 100,
                        'is_active': True,
                        'is_default': True
                    }
                    self.product_variants.append(variant)
                    
                    # Image
                    if image_url:
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
                    
                    logger.info(f"    ✓ {name} - {price:,}đ")
                    
                except Exception as e:
                    logger.warning(f"    ⚠ Lỗi parse sản phẩm: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"  ❌ Lỗi crawl category: {e}")

    # ==================== SAVANI ====================
    def crawl_savani(self):
        """Crawl dữ liệu từ savani.vn"""
        logger.info("🔄 Bắt đầu crawl SAVANI.VN...")
        base_url = "https://savani.vn"
        
        try:
            response = self.get_with_retry(base_url)
            if not response:
                logger.error("Không thể truy cập savani.vn")
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tìm danh mục
            menu_items = soup.select('nav a, .menu a, [class*="menu"] a')
            
            categories_to_crawl = []
            for item in menu_items[:10]:
                cat_name = item.get_text(strip=True)
                cat_url = item.get('href', '')
                if cat_url and not cat_url.startswith('http'):
                    cat_url = base_url + cat_url
                
                if cat_name and cat_url and len(cat_name) > 2:
                    cat_id = self.generate_id("cat_")
                    category = {
                        'id': cat_id,
                        'parent_id': None,
                        'name': cat_name,
                        'slug': self.slugify(cat_name),
                        'description': f'Danh mục {cat_name} từ Savani',
                        'sort_order': len(self.categories),
                        'level': 0,
                        'is_active': True,
                        'is_featured': False,
                        'source': 'savani.vn'
                    }
                    self.categories.append(category)
                    categories_to_crawl.append((cat_id, cat_name, cat_url))
                    logger.info(f"✓ Tìm thấy danh mục: {cat_name}")
            
            # Crawl sản phẩm
            for cat_id, cat_name, cat_url in categories_to_crawl[:3]:
                self.crawl_savani_category(cat_id, cat_name, cat_url)
                time.sleep(1)
            
            logger.info(f"✅ Hoàn thành crawl SAVANI: {len([p for p in self.products if p.get('source')=='savani.vn'])} sản phẩm")
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi crawl Savani: {e}")
    
    def crawl_savani_category(self, cat_id, cat_name, cat_url):
        """Crawl sản phẩm từ danh mục Savani"""
        logger.info(f"  Crawl danh mục: {cat_name}")
        base_url = "https://savani.vn"
        
        try:
            response = self.get_with_retry(cat_url)
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            products = soup.select('.product-item, .product, [class*="product"]')[:10]
            
            for product_div in products:
                try:
                    name_elem = product_div.select_one('h3, .product-title, [class*="title"]')
                    name = name_elem.get_text(strip=True) if name_elem else None
                    
                    if not name:
                        continue
                    
                    link_elem = product_div.select_one('a')
                    product_url = link_elem.get('href', '') if link_elem else ''
                    if product_url and not product_url.startswith('http'):
                        product_url = base_url + product_url
                    
                    price_elem = product_div.select_one('.price, [class*="price"]')
                    price = self.extract_price(price_elem.get_text() if price_elem else '0')
                    
                    img_elem = product_div.select_one('img')
                    image_url = img_elem.get('src', '') or img_elem.get('data-src', '') if img_elem else ''
                    if image_url and not image_url.startswith('http'):
                        image_url = 'https:' + image_url if image_url.startswith('//') else base_url + image_url
                    
                    # Tạo product
                    product_id = self.generate_id("prod_")
                    product = {
                        'id': product_id,
                        'category_id': cat_id,
                        'name': name,
                        'slug': self.slugify(name),
                        'sku': f"SAVANI-{product_id[-8:]}",
                        'short_description': f'{name} từ Savani',
                        'description': f'Sản phẩm {name} thời trang công sở từ Savani',
                        'brand': 'SAVANI',
                        'base_price': price if price > 0 else 350000,
                        'requires_shipping': True,
                        'status': 'active',
                        'source': 'savani.vn',
                        'source_url': product_url
                    }
                    self.products.append(product)
                    
                    # Variant
                    variant_id = self.generate_id("var_")
                    variant = {
                        'id': variant_id,
                        'product_id': product_id,
                        'sku': f"{product['sku']}-DEFAULT",
                        'size': 'M',
                        'color': 'Default',
                        'price': price if price > 0 else 350000,
                        'stock_qty': 100,
                        'is_active': True,
                        'is_default': True
                    }
                    self.product_variants.append(variant)
                    
                    # Image
                    if image_url:
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
                    
                    logger.info(f"    ✓ {name} - {price:,}đ")
                    
                except Exception as e:
                    logger.warning(f"    ⚠ Lỗi parse sản phẩm: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"  ❌ Lỗi crawl category: {e}")

    # ==================== EXPORT DATA ====================
    def save_to_json(self, filename='crawled_data.json'):
        """Lưu dữ liệu vào file JSON"""
        data = {
            'metadata': {
                'crawled_at': datetime.now().isoformat(),
                'total_categories': len(self.categories),
                'total_products': len(self.products),
                'total_variants': len(self.product_variants),
                'total_images': len(self.product_images),
                'sources': list(set([p.get('source', '') for p in self.products]))
            },
            'categories': self.categories,
            'products': self.products,
            'product_variants': self.product_variants,
            'product_images': self.product_images
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 Đã lưu dữ liệu vào {filename}")
        
        # Tạo file summary
        summary = f"""
╔══════════════════════════════════════════════════════════╗
║          KẾT QUẢ CRAWL DỮ LIỆU SẢN PHẨM                ║
╠══════════════════════════════════════════════════════════╣
║ Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                    ║
║                                                          ║
║ TỔNG QUAN:                                               ║
║   • Danh mục: {len(self.categories):>3} categories                         ║
║   • Sản phẩm: {len(self.products):>3} products                            ║
║   • Biến thể: {len(self.product_variants):>3} variants                            ║
║   • Hình ảnh: {len(self.product_images):>3} images                             ║
║                                                          ║
║ NGUỒN DỮ LIỆU:                                           ║
"""
        
        sources = {}
        for p in self.products:
            src = p.get('source', 'unknown')
            sources[src] = sources.get(src, 0) + 1
        
        for source, count in sources.items():
            summary += f"║   • {source:<15} : {count:>3} sản phẩm                 ║\n"
        
        summary += """╚══════════════════════════════════════════════════════════╝
"""
        
        print(summary)
        
        with open('crawl_summary.txt', 'w', encoding='utf-8') as f:
            f.write(summary)


def main():
    """Main function"""
    print("""
╔══════════════════════════════════════════════════════════╗
║       CÔNG CỤ CRAWL DỮ LIỆU SẢN PHẨM QUẦN ÁO           ║
║                                                          ║
║  Các trang web hỗ trợ:                                   ║
║    1. yody.vn                                            ║
║    2. yame.vn                                            ║
║    3. uniqlo.com/vn                                      ║
║    4. savani.vn                                          ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    crawler = ProductCrawler()
    
    # Crawl từng trang web
    print("\n🚀 Bắt đầu crawl dữ liệu...\n")
    
    try:
        # Crawl Yody
        crawler.crawl_yody()
        time.sleep(2)
        
        # Crawl Yame
        crawler.crawl_yame()
        time.sleep(2)
        
        # Crawl Savani
        crawler.crawl_savani()
        time.sleep(2)
        
        # Crawl Uniqlo (cần Selenium)
        try:
            crawler.crawl_uniqlo()
        except Exception as e:
            logger.warning(f"⚠ Không thể crawl Uniqlo (có thể thiếu ChromeDriver): {e}")
        
        # Lưu dữ liệu
        print("\n" + "="*60)
        crawler.save_to_json('crawled_products.json')
        
        print("\n✅ HOÀN THÀNH!\n")
        print("📁 File dữ liệu: crawled_products.json")
        print("📁 File log: crawl_log.txt")
        print("📁 File tóm tắt: crawl_summary.txt\n")
        
    except Exception as e:
        logger.error(f"❌ Lỗi nghiêm trọng: {e}")
        print(f"\n❌ Có lỗi xảy ra: {e}")
        print("Vui lòng kiểm tra file crawl_log.txt để biết chi tiết\n")


if __name__ == "__main__":
    main()

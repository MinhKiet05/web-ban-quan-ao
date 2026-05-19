# 🚀 YAME CRAWLER V2 - ENHANCED VARIANTS

## ✨ IMPROVEMENTS

### V1 (Old) 
```
Product = 1 item on listing page
Result: 20 products = 20 variants (1 each)
❌ No parent_id relationships
❌ No size/color combinations
```

### V2 (New) ✅
```
Product = Real product with ALL sizes × colors
Result: 20 products = 100+ variants (5-10 each)
✅ Proper parent_id for each variant
✅ Size × Color combinations (e.g., M+Đen, L+Trắng, XL+Xanh)
✅ All images extracted from product detail page
```

---

## 🎯 HOW IT WORKS

1. **Crawl categories** → Get 162 YAME categories
2. **For each category**:
   - List products on category page
   - **For each product**:
     - Visit product detail page
     - Extract **ALL sizes** available (S, M, L, XL, XXL...)
     - Extract **ALL colors** available (Đen, Trắng, Xanh, Đỏ...)
     - Create size × color combinations
     - Extract **ALL product images** from gallery
3. **Create data**:
   - 1 Product record (parent)
   - N Variant records (each with product_id pointing to parent) ✅
   - M Image records (associated with product)

---

## 🔧 USAGE

### Quick Test (3 categories × 10 products)
```bash
cd d:\web_ban_quan_ao\web-ban-quan-ao\BE\src\database
python run_crawler_v2.py 3 10
```

**Expected result:**
- ~3 categories
- ~10 products  
- ~50-100 variants (5-10 per product avg)
- Output: `yame_crawled_v2.json`

---

### Full Crawl (~500 products)
```bash
python run_crawler_v2.py 25 20
```

**Expected result:**
- ~25 categories
- ~500 products
- ~2500+ variants (5+ per product avg)
- **Time**: ~10-20 minutes

---

## 📊 DATA STRUCTURE

```json
{
  "metadata": {
    "crawled_at": "2026-04-25T...",
    "total_categories": 25,
    "total_products": 500,
    "total_variants": 2500,
    "total_images": 1500
  },
  "products": [
    {
      "id": "prod_abc123",
      "category_id": "cat_xyz789",
      "name": "Áo Thun Cổ Tròn Tay Ngắn",
      "base_price": 150000,
      "sku": "YAME-abc123"
    }
  ],
  "product_variants": [
    {
      "id": "var_001",
      "product_id": "prod_abc123",  ✅ PARENT REFERENCE
      "size": "M",
      "color": "Đen",
      "sku_variant": "YAME-abc123-M-DEN",
      "price": 150000,
      "stock": 100
    },
    {
      "id": "var_002",
      "product_id": "prod_abc123",  ✅ SAME PARENT
      "size": "L",
      "color": "Đen",
      "sku_variant": "YAME-abc123-L-DEN",
      "price": 150000,
      "stock": 120
    }
  ],
  "product_images": [
    {
      "id": "img_001",
      "product_id": "prod_abc123",
      "url": "https://cdn.yame.vn/...",
      "is_primary": true
    }
  ]
}
```

---

## 🔄 CONVERSION & IMPORT

### 1. Convert to SQL
```bash
python convert_yame_to_sql.py yame_crawled_v2.json yame_import_v2.sql
```

### 2. Deploy schema (one-time)
```bash
psql -U postgres -d fashion_db -f schema_optimized.sql
```

### 3. Import data
```bash
psql -U postgres -d fashion_db -f yame_import_v2.sql
```

### 4. Verify
```bash
psql -U postgres -d fashion_db
SELECT * FROM products LIMIT 5;
SELECT COUNT(*) FROM product_variants;  -- Should be 2500+
SELECT * FROM v_product_detail LIMIT 3;  -- View all variants + images
```

---

## ⚠️ NOTES

- **Rate limiting**: 0.5-1 second delay between requests (respectful crawling)
- **Timeout**: ~10-20 minutes for 500 products (depends on internet speed)
- **Skip filter**: Automatically filters out tank tops (áo 3 lỗ)
- **Image limit**: Max 10 images per product
- **Stock**: Random 50-300 units per variant

---

## 📈 EXPECTED RESULTS

### Data Quality
```
Product: "Áo Thun Cổ Tròn Tay Ngắn" 
├── Variant 1: Size M, Color Đen, Stock 150
├── Variant 2: Size M, Color Trắng, Stock 120
├── Variant 3: Size L, Color Đen, Stock 200
├── Variant 4: Size L, Color Trắng, Stock 180
└── Variant 5: Size XL, Color Đen, Stock 100
```

### Database Relationships
```sql
-- Products: 500
-- Variants: 2500+
-- Each variant properly links to parent via product_id ✅
-- Images: 1500+
```

---

## 🚀 QUICK START

```bash
# Test with 2 categories
python run_crawler_v2.py 2 10

# When satisfied, run full crawl
python run_crawler_v2.py 25 20

# Convert to SQL
python convert_yame_to_sql.py yame_crawled_v2.json

# Import to database
psql -U postgres -d fashion_db -f yame_import.sql
```

Done! ✨

# Sprint 3 — CRUD Module 1–2 + Upload

**Thời gian:** Tuần 5–6 (2 tuần)  
**Trạng thái:** Đang hoàn thiện  
**Completion:** **70%**

---

## Goal

Module **Sản phẩm (read)** và **Giỏ hàng (CRUD)** end-to-end; upload ảnh sản phẩm (admin); hiển thị variant/size/color trên FE.

---

## Tasks checklist

### Module 1 — Products (Read + partial write)

- [x] BE: `GET /products/list` — cursor pagination
- [x] BE: `GET /products/:slug` — chi tiết + variants + images (view SQL)
- [x] BE: `GET /products/categories`
- [x] BE: `DELETE /products/:id` — xóa SP
- [x] FE: `ProductPage`, `ProductDetail`
- [x] FE: `ProductContext` fetch list + detail
- [ ] BE: `POST /products` — tạo SP — *chưa có*
- [ ] BE: `PUT /products/:id` — cập nhật — *chưa có*
- [ ] Admin UI quản lý SP — *chưa có*

### Module 2 — Cart CRUD

- [x] BE: `GET /cart/items`
- [x] BE: `POST /cart/add-item`
- [x] BE: `PUT /cart/update-item`
- [x] BE: `DELETE /cart/item/:id`
- [x] FE: `CartPage`, Redux `cartSlice`
- [x] FE: `CartContext.ts` (partial)
- [ ] Guest cart (`session_id`) — *schema có, API chưa*
- [ ] Đồng bộ 100% Redux ↔ API (một số path `/api/cart` relative sai proxy) — *cần fix*

### Upload

- [ ] API upload ảnh (S3/Cloudinary/local) — *chưa có*
- [ ] Ghi `product_images` sau upload — *chưa có*
- [x] Ảnh SP từ crawler/URL ngoài — có trong DB

---

## Status / Completion %

| Module | % |
|--------|---|
| Product Read API | 95% |
| Product Write/Admin | 15% |
| Cart API | 90% |
| Cart FE integration | 75% |
| Image upload pipeline | 10% |
| **Tổng Sprint 3** | **70%** |

---

## Issues

| ID | Mô tả | Mức độ |
|----|--------|--------|
| S3-01 | `DELETE /products/:id` public, không auth admin | **Cao** |
| S3-02 | `cartSlice` gọi `/api/cart/...` relative — lỗi khi không proxy Vite | Trung bình |
| S3-03 | Chưa validate `stock_qty` phía BE khi add cart (chỉ có trigger lúc order) | Trung bình |
| S3-04 | `CartContext.ts` vs Redux trùng trách nhiệm | Thấp |

---

## Notes

- Product images: **single source of truth** = bảng `product_images`, không lưu URL trên `product_variants`.
- Biến thể: chọn size/color trên `ProductDetail` → `variant_id` gửi lên cart.

---

## Acceptance Criteria

| # | Tiêu chí | Đạt |
|---|----------|:---:|
| AC1 | Xem danh sách SP từ API thật | ✓ |
| AC2 | Xem chi tiết SP theo slug + chọn variant | ✓ |
| AC3 | User đăng nhập thêm/sửa/xóa item giỏ | ✓ |
| AC4 | Admin tạo SP + upload ảnh qua UI | ✗ |
| AC5 | Guest thêm giỏ không login | ✗ |

---

## Docstring mẫu (Sprint 3)

```javascript
/**
 * Lấy danh sách sản phẩm active với filter và cursor pagination.
 *
 * @param {Object} filters
 * @param {string} [filters.category_id]
 * @param {string} [filters.sort] - newest | price:asc | price:desc
 * @param {number} [filters.limit=10]
 * @param {Object} [filters.cursor]
 * @returns {Promise<Product[]>}
 */
async function findManyForList(filters) { /* ... */ }
```

```javascript
/**
 * Thêm biến thể vào giỏ của user. Tạo cart nếu chưa có.
 * UPSERT cart_items theo (cart_id, variant_id).
 *
 * @param {string} userId
 * @param {string} variantId
 * @param {number} quantity
 * @param {number} [addedPrice] - Giá snapshot
 * @returns {Promise<CartItem>}
 */
async function addItemAddToCartForUser(userId, variantId, quantity, addedPrice) { /* ... */ }
```

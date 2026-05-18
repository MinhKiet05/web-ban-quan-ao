# Sprint 4 — CRUD Module 3 + Search / Filter / Pagination

**Thời gian:** Tuần 7–8 (2 tuần)  
**Trạng thái:** Đang hoàn thiện  
**Completion:** **75%**

---

## Goal

Module **Đơn hàng (Orders)**; trang **Search** với bộ lọc đa tiêu chí; pagination cursor; tích hợp checkout → order.

---

## Tasks checklist

### Module 3 — Orders

- [x] BE: `POST /orders` — place order + transaction
- [x] BE: `GET /orders`, `GET /orders/:id`
- [x] BE: `PATCH /orders/:id/cancel`
- [x] BE: `GET /orders/:id/payment`
- [x] BE: Tạo `payments`, trừ stock, clear cart
- [x] FE: `CheckoutPage` → POST orders
- [x] FE: `OrdersPage` — list + detail + cancel
- [ ] BE: `shipments` CRUD / tracking API — *schema có, route chưa*
- [ ] Voucher apply trong checkout — *partial (`voucher_id` body)*

### Search / Filter / Pagination

- [x] BE: Query `q`, `min_price`, `max_price`, `colors`, `sizes`, `rating`, `is_sale`, `inStock`
- [x] BE: `GET /products/filters` metadata
- [x] BE: Cursor pagination (`cursor` JSON param)
- [x] FE: `SearchPage` + `SearchFiltersPanel`
- [x] FE: `searchFilters.utils.js`
- [ ] BE: Offset pagination chuẩn `page/totalPages` — *một phần dùng cursor*
- [ ] Full-text search PostgreSQL `tsvector` — *hiện ILIKE*

---

## Status / Completion %

| Hạng mục | % |
|----------|---|
| Orders API | 90% |
| Orders FE | 85% |
| Search & filters BE | 85% |
| Search FE | 80% |
| Pagination UX (infinite/load more) | 70% |
| **Tổng** | **75%** |

---

## Issues

| ID | Mô tả | Mức độ |
|----|--------|--------|
| S4-01 | `OrdersPage` dùng `fetch` trực tiếp thay vì `apiClient` | Trung bình |
| S4-02 | Cancel order: FE gọi `POST` trong một số chỗ, BE là `PATCH` | **Cao** — cần đồng bộ |
| S4-03 | Pagination orders: `page/limit` nhưng chưa trả `total` | Trung bình |
| S4-04 | Search performance khi dataset lớn (thiếu index composite) | Trung bình |

---

## Notes

**Query example (list):**
```
GET /api/products/list?q=ao+thun&colors=trắng,đen&sizes=m,l&min_price=100000&sort=price:asc&limit=12
```

**Order flow:** Checkout gửi `items[]` snapshot từ giỏ — đúng pattern tránh giá thay đổi sau khi thêm cart.

---

## Acceptance Criteria

| # | Tiêu chí | Đạt |
|---|----------|:---:|
| AC1 | User đặt hàng COD thành công, thấy trong `/orders` | ✓ |
| AC2 | Hủy đơn `pending` được | ✓ (verify method PATCH) |
| AC3 | Search theo tên + lọc giá/màu/size | ✓ |
| AC4 | Filter panel load từ `/products/filters` | ✓ |
| AC5 | Phân trang load thêm không duplicate | ~ (cursor) |

---

## Docstring mẫu (Sprint 4)

```javascript
/**
 * Tạo đơn hàng trong transaction PostgreSQL.
 * Flow: validate → INSERT order → order_items → payment → clear cart → COMMIT.
 * Trigger DB: reserve stock, check availability.
 *
 * @param {string} userId
 * @param {PlaceOrderDTO} dto - shipping fields, items[], payment_method
 * @returns {Promise<{ order: Order, payment: Payment }>}
 * @throws {AppError} INSUFFICIENT_STOCK | VALIDATION_ERROR
 */
async function placeOrder(userId, dto) { /* ... */ }
```

```javascript
/**
 * Build query string cho /products/list từ state filter UI.
 *
 * @param {SearchFilterState} state
 * @returns {string} URLSearchParams serialized
 */
export function buildProductListQuery(state) { /* ... */ }
```

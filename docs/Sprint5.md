# Sprint 5 — Dashboard, SSR/SSG/ISR, SEO, Tối ưu

**Thời gian:** Tuần 9–10 (2 tuần)  
**Trạng thái:** Chưa bắt đầu / một phần  
**Completion:** **25%**

---

## Goal

Admin dashboard quản trị; tối ưu hiệu năng & SEO; (theo kế hoạch) SSR/SSG/ISR — **lưu ý:** dự án hiện là **Vite SPA**, không phải Next.js.

---

## Tasks checklist

### Admin Dashboard

- [ ] Trang `/admin` + role guard (`admin`, `staff`)
- [ ] Dashboard tổng quan: doanh thu, đơn mới, tồn kho thấp
- [ ] CRUD sản phẩm / danh mục trên UI
- [ ] Quản lý đơn hàng (đổi status)
- [x] BE role enum `admin`, `staff` trong schema — *chưa enforce đủ route*

### SSR / SSG / ISR

- [ ] Migrate hoặc hybrid Next.js cho catalog — *chưa*
- [ ] Vite SSR plugin — *chưa*
- [x] SPA với `index.html` + client render — **hiện trạng**

### SEO

- [x] `meta_title`, `meta_description` trên `products`, `categories` (DB)
- [ ] Dynamic `<title>` / meta per route (react-helmet-async) — *chưa*
- [ ] `sitemap.xml`, `robots.txt` — *chưa*
- [ ] Open Graph tags — *chưa*
- [x] Semantic slug URL `/products/:slug`

### Performance

- [x] Skeleton loading `ProductGridSkeleton`
- [ ] Image lazy load + WebP — *partial*
- [ ] Code splitting route-level — *Vite default chunk*
- [ ] API response cache (Redis) — *chưa*
- [x] DB views `v_product_detail` giảm N+1 query

---

## Status / Completion %

| Hạng mục | % |
|----------|---|
| Admin dashboard | 5% |
| SSR/SSG | 0% (N/A cho stack hiện tại) |
| SEO on-page | 30% |
| Performance | 40% |
| **Tổng** | **25%** |

---

## Issues

| ID | Mô tả | Mức độ |
|----|--------|--------|
| S5-01 | Sprint plan ghi SSR/SSG nhưng stack là Vite SPA — cần điều chỉnh scope | **Cao** |
| S5-02 | Không có prerender → Google crawl SP chậm hơn | Trung bình |
| S5-03 | `view_count` chưa tăng khi xem ProductDetail | Thấp |

---

## Notes

**Đề xuất thay SSR trong scope Vite:**
1. **Prerender** trang tĩnh (Home, About) bằng `vite-plugin-ssr` hoặc `react-snap`
2. **Preload** meta quan trọng trong `index.html`
3. **JSON-LD** Product schema inject client-side

**Nếu bắt buộc ISR:** cân nhắc tách micro-frontend catalog sang Next.js App Router.

---

## Acceptance Criteria

| # | Tiêu chí | Đạt |
|---|----------|:---:|
| AC1 | Admin login, thấy dashboard metrics | ✗ |
| AC2 | Sản phẩm có title/description SEO trên tab browser | ✗ |
| AC3 | Lighthouse Performance ≥ 80 mobile | ~ (chưa đo chính thức) |
| AC4 | Trang SP có structured data | ✗ |
| AC5 | SSR hoặc prerender catalog | ✗ |

---

## Docstring mẫu (Sprint 5 — planned)

```javascript
/**
 * Middleware chỉ cho phép role admin/staff.
 * Dùng sau authenticate: authorize('admin', 'staff', 'super_admin')
 *
 * @param {...string} allowedRoles
 * @returns {import('express').RequestHandler}
 */
const authorize = (...allowedRoles) => { /* ... */ };
```

```javascript
/**
 * Cập nhật document meta cho SEO (client-side).
 *
 * @param {{ title: string, description?: string, ogImage?: string }} meta
 */
function usePageMeta(meta) { /* react-helmet-async */ }
```

# Sprint 1 — Setup, UI Base, Routing, Design System, Mock Data

**Thời gian:** Tuần 1–2 (2 tuần)  
**Trạng thái:** Hoàn thành  
**Completion:** **95%**

---

## Goal

Khởi tạo monorepo FE/BE, thiết lập tooling, layout storefront cơ bản, routing đa trang, design tokens (Tailwind + CSS Modules), và dữ liệu sản phẩm ban đầu (DB seed / crawler).

---

## Tasks checklist

- [x] Khởi tạo FE: Vite + React 19 + ESLint
- [x] Khởi tạo BE: Express 5 + PostgreSQL (`pg`)
- [x] Cấu trúc thư mục `pages/`, `components/`, `routes/`, `services/`
- [x] React Router: Home, Products, Product Detail, About, Cart, 404
- [x] Layout: `Header`, `Footer`, `ScrollToTop`
- [x] Design system: Tailwind v4 + CSS Modules per page
- [x] Schema DB `schema_optimized.sql` v2.0
- [x] Seed / crawler dữ liệu Yame (`BE/src/docs/README_YAME_CRAWLER_V2.md`)
- [x] Deploy preview: Vercel (FE) + Render (BE)
- [ ] Storybook / component catalog — *chưa có*
- [ ] Design tokens file tập trung (`tokens.css`) — *dùng Tailwind inline*

---

## Status / Completion %

| Hạng mục | % | Ghi chú |
|----------|---|---------|
| Project setup | 100% | `FE/`, `BE/` tách biệt |
| Routing | 100% | `App.jsx` + nested layout |
| UI base | 90% | Homepage, product grid, footer |
| Design system | 85% | Tailwind + modules, chưa document tokens |
| Mock/seed data | 95% | PostgreSQL thật, không còn JSON mock thuần |
| **Tổng** | **95%** | |

---

## Issues

| ID | Mô tả | Mức độ | Trạng thái |
|----|--------|--------|------------|
| S1-01 | FE README vẫn template Vite mặc định | Thấp | Open |
| S1-02 | Chưa có `.env.example` ở root monorepo | Trung bình | Open |
| S1-03 | Một số trang dùng hardcode API URL | Trung bình | Partial (apiClient có base URL) |

---

## Notes

- Monorepo không dùng workspace tool (npm/yarn workspaces) — deploy độc lập FE/BE.
- `ProductContext` ban đầu có thể load mock; hiện đã chuyển sang API `/products/list`.
- Font Awesome + AOS dùng cho polish homepage.

---

## Acceptance Criteria

| # | Tiêu chí | Đạt |
|---|----------|:---:|
| AC1 | Chạy `npm run dev` (FE) và `node server.js` (BE) không lỗi | ✓ |
| AC2 | Điều hướng được ≥5 trang qua menu | ✓ |
| AC3 | Header/Footer nhất quán trên mọi route | ✓ |
| AC4 | Có schema DB và dữ liệu sản phẩm mẫu trong PostgreSQL | ✓ |
| AC5 | Responsive cơ bản mobile/desktop | ✓ |

---

## Docstring mẫu (Sprint 1)

```javascript
/**
 * Layout wrapper cho toàn bộ trang public.
 * Render Header + Outlet + Footer; dùng trong React Router nested route.
 *
 * @component
 * @returns {JSX.Element}
 */
function Layout() { /* ... */ }
```

```javascript
/**
 * Scroll viewport lên đầu khi pathname thay đổi.
 * Gắn trong App.jsx bên trong BrowserRouter.
 *
 * @component
 */
function ScrollToTop() { /* ... */ }
```

# Sprint 6 — Testing, Bugfix, Polish UI/UX, CI/CD, Hoàn thiện Docs

**Thời gian:** Tuần 11–12 (2 tuần)  
**Trạng thái:** Đang thực hiện (docs)  
**Completion:** **35%**

---

## Goal

Ổn định chất lượng: test tự động, sửa lỗi tích hợp FE-BE, polish UX, pipeline CI/CD, bộ tài liệu `docs/` đầy đủ sẵn commit.

---

## Tasks checklist

### Testing

- [ ] BE: Jest + Supertest cho auth, products, cart, orders
- [ ] FE: Vitest + React Testing Library (ProtectedRoute, ProductCard)
- [ ] E2E: Playwright (login → add cart → checkout)
- [x] Manual test guide auth (`BE/src/docs/API_AUTHENTICATION_GUIDE.md`)

### Bugfix & hardening

- [ ] Fix `cartSlice` API base URL (dùng `apiClient`)
- [ ] Fix Orders cancel HTTP method (PATCH vs POST)
- [ ] Bảo vệ `DELETE /products/:id` bằng admin auth
- [ ] Thống nhất `snake_case` / `camelCase` response
- [ ] Xử lý CORS + cookie trên mọi môi trường

### UI/UX polish

- [x] Loading states (auth spinner, skeleton grid)
- [ ] Toast notifications thống nhất — *chưa*
- [ ] Empty states (giỏ trống, không có đơn) — *partial*
- [ ] Form validation UX checkout — *partial*
- [ ] Accessibility (aria labels, keyboard nav) — *chưa audit*

### CI/CD

- [ ] GitHub Actions: lint + test on PR
- [ ] Auto deploy FE Vercel / BE Render on merge `main`
- [x] Deploy thủ công đã có (Render + Vercel config)
- [ ] Environment secrets document — *partial*

### Documentation

- [x] `docs/ERD.md`
- [x] `docs/API.md`
- [x] `docs/Architecture.md`
- [x] `docs/Sprint1.md` … `Sprint6.md`
- [ ] Root `README.md` hướng dẫn chạy monorepo — *chưa ở root*
- [ ] Postman collection export — *chưa*

---

## Status / Completion %

| Hạng mục | % |
|----------|---|
| Automated tests | 5% |
| Bugfix backlog | 40% |
| UI/UX polish | 55% |
| CI/CD | 20% |
| Documentation | 85% |
| **Tổng** | **35%** |

---

## Issues (ưu tiên Sprint 6)

| ID | Mô tả | Owner | Priority |
|----|--------|-------|----------|
| S6-01 | Không có test script (`npm test` exit 1 BE) | BE | P0 |
| S6-02 | API reviews/vouchers chưa có route | BE | P1 |
| S6-03 | Thiếu CI pipeline | DevOps | P1 |
| S6-04 | Duplicate docs `BE/src/docs` vs `docs/` | Docs | P2 — link hoặc deprecate |

---

## Notes

- Tài liệu `docs/` tại **repo root** là source chính cho reviewer; `BE/src/docs/` giữ error guides chuyên sâu.
- Sau Sprint 6 nên tag release `v1.0.0` khi: auth + cart + order + search ổn định + test smoke pass.

---

## Acceptance Criteria

| # | Tiêu chí | Đạt |
|---|----------|:---:|
| AC1 | `npm test` chạy được ≥10 test cases BE | ✗ |
| AC2 | CI pass trên PR vào `main` | ✗ |
| AC3 | Không còn bug P0 mở (auth, checkout, cart) | ~ |
| AC4 | Bộ `docs/` đủ ERD, API, Architecture, 6 sprint | ✓ |
| AC5 | Demo end-to-end 15 phút không lỗi | ~ |

---

## Docstring mẫu (Sprint 6 — test)

```javascript
/**
 * Integration test: đăng ký → login → thêm cart → đặt hàng.
 *
 * @test
 * @example
 *   const agent = request(app);
 *   const { body } = await agent.post('/api/auth/register').send({...});
 */
describe('Order flow', () => {
  it('places COD order successfully', async () => { /* ... */ });
});
```

```javascript
/**
 * Global error handler — chuẩn hóa mọi lỗi thrown từ services.
 * Gắn requestId từ req.id cho tracing.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) { /* ... */ }
```

---

## Reviewer checklist (trước merge release)

- [ ] Đọc [ERD.md](./ERD.md) — hiểu quan hệ `users` / `products` / `orders`
- [ ] Đọc [API.md](./API.md) — test auth + products/list + orders
- [ ] Đọc [Architecture.md](./Architecture.md) — trace checkout flow
- [ ] Rà Sprint 3–5 issues P0/P1
- [ ] Chạy smoke: register → login → add cart → checkout → view orders

# Sprint 2 — Auth, Protected Routes, Profile

**Thời gian:** Tuần 3–4 (2 tuần)  
**Trạng thái:** Hoàn thành phần lớn  
**Completion:** **90%**

---

## Goal

Triển khai đăng ký/đăng nhập JWT + refresh cookie, quản lý session DB, bảo vệ route FE, trang profile và đổi mật khẩu.

---

## Tasks checklist

- [x] BE: `POST /auth/register`, `/login`, `/logout`, `/refresh`
- [x] BE: Bảng `users`, `accounts`, `sessions`
- [x] BE: `authMiddleware.authenticate` (Bearer JWT)
- [x] BE: Session management (`/auth/sessions`, logout-all, delete session)
- [x] BE: `GET/PUT /users/me`
- [x] BE: `PUT /account/change-password`, forgot/reset password routes
- [x] FE: `AuthContext` — restore token qua `/auth/me`
- [x] FE: `ProtectedRoute` cho `/checkout`, `/orders`, `/my`
- [x] FE: `LoginPage` (login + register UI)
- [x] FE: `MyPage` — xem/sửa profile
- [x] FE: `apiClient` interceptor auto-refresh 401
- [ ] OAuth Google (`oauth_google` trong schema) — *chưa implement*
- [ ] Email verification flow — *schema có token, chưa gửi mail*
- [ ] Unit test auth service — *chưa có*

---

## Status / Completion %

| Hạng mục | % |
|----------|---|
| Auth API | 95% |
| Session & refresh | 90% |
| Protected routes FE | 100% |
| Profile CRUD | 85% |
| Security hardening | 75% |
| **Tổng** | **90%** |

---

## Issues

| ID | Mô tả | Mức độ |
|----|--------|--------|
| S2-01 | Login validator dùng `identifier` nhưng một số doc cũ ghi `email` | Thấp |
| S2-02 | Cross-origin cookie cần `SameSite=None` trên prod — đã config nhưng dễ lỗi khi test local | Trung bình |
| S2-03 | `authService` trộn `fetch` và `apiClient` — khó maintain | Trung bình |
| S2-04 | Chưa có rate limit brute-force login | Cao (backlog) |

---

## Notes

> **Highlight:** Access token lưu `localStorage`; refresh token **HTTP-only cookie** + row trong `sessions` — đúng pattern SPA + API.

Flow restore khi F5:
1. Đọc `accessToken` từ localStorage  
2. `GET /auth/me`  
3. Nếu 401 → interceptor gọi `/auth/refresh`  
4. Fail → clear storage → `/login`

---

## Acceptance Criteria

| # | Tiêu chí | Đạt |
|---|----------|:---:|
| AC1 | Đăng ký user mới → login được | ✓ |
| AC2 | Truy cập `/checkout` khi chưa login → redirect `/login` | ✓ |
| AC3 | F5 trang protected vẫn giữ session (nếu token valid) | ✓ |
| AC4 | Logout xóa cookie + invalidate session DB | ✓ |
| AC5 | Đổi mật khẩu khi đã login | ✓ (API); FE form tùy MyPage |

---

## Docstring mẫu (Sprint 2)

```javascript
/**
 * Middleware xác thực JWT từ Authorization Bearer header.
 * Gắn payload vào req.user: { id, userId, accountId, email, role }.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = async (req, res, next) => { /* ... */ };
```

```javascript
/**
 * Provider quản lý trạng thái đăng nhập toàn app.
 * Restore session on mount qua authService.getMe().
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) { /* ... */ }
```

```javascript
/**
 * Route guard — render children nếu đã auth, ngược lại Navigate to /login.
 *
 * @param {{ children: React.ReactNode }} props
 */
function ProtectedRoute({ children }) { /* ... */ }
```

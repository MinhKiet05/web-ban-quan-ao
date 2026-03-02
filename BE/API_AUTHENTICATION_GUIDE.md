# 🔐 Authentication API Guide

Quick guide để test các endpoints authentication và session management.

---

## 📋 Danh sách Endpoints

### Public Routes (không cần authentication)
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Làm mới access token

### Protected Routes (cần access token)
- `GET /api/auth/sessions` - Xem danh sách sessions
- `POST /api/auth/logout-all` - Đăng xuất tất cả thiết bị
- `DELETE /api/auth/sessions/:sessionId` - Đăng xuất một thiết bị

---

## 🚀 Test Flow

### 1. Đăng ký tài khoản mới

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": "usr001",
      "fullName": "Nguyễn Văn A",
      "email": "test@example.com",
      "phone": "0123456789",
      "role": "customer"
    },
    "account": {
      "id": "acc001",
      "accountType": "email",
      "identifier": "test@example.com",
      "isVerified": false
    }
  }
}
```

---

### 2. Đăng nhập

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
Device-Type: desktop

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "usr001",
      "fullName": "Nguyễn Văn A",
      "email": "test@example.com",
      "phone": "0123456789",
      "role": "customer",
      "avatarUrl": null,
      "tier": "normal",
      "loyaltyPoints": 0
    }
  },
  "token": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies nhận được:**
```
Set-Cookie: refreshToken=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**💾 Lưu accessToken để dùng cho các requests sau:**
```javascript
const accessToken = response.token.accessToken;
```

---

### 3. Gọi API với Access Token

```http
GET http://localhost:3000/api/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Khi access token hết hạn (sau 1 ngày), bạn sẽ nhận:**
```json
{
  "success": false,
  "message": "Token has expired.",
  "code": "TOKEN_EXPIRED"
}
```

→ Lúc này cần refresh token

---

### 4. Làm mới Access Token

```http
POST http://localhost:3000/api/auth/refresh
Cookie: refreshToken=eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Làm mới token thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NEW)"
  }
}
```

**💾 Update accessToken mới:**
```javascript
const newAccessToken = response.data.accessToken;
```

---

### 5. Xem danh sách Sessions (Phiên đăng nhập)

```http
GET http://localhost:3000/api/auth/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: refreshToken=eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách phiên đăng nhập thành công",
  "data": {
    "sessions": [
      {
        "id": "ses001",
        "deviceType": "desktop",
        "ipAddress": "192.168.1.100",
        "createdAt": "2026-03-02T09:00:00.000Z",
        "lastActivity": "2026-03-02T10:30:00.000Z",
        "expiresAt": "2026-03-09T09:00:00.000Z",
        "isCurrent": true
      },
      {
        "id": "ses002",
        "deviceType": "mobile",
        "ipAddress": "192.168.1.101",
        "createdAt": "2026-03-02T14:00:00.000Z",
        "lastActivity": "2026-03-02T14:05:00.000Z",
        "expiresAt": "2026-03-09T14:00:00.000Z",
        "isCurrent": false
      }
    ],
    "total": 2
  }
}
```

---

### 6. Đăng xuất khỏi một thiết bị cụ thể

```http
DELETE http://localhost:3000/api/auth/sessions/ses002
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Đã đăng xuất khỏi thiết bị"
}
```

---

### 7. Đăng xuất tất cả thiết bị

```http
POST http://localhost:3000/api/auth/logout-all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Đã đăng xuất khỏi 2 thiết bị",
  "data": {
    "sessionsDeactivated": 2
  }
}
```

**⚠️ Lưu ý:** Sau khi logout-all, TẤT CẢ thiết bị phải đăng nhập lại.

---

### 8. Đăng xuất (Session hiện tại)

```http
POST http://localhost:3000/api/auth/logout
Cookie: refreshToken=eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

**Cookies bị xóa:**
```
Set-Cookie: refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

---

## 🧪 Test với Postman/Thunder Client

### Setup Environment Variables

```
base_url = http://localhost:3000
access_token = (sẽ được update sau mỗi login/refresh)
```

### Collection Structure

```
📁 Authentication
  ├── 📄 1. Register
  ├── 📄 2. Login (save accessToken to environment)
  ├── 📄 3. Refresh Token
  └── 📄 4. Logout

📁 Session Management
  ├── 📄 1. Get Sessions
  ├── 📄 2. Logout from Device
  └── 📄 3. Logout All Devices
```

### Script tự động lưu token (Postman)

**Tests tab của request Login:**
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.token.accessToken);
}
```

**Pre-request Script cho protected routes:**
```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get("access_token")
});
```

---

## 🔍 Debugging Tips

### Kiểm tra JWT Token
Paste access token vào [jwt.io](https://jwt.io) để xem payload:

```json
{
  "accountId": "acc001",
  "userId": "usr001",
  "role": "customer",
  "email": "test@example.com",
  "iat": 1709370000,
  "exp": 1709456400
}
```

### Kiểm tra Cookies
Chrome DevTools → Application → Cookies → `localhost:3000`
- Tìm `refreshToken` cookie
- Verify: HttpOnly = ✓, Secure, SameSite = Strict

### Kiểm tra Database
```sql
-- Xem sessions của user
SELECT * FROM sessions WHERE user_id = 'usr001' AND is_active = TRUE;

-- Xem session details
SELECT 
    s.id,
    s.device_type,
    s.ip_address,
    s.is_active,
    s.created_at,
    s.last_activity_at,
    s.expires_at
FROM sessions s
WHERE s.user_id = 'usr001'
ORDER BY s.created_at DESC;
```

---

## ⚠️ Common Errors

### 1. "Access denied. No token provided."
- **Lý do:** Không có access token trong header
- **Fix:** Thêm `Authorization: Bearer {accessToken}` vào header

### 2. "Token has expired."
- **Lý do:** Access token đã hết hạn (sau 1 ngày)
- **Fix:** Gọi `/api/auth/refresh` để lấy token mới

### 3. "Invalid token."
- **Lý do:** Token bị sai hoặc không hợp lệ
- **Fix:** Login lại để lấy token mới

### 4. "REFRESH_TOKEN_INVALID"
- **Lý do:** Refresh token hết hạn hoặc đã bị logout
- **Fix:** Login lại

### 5. "Không tìm thấy phiên đăng nhập"
- **Lý do:** Session không tồn tại hoặc không phải của bạn
- **Fix:** Kiểm tra lại sessionId hoặc gọi GET /sessions

---

## 🔐 Security Notes

1. **Access Token**: 
   - Lưu trong memory hoặc localStorage
   - Thời gian ngắn (1 ngày)
   - Gửi qua Authorization header

2. **Refresh Token**: 
   - Lưu trong HTTP-only cookie
   - Thời gian dài (7 ngày)
   - Không thể truy cập từ JavaScript
   - Được verify với database

3. **Sessions**:
   - Mỗi login tạo 1 session mới
   - Theo dõi device, IP, user agent
   - Có thể revoke bất cứ lúc nào

4. **Best Practices**:
   - Logout khi phát hiện hoạt động lạ
   - Đổi password → logout all devices
   - Kiểm tra sessions thường xuyên
   - Không share access token

---

## 📱 Test Multiple Devices

### Scenario: Login từ 2 thiết bị khác nhau

**Device 1 (Desktop):**
```http
POST /api/auth/login
Device-Type: desktop
```

**Device 2 (Mobile):**
```http
POST /api/auth/login
Device-Type: mobile
```

**Kiểm tra sessions từ Device 1:**
```http
GET /api/auth/sessions
→ Returns 2 sessions (desktop + mobile)
```

**Logout Device 2 từ Device 1:**
```http
DELETE /api/auth/sessions/{mobile_session_id}
→ Device 2 không thể refresh token nữa
→ Device 1 vẫn hoạt động bình thường
```

---

*Last updated: March 2, 2026*

# 🔐 Refresh Token Flow - Session Management

## 📋 Tổng quan

Hệ thống sử dụng **JWT tokens** kết hợp với **Session Management trong Database** để tăng cường bảo mật và kiểm soát phiên đăng nhập.

### Kiến trúc:
- **Access Token**: JWT ngắn hạn (1 ngày), lưu ở client (localStorage/memory)
- **Refresh Token**: JWT dài hạn (7 ngày), lưu trong HTTP-only cookie + Database
- **Session Table**: Lưu trữ và quản lý tất cả refresh tokens

---

## 🔍 Luồng hoạt động

### 1️⃣ **ĐĂNG NHẬP (Login)**

#### Request:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Xử lý Backend:

```javascript
// 1. Validate credentials
const account = await findAccountByIdentifier(email);
const isMatch = await bcrypt.compare(password, account.password_hash);

// 2. Tạo JWT tokens
const accessToken = jwt.sign(
  { accountId, userId, role, email },
  JWT_SECRET,
  { expiresIn: '1d' }
);

const refreshToken = jwt.sign(
  { accountId, userId },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);

// 3. Lưu session vào database
await createSession({
  id: 'ses001',
  userId: 'usr001',
  accountId: 'acc001',
  sessionToken: accessToken,        // Lưu access token
  refreshToken: refreshToken,       // Lưu refresh token
  deviceType: 'desktop',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  expiresAt: new Date('2026-03-09') // 7 ngày sau
});
```

#### Response:
```http
HTTP/1.1 200 OK
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
            HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800

{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "id": "usr001",
      "fullName": "Nguyễn Văn A",
      "email": "user@example.com",
      "role": "customer"
    }
  },
  "token": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Database State:
```sql
-- Table: sessions
┌────────┬─────────┬────────────┬─────────────────┬─────────────────┬──────────┬───────────────┬────────────┬──────────────┐
│   id   │ user_id │ account_id │ session_token   │ refresh_token   │ is_active│  ip_address   │ device_type│  expires_at  │
├────────┼─────────┼────────────┼─────────────────┼─────────────────┼──────────┼───────────────┼────────────┼──────────────┤
│ ses001 │ usr001  │ acc001     │ eyJhbGc...      │ eyJhbGc...      │   TRUE   │ 192.168.1.100 │  desktop   │ 2026-03-09   │
└────────┴─────────┴────────────┴─────────────────┴─────────────────┴──────────┴───────────────┴────────────┴──────────────┘
```

#### Client State:
```javascript
// Lưu trong localStorage hoặc memory
localStorage.setItem('accessToken', 'eyJhbGc...');

// Cookie được browser tự động lưu (HTTP-only)
// Cookie: refreshToken=eyJhbGc... (không thể truy cập từ JS)
```

---

### 2️⃣ **GỌI API VỚI ACCESS TOKEN**

#### Request:
```http
GET /api/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Middleware kiểm tra:
```javascript
// authMiddleware.js
const token = req.headers.authorization?.split(' ')[1];

// Verify JWT
const decoded = jwt.verify(token, JWT_SECRET);

// Token hợp lệ → cho phép truy cập
req.user = decoded;
next();
```

---

### 3️⃣ **REFRESH TOKEN (Khi Access Token hết hạn)**

#### Khi nào cần refresh?
- Access token hết hạn (sau 1 ngày)
- Client nhận response `401 Unauthorized` với error code `TOKEN_EXPIRED`

#### Request:
```http
POST /api/auth/refresh
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Xử lý Backend:

```javascript
// 1. Lấy refresh token từ cookie
const refreshToken = req.cookies.refreshToken;

// 2. Verify JWT refresh token
const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
// → { accountId: 'acc001', userId: 'usr001', exp: 1741478400 }

// 3. Kiểm tra session trong database
const session = await findSessionByRefreshToken(refreshToken);

/*
SELECT s.*, u.role, u.email, u.is_active as user_is_active
FROM sessions s
INNER JOIN accounts a ON s.account_id = a.id
INNER JOIN users u ON s.user_id = u.id
WHERE s.refresh_token = $1 
AND s.is_active = TRUE
AND s.expires_at > NOW()
*/

// 4. Validate session
if (!session) {
  throw new Error('REFRESH_TOKEN_INVALID'); // Session không tồn tại hoặc đã logout
}

if (!session.user_is_active) {
  throw new Error('ACCOUNT_LOCKED'); // User bị khóa
}

// 5. Tạo access token mới
const newAccessToken = jwt.sign(
  { accountId: session.account_id, userId: session.user_id, role: session.role, email: session.email },
  JWT_SECRET,
  { expiresIn: '1d' }
);

// 6. Cập nhật session token trong database
await updateSessionToken(refreshToken, newAccessToken);
/*
UPDATE sessions 
SET session_token = $1, last_activity_at = NOW()
WHERE refresh_token = $2
*/
```

#### Response:
```http
HTTP/1.1 200 OK

{
  "success": true,
  "message": "Làm mới token thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NEW)"
  }
}
```

#### Database State (sau refresh):
```sql
-- session_token đã được cập nhật, last_activity_at được refresh
┌────────┬──────────────────────┬──────────────────────┬─────────────────────┐
│   id   │   session_token      │   last_activity_at   │     is_active       │
├────────┼──────────────────────┼──────────────────────┼─────────────────────┤
│ ses001 │ eyJhbGc... (NEW)     │ 2026-03-02 10:30:00  │       TRUE          │
└────────┴──────────────────────┴──────────────────────┴─────────────────────┘
```

---

### 4️⃣ **ĐĂNG XUẤT (Logout)**

#### Request:
```http
POST /api/auth/logout
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Xử lý Backend:

```javascript
// 1. Lấy refresh token từ cookie
const refreshToken = req.cookies.refreshToken;

// 2. Vô hiệu hóa session trong database
await deactivateSession(refreshToken);
/*
UPDATE sessions 
SET is_active = FALSE, last_activity_at = NOW()
WHERE refresh_token = $1
*/

// 3. Xóa cookie
res.clearCookie('refreshToken', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/'
});
```

#### Response:
```http
HTTP/1.1 200 OK
Set-Cookie: refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT

{
  "success": true,
  "message": "Đăng xuất thành công"
}
```

#### Database State:
```sql
-- Session bị vô hiệu hóa
┌────────┬───────────────┬─────────────────────┐
│   id   │  is_active    │  last_activity_at   │
├────────┼───────────────┼─────────────────────┤
│ ses001 │    FALSE      │ 2026-03-02 14:00:00 │
└────────┴───────────────┴─────────────────────┘
```

---

## 🔐 Tình huống bảo mật

### Scenario 1: Token bị đánh cắp

**Tình huống**: Hacker lấy được refresh token của user

**Giải pháp**:
```javascript
// User phát hiện và logout từ tất cả thiết bị
POST /api/auth/logout-all-devices

// Backend vô hiệu hóa TẤT CẢ sessions của user
await deactivateAllUserSessions(userId);
/*
UPDATE sessions 
SET is_active = FALSE
WHERE user_id = $1
*/

// → Refresh token bị đánh cắp không còn có giá trị
```

### Scenario 2: Đổi mật khẩu

```javascript
// Khi user đổi password
POST /api/auth/change-password

// Backend tự động logout khỏi tất cả thiết bị
await deactivateAllUserSessions(userId);

// User phải login lại với password mới
```

### Scenario 3: Nhiều thiết bị đăng nhập

```javascript
// User đăng nhập từ Desktop
// → Session ses001 được tạo

// User đăng nhập từ Mobile
// → Session ses002 được tạo

// Xem danh sách phiên đăng nhập
GET /api/auth/sessions
// Response:
{
  "sessions": [
    {
      "id": "ses001",
      "deviceType": "desktop",
      "ipAddress": "192.168.1.100",
      "lastActivity": "2026-03-02 10:30:00",
      "current": true
    },
    {
      "id": "ses002",
      "deviceType": "mobile",
      "ipAddress": "192.168.1.101",
      "lastActivity": "2026-03-02 09:00:00",
      "current": false
    }
  ]
}

// Logout từ xa (từ mobile)
DELETE /api/auth/sessions/ses001
```

---

## 📊 Ví dụ hoàn chỉnh với Timeline

### User: Nguyễn Văn A

**09:00 - Đăng nhập từ Desktop**
```
→ POST /api/auth/login
→ Session ses001 created
→ accessToken: "eyJ...abc" (expires: 10:00 ngày 03/03)
→ refreshToken: "eyJ...xyz" (expires: 16:00 ngày 09/03)
```

**14:00 - Đăng nhập từ Mobile**
```
→ POST /api/auth/login (device: mobile)
→ Session ses002 created
→ User hiện có 2 sessions active
```

**10:30 ngày 03/03 - Access token Desktop hết hạn**
```
→ GET /api/products (với old accessToken)
← 401 Unauthorized { code: "TOKEN_EXPIRED" }

→ POST /api/auth/refresh (với refreshToken từ cookie)
← 200 OK { accessToken: "eyJ...def" (NEW) }

→ GET /api/products (với new accessToken)
← 200 OK { products: [...] }
```

**15:00 ngày 03/03 - Đổi password**
```
→ POST /api/auth/change-password
→ Backend: deactivateAllUserSessions('usr001')
→ Database: ses001.is_active = FALSE, ses002.is_active = FALSE

→ POST /api/auth/refresh (trên cả Desktop và Mobile)
← 401 Unauthorized { code: "REFRESH_TOKEN_INVALID" }

→ Cả 2 thiết bị phải login lại với password mới
```

---

## 🛡️ Lợi ích của phương pháp này

### ✅ So với chỉ dùng JWT thuần:

| Tính năng | JWT thuần | JWT + Session DB | Lợi ích |
|-----------|-----------|------------------|---------|
| Revoke token | ❌ Không thể | ✅ Có thể | Logout thực sự, xử lý khi đổi password |
| Logout tất cả thiết bị | ❌ Không thể | ✅ Có thể | Bảo mật khi phát hiện xâm nhập |
| Theo dõi phiên đăng nhập | ❌ Không có | ✅ Có đầy đủ | Audit trail, phát hiện bất thường |
| Quản lý thiết bị | ❌ Không thể | ✅ Được | User thấy devices đang login |
| Giới hạn số phiên | ❌ Không thể | ✅ Có thể | VIP: 5 devices, Normal: 2 devices |

### ⚠️ Trade-offs:

- **Database query thêm**: Mỗi lần refresh cần query DB
  - *Giải pháp*: Cache session bằng Redis, query chỉ khi cache miss
  
- **Storage**: Sessions table sẽ lớn dần
  - *Giải pháp*: Cleanup job xóa sessions cũ (>30 ngày inactive)

---

## 🧹 Maintenance Tasks

### Cleanup expired sessions (chạy hàng ngày):

```javascript
// Scheduled job (cron)
const { deleteExpiredSessions } = require('./model/session.model');

// Xóa sessions đã hết hạn hoặc inactive >30 ngày
const deletedCount = await deleteExpiredSessions();
console.log(`Deleted ${deletedCount} expired sessions`);
```

```sql
DELETE FROM sessions 
WHERE expires_at < NOW()
OR (is_active = FALSE AND last_activity_at < NOW() - INTERVAL '30 days')
```

---

## 🔍 Debug & Monitoring

### Kiểm tra session của user:

```sql
-- Xem tất cả sessions active
SELECT 
  s.id,
  s.device_type,
  s.ip_address,
  s.created_at,
  s.last_activity_at,
  CASE 
    WHEN s.expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as status
FROM sessions s
WHERE s.user_id = 'usr001'
AND s.is_active = TRUE
ORDER BY s.last_activity_at DESC;
```

### Phát hiện hoạt động bất thường:

```sql
-- User đăng nhập từ nhiều IP khác nhau trong thời gian ngắn
SELECT 
  user_id,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(*) as session_count
FROM sessions
WHERE created_at > NOW() - INTERVAL '1 hour'
AND is_active = TRUE
GROUP BY user_id
HAVING COUNT(DISTINCT ip_address) > 3;
```

---

## 📝 Best Practices

1. **Access Token ngắn hạn**: 15 phút - 1 ngày
2. **Refresh Token dài hạn hợp lý**: 7-30 ngày
3. **HTTP-only cookie**: Chống XSS
4. **Secure flag**: HTTPS only trong production
5. **SameSite=Strict**: Chống CSRF
6. **Validate session trong DB**: Mỗi lần refresh
7. **Cleanup job**: Xóa sessions cũ định kỳ
8. **Rate limiting**: Giới hạn refresh requests
9. **Logging**: Log mọi refresh/logout activities
10. **Monitor**: Cảnh báo khi có hoạt động bất thường

---

## 🚀 Tương lai: Nâng cấp với Redis

```javascript
// Cache session trong Redis (TTL = refresh token expiry)
await redis.setex(
  `session:${refreshToken}`, 
  7 * 24 * 60 * 60,  // 7 days
  JSON.stringify(session)
);

// Verify nhanh từ Redis
const cached = await redis.get(`session:${refreshToken}`);
if (cached) {
  return JSON.parse(cached); // Không cần query DB
}

// Cache miss → query DB → update cache
```

**Performance gain**: ~100x nhanh hơn (< 1ms vs ~50-100ms DB query)

---

*Document version: 1.0*  
*Last updated: March 2, 2026*

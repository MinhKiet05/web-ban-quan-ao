# Quick Start - Sử dụng Error Handling

## 1️⃣ Cấu trúc đã setup

```
BE/
├── src/
│   ├── constants/
│   │   ├── errors.js                    ✅ Tất cả error definitions
│   │   ├── ERRORS_USAGE_GUIDE.md        📖 Hướng dẫn chi tiết
│   │   └── httpStatus.js
│   ├── middlewares/
│   │   ├── errorHandler.js              ✅ Global error handler
│   │   └── authMiddleware.js
│   └── controller/
│       └── auth.controller.js           ✅ Đã cập nhật với examples
└── server.js                            ✅ Đã tích hợp error handlers
```

---

## 2️⃣ Basic Usage

### Trong Controller
```javascript
const { createError, AUTH_ERRORS } = require('../constants/errors');

const login = async (req, res, next) => {
  try {
    const user = await UserService.login(req.body);
    
    if (!user) {
      throw createError(AUTH_ERRORS.AUTH_CREDENTIALS_INVALID);
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);  // Pass to error handler
  }
};
```

### Validation Errors
```javascript
const { createValidationError } = require('../constants/errors');

if (!email) {
  throw createValidationError([
    { field: 'email', message: 'Email là bắt buộc' }
  ]);
}
```

---

## 3️⃣ Available Error Types

```javascript
const {
  AUTH_ERRORS,         // Đăng nhập, token, OAuth
  VALIDATION_ERRORS,   // Validation dữ liệu
  USER_ERRORS,         // User operations
  PRODUCT_ERRORS,      // Sản phẩm
  CART_ERRORS,         // Giỏ hàng
  ORDER_ERRORS,        // Đơn hàng
  PAYMENT_ERRORS,      // Thanh toán
  VOUCHER_ERRORS,      // Voucher
  REVIEW_ERRORS        // Đánh giá
} = require('../constants/errors');
```

---

## 4️⃣ Example Errors

```javascript
// Authentication
AUTH_ERRORS.AUTH_CREDENTIALS_INVALID
AUTH_ERRORS.TOKEN_EXPIRED
AUTH_ERRORS.DUPLICATE_EMAIL

// Cart
CART_ERRORS.INSUFFICIENT_STOCK
CART_ERRORS.PRODUCT_OUT_OF_STOCK

// Order
ORDER_ERRORS.ORDER_CANNOT_CANCEL
ORDER_ERRORS.MIN_ORDER_NOT_MET

// Voucher
VOUCHER_ERRORS.VOUCHER_EXPIRED
VOUCHER_ERRORS.VOUCHER_NOT_FOUND
```

---

## 5️⃣ Response Format

### Success Response
```json
{
  "success": true,
  "data": { "user": {...} }
}
```

### Error Response (tự động format)
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Sản phẩm không tồn tại",
    "timestamp": "2026-02-24T10:30:00Z",
    "path": "/api/products/123",
    "requestId": "req_1234567890"
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      {
        "field": "email",
        "message": "Email không đúng định dạng",
        "value": "test"
      }
    ],
    "timestamp": "2026-02-24T10:30:00Z",
    "path": "/api/auth/register",
    "requestId": "req_1234567890"
  }
}
```

---

## 6️⃣ Testing

### Test với Postman/Thunder Client

**Invalid credentials:**
```bash
POST http://localhost:3000/api/auth/login
{
  "identifier": "wrong@email.com",
  "password": "wrongpass"
}

# Response: 401 AUTH_CREDENTIALS_INVALID
```

**Validation error:**
```bash
POST http://localhost:3000/api/auth/register
{
  "email": "invalid-email",
  "password": "123"
}

# Response: 400 VALIDATION_ERROR với details
```

---

## 7️⃣ Next Steps

1. ✅ **Setup Complete** - Error system đã sẵn sàng
2. 📝 Implement các service methods (UserService.login, etc.)
3. 🔐 Setup JWT authentication
4. 🗄️ Connect database
5. 📊 Xem file [ERRORS_USAGE_GUIDE.md](./src/constants/ERRORS_USAGE_GUIDE.md) để biết thêm chi tiết

---

## 🚀 Chạy Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test health check
curl http://localhost:3000
```

---

## 📖 Documentation

- **Chi tiết**: Xem [ERRORS_USAGE_GUIDE.md](./src/constants/ERRORS_USAGE_GUIDE.md)
- **API Spec**: Xem [API_Specification.md](./API_Specification.md)

---

## Tips

✅ **Luôn sử dụng** `createError()` thay vì tự tạo error  
✅ **Luôn pass error** vào `next(error)` trong controller  
✅ **Luôn wrap** async functions trong try/catch  
✅ **Validation**: Dùng `createValidationError()` cho field errors  
❌ **Không return** error response trực tiếp từ controller  
❌ **Không hardcode** status codes hay error messages  

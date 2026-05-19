# Giải Thích Về Error Handling System

## Tổng Quan
Hệ thống xử lý lỗi trong project gồm 2 phần chính:
1. **Constants/errors.js** - Định nghĩa các loại lỗi
2. **Middlewares/errorHandler.js** - Xử lý và phản hồi lỗi

---

## 1. ERRORS Ở CONSTANTS (`src/constants/errors.js`)

### Vai Trò
**Định nghĩa các loại lỗi (Error Definitions)** - "NÓI VỀ LỖI"

### Chức Năng
-  Khai báo tất cả các loại lỗi có thể xảy ra trong hệ thống
-  Lưu trữ thông tin: `message`, `statusCode`, `errorCode`
-  Cung cấp `AppError` class để tạo error object có cấu trúc chuẩn
-  **Để controllers/services THROW lỗi**

### Cấu Trúc
```javascript
// Định nghĩa loại lỗi
const AUTH_ERRORS = {
  TOKEN_EXPIRED: {
    message: 'Token đã hết hạn',
    statusCode: 401,
    errorCode: 'TOKEN_EXPIRED'
  },
  // ... các lỗi khác
}

const USER_ERRORS = { ... }
const VALIDATION_ERRORS = { ... }

// Class để tạo error object
class AppError extends Error {
  constructor(message, statusCode, errorCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

// Helper function để tạo lỗi nhanh
function createError(errorTemplate, customMessage) {
  return new AppError(
    customMessage || errorTemplate.message,
    errorTemplate.statusCode,
    errorTemplate.errorCode
  );
}
```

### Cách Sử Dụng Trong Code

#### Trong Controller/Service
```javascript
const { createError, USER_ERRORS } = require('../constants');

// Throw lỗi khi không tìm thấy user
const user = await findUserById(id);
if (!user) {
  throw createError(USER_ERRORS.USER_NOT_FOUND);
}

// Throw lỗi với custom message
if (!email) {
  throw createError(
    VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 
    'Email là bắt buộc'
  );
}
```

### Các Nhóm Lỗi
- `AUTH_ERRORS` - Lỗi xác thực (login, token, OAuth)
- `VALIDATION_ERRORS` - Lỗi validation dữ liệu
- `USER_ERRORS` - Lỗi liên quan user
- `ADDRESS_ERRORS` - Lỗi địa chỉ
- `PRODUCT_ERRORS` - Lỗi sản phẩm
- `CART_ERRORS` - Lỗi giỏ hàng
- `ORDER_ERRORS` - Lỗi đơn hàng
- `DB_ERRORS` - Lỗi database

---

## 2. ERRORS Ở MIDDLEWARE (`src/middlewares/errorHandler.js`)

### Vai Trò
**Xử lý lỗi tập trung (Global Error Handler)** - "BẮT VÀ PHẢN HỒI LỖI"

### Chức Năng
-  **BẮT** mọi lỗi được throw ra trong toàn bộ application
-  **PHÂN LOẠI** lỗi (AppError, JWT error, MySQL error, Multer error, etc.)
-  **CHUYỂN ĐỔI** các lỗi hệ thống thành AppError
-  **FORMAT** response chuẩn API
-  **LOG** thông tin lỗi ra console/file
-  **TRẢ VỀ** JSON response cho client

### Các Components

#### 1. `errorHandler` - Global Error Handler
```javascript
const errorHandler = (err, req, res, next) => {
  // 1. Generate request ID
  const requestId = generateRequestId();
  
  // 2. Log error details
  console.error('Error occurred:', errorLog);
  
  // 3. Xử lý theo loại lỗi
  if (err instanceof AppError) {
    // AppError từ constants -> dùng trực tiếp
    statusCode = err.statusCode;
  } 
  else if (err.name === 'JsonWebTokenError') {
    // JWT error -> convert sang AppError
    processedError = createAppError(...);
  }
  else if (err.code === 'ER_DUP_ENTRY') {
    // MySQL duplicate entry -> convert sang AppError
    processedError = createAppError(...);
  }
  // ... xử lý các loại lỗi khác
  
  // 4. Format và trả về response
  return res.status(statusCode).json(errorResponse);
}
```

#### 2. `notFoundHandler` - 404 Handler
```javascript
const notFoundHandler = (req, res, next) => {
  // Xử lý route không tồn tại
  const notFoundError = new AppError(
    `Không tìm thấy route: ${req.method} ${req.path}`,
    404,
    'NOT_FOUND'
  );
  return res.status(404).json(errorResponse);
}
```

#### 3. `asyncHandler` - Async Wrapper
```javascript
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Công dụng**: Tự động catch lỗi trong async functions và chuyển đến errorHandler

**Cách dùng**:
```javascript
// Không cần try-catch nữa!
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  // Nếu có lỗi -> tự động catch và chuyển đến errorHandler
  res.json({ success: true, data: user });
}));
```

### Cách Setup Trong App

```javascript
// server.js hoặc app.js
const { errorHandler, notFoundHandler, asyncHandler } = require('./middlewares/errorHandler');

// ... các routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Đặt notFoundHandler SAU tất cả routes
app.use(notFoundHandler);

// Đặt errorHandler CUỐI CÙNG
app.use(errorHandler);
```

---

## FLOW HOẠT ĐỘNG TOÀN BỘ HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT GỬI REQUEST                                       │
│    GET /api/users/123                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ROUTE HANDLER (Controller)                               │
│    asyncHandler(async (req, res) => {                       │
│      const user = await userService.getProfile(req.params.id)│
│    })                                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE LAYER                                            │
│    async getProfile(id) {                                   │
│      const user = await findUserById(id);                   │
│      if (!user) {                                           │
│        throw createError(USER_ERRORS.USER_NOT_FOUND); ← CONSTANTS│
│      }                                                       │
│      return user;                                           │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. LỖI ĐƯỢC THROW                                           │
│    AppError {                                               │
│      message: 'Người dùng không tồn tại',                   │
│      statusCode: 404,                                       │
│      errorCode: 'USER_NOT_FOUND'                            │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ASYNC HANDLER BẮT LỖI                                    │
│    .catch(next) → chuyển lỗi đến errorHandler               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ERROR HANDLER MIDDLEWARE XỬ LÝ        ← MIDDLEWARE       │
│    - Nhận AppError                                          │
│    - Log error details                                      │
│    - Format response                                        │
│    - Trả về JSON                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. CLIENT NHẬN RESPONSE                                     │
│    Status: 404 Not Found                                    │
│    {                                                         │
│      "success": false,                                      │
│      "error": {                                             │
│        "code": "USER_NOT_FOUND",                            │
│        "message": "Người dùng không tồn tại",               │
│        "timestamp": "2026-03-10T10:30:00.000Z"              │
│      },                                                     │
│      "path": "/api/users/123",                              │
│      "requestId": "req_1234567890_abc123"                   │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## SO SÁNH CONSTANTS vs MIDDLEWARE

| Tiêu chí | Constants/errors.js | Middleware/errorHandler.js |
|----------|---------------------|---------------------------|
| **Vai trò** | Định nghĩa loại lỗi | Xử lý và phản hồi lỗi |
| **Khi nào dùng** | Khi **THROW** lỗi | Tự động **BẮT** lỗi |
| **Nơi sử dụng** | Controllers, Services, Models | App.js (global middleware) |
| **Output** | Tạo Error object | Tạo HTTP Response JSON |
| **Ví dụ** | `throw createError(USER_ERRORS.USER_NOT_FOUND)` | `app.use(errorHandler)` |
| **Import** | `require('../constants/errors')` | `require('../middlewares/errorHandler')` |
| **Mục đích** | Chuẩn hóa các loại lỗi | Chuẩn hóa cách xử lý lỗi |

---

## BEST PRACTICES

### 1. Khi Tạo Lỗi Mới
```javascript
//  TốT - Sử dụng constants
throw createError(USER_ERRORS.USER_NOT_FOUND);

//  TỐT - Với custom message
throw createError(
  VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 
  'Email là bắt buộc'
);

//  TRÁNH - Tạo lỗi thủ công
throw new Error('User not found'); // Thiếu statusCode, errorCode
```

### 2. Với Async Functions
```javascript
//  TỐT - Dùng asyncHandler
router.get('/users', asyncHandler(async (req, res) => {
  const users = await getUsers();
  res.json({ success: true, data: users });
}));

//  TRÁNH - Try-catch thủ công mọi nơi
router.get('/users', async (req, res, next) => {
  try {
    const users = await getUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error); // Dư thừa khi có asyncHandler
  }
});
```

### 3. Validation
```javascript
//  TỐT - Throw lỗi cụ thể
if (!email) {
  throw createError(VALIDATION_ERRORS.MISSING_REQUIRED_FIELD, 'Email là bắt buộc');
}

if (!isValidEmail(email)) {
  throw createError(VALIDATION_ERRORS.INVALID_EMAIL_FORMAT);
}

//  TRÁNH - Lỗi chung chung
if (!email || !isValidEmail(email)) {
  throw new Error('Invalid input');
}
```

### 4. Multiple Validation Errors
```javascript
//  TỐT - Trả về nhiều lỗi validation cùng lúc
const errors = [];
if (!email) errors.push({ field: 'email', message: 'Email là bắt buộc' });
if (!password) errors.push({ field: 'password', message: 'Password là bắt buộc' });

if (errors.length > 0) {
  throw createValidationError(errors);
}
```

---

## KẾT LUẬN

**Constants/errors.js** và **Middleware/errorHandler.js** hoạt động **cùng nhau** tạo thành một hệ thống xử lý lỗi hoàn chỉnh:

- **Constants**: Định nghĩa "TỪ ĐIỂN" các lỗi
- **Middleware**: "BẪY" bắt và xử lý các lỗi đó

Khi code, bạn chỉ cần:
1.  Throw lỗi từ constants: `throw createError(...)`
2.  Wrap async functions bằng `asyncHandler`
3.  Setup errorHandler trong app
4.  Không cần try-catch ở mọi nơi!

Hệ thống sẽ tự động bắt, xử lý và trả về response chuẩn cho client.

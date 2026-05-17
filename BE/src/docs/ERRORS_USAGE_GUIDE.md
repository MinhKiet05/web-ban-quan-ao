# Hướng Dẫn Sử Dụng Error Constants

## Mục lục
1. [Cách Import](#cách-import)
2. [Sử dụng trong Controller](#sử-dụng-trong-controller)
3. [Sử dụng trong Service](#sử-dụng-trong-service)
4. [Sử dụng trong Middleware](#sử-dụng-trong-middleware)
5. [Validation Errors](#validation-errors)
6. [Error Handler Middleware](#error-handler-middleware)

---

## Cách Import

### Import tất cả errors
```javascript
const {
  AppError,
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  PRODUCT_ERRORS,
  CART_ERRORS,
  ORDER_ERRORS,
  createError,
  createValidationError
} = require('../constants/errors');
```

### Import chỉ những gì cần
```javascript
const { createError, AUTH_ERRORS } = require('../constants/errors');
const { HTTP_STATUS } = require('../constants/httpStatus');
```

---

## Sử dụng trong Controller

### 1. Basic Error Handling
```javascript
const { createError, AUTH_ERRORS, USER_ERRORS } = require('../constants/errors');

const AuthController = {
  login: async (req, res, next) => {
    try {
      const { identifier, password } = req.body;

      // Kiểm tra input
      if (!identifier || !password) {
        throw createError(AUTH_ERRORS.AUTH_CREDENTIALS_INVALID);
      }

      const user = await UserService.findByIdentifier(identifier);
      
      if (!user) {
        throw createError(AUTH_ERRORS.AUTH_CREDENTIALS_INVALID);
      }

      if (user.is_locked) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_LOCKED);
      }

      if (!user.is_verified) {
        throw createError(AUTH_ERRORS.AUTH_ACCOUNT_UNVERIFIED);
      }

      // ... logic đăng nhập
      
      res.status(200).json({
        success: true,
        data: {
          user: user,
          tokens: tokens
        }
      });
      
    } catch (error) {
      next(error); // Pass error to error handler middleware
    }
  }
};
```

### 2. Custom Error Message
```javascript
const ProductController = {
  getProductBySlug: async (req, res, next) => {
    try {
      const { slug } = req.params;
      
      const product = await ProductService.findBySlug(slug);
      
      if (!product) {
        // Sử dụng message tùy chỉnh
        throw createError(
          PRODUCT_ERRORS.PRODUCT_NOT_FOUND, 
          `Không tìm thấy sản phẩm với slug: ${slug}`
        );
      }

      res.status(200).json({
        success: true,
        data: { product }
      });
      
    } catch (error) {
      next(error);
    }
  }
};
```

### 3. Error với Details
```javascript
const OrderController = {
  createOrder: async (req, res, next) => {
    try {
      const { cart_items, address_id } = req.body;
      
      // Kiểm tra tồn kho
      const stockCheck = await ProductService.checkStock(cart_items);
      
      if (!stockCheck.isValid) {
        throw createError(
          CART_ERRORS.INSUFFICIENT_STOCK,
          'Một số sản phẩm không đủ hàng',
          stockCheck.invalidItems // Array of items with stock issues
        );
      }

      // ... tạo đơn hàng
      
    } catch (error) {
      next(error);
    }
  }
};
```

---

## Sử dụng trong Service

### Service Layer Error Handling
```javascript
const { createError, USER_ERRORS, DB_ERRORS } = require('../constants/errors');

const UserService = {
  getUserById: async (userId) => {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (result.length === 0) {
        throw createError(USER_ERRORS.USER_NOT_FOUND);
      }

      return result[0];
      
    } catch (error) {
      // Nếu là AppError thì throw lại
      if (error.isOperational) {
        throw error;
      }
      
      // Nếu là database error, wrap nó
      throw createError(
        DB_ERRORS.QUERY_FAILED,
        'Lỗi truy vấn dữ liệu người dùng'
      );
    }
  },

  updateUser: async (userId, updateData) => {
    try {
      const user = await UserService.getUserById(userId);
      
      const result = await db.query(
        'UPDATE users SET ? WHERE id = ?',
        [updateData, userId]
      );

      if (result.affectedRows === 0) {
        throw createError(USER_ERRORS.USER_UPDATE_FAILED);
      }

      return await UserService.getUserById(userId);
      
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createError(DB_ERRORS.QUERY_FAILED);
    }
  }
};
```

---

## Validation Errors

### 1. Single Field Validation
```javascript
const { createValidationError } = require('../constants/errors');

const validateRegister = (data) => {
  const errors = [];

  if (!data.email) {
    errors.push({
      field: 'email',
      message: 'Email là bắt buộc',
      value: data.email
    });
  } else if (!isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Email không đúng định dạng',
      value: data.email
    });
  }

  if (!data.password || data.password.length < 6) {
    errors.push({
      field: 'password',
      message: 'Mật khẩu phải có ít nhất 6 ký tự',
      value: null // Don't expose password
    });
  }

  if (errors.length > 0) {
    throw createValidationError(errors);
  }
};

// Sử dụng trong controller
const register = async (req, res, next) => {
  try {
    validateRegister(req.body);
    
    // ... tiếp tục logic đăng ký
    
  } catch (error) {
    next(error);
  }
};
```

### 2. Validation với Express Validator
```javascript
const { validationResult } = require('express-validator');
const { createValidationError } = require('../constants/errors');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    throw createValidationError(formattedErrors);
  }
  
  next();
};
```

---

## Sử dụng trong Middleware

### Auth Middleware với Errors
```javascript
const jwt = require('jsonwebtoken');
const { createError, AUTH_ERRORS } = require('../constants/errors');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError(AUTH_ERRORS.TOKEN_MISSING);
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw createError(AUTH_ERRORS.TOKEN_EXPIRED);
      }
      throw createError(AUTH_ERRORS.TOKEN_INVALID);
    }
    
  } catch (error) {
    next(error);
  }
};
```

---

## Error Handler Middleware

### Global Error Handler
```javascript
const { AppError, formatErrorResponse } = require('../constants/errors');
const { HTTP_STATUS } = require('../constants/httpStatus');

const errorHandler = (err, req, res, next) => {
  // Generate request ID (hoặc lấy từ middleware trước)
  const requestId = req.id || generateRequestId();
  
  // Log error
  console.error('Error:', {
    requestId,
    path: req.path,
    method: req.method,
    error: err
  });

  // Nếu là AppError (operational error)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
        timestamp: err.timestamp,
        path: req.path,
        requestId: requestId
      }
    });
  }

  // Nếu là error không mong đợi
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Đã xảy ra lỗi không xác định' 
        : err.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId: requestId,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;
```

### Thêm vào app.js
```javascript
const express = require('express');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ... routes

// Error handler phải là middleware cuối cùng
app.use(errorHandler);

module.exports = app;
```

---

## Ví Dụ Đầy Đủ

### Complete Cart Controller Example
```javascript
const {
  createError,
  CART_ERRORS,
  PRODUCT_ERRORS,
  createValidationError
} = require('../constants/errors');
const CartService = require('../services/cart.service');

const CartController = {
  // Thêm item vào giỏ hàng
  addItem: async (req, res, next) => {
    try {
      const { variant_id, quantity } = req.body;
      const userId = req.user.id;

      // Validation
      if (!variant_id || !quantity) {
        throw createValidationError([
          { field: 'variant_id', message: 'Variant ID là bắt buộc' },
          { field: 'quantity', message: 'Số lượng là bắt buộc' }
        ]);
      }

      if (quantity < 1) {
        throw createError(CART_ERRORS.INVALID_QUANTITY);
      }

      // Kiểm tra variant tồn tại
      const variant = await ProductService.getVariantById(variant_id);
      if (!variant) {
        throw createError(PRODUCT_ERRORS.VARIANT_NOT_FOUND);
      }

      // Kiểm tra tồn kho
      if (variant.stock_qty === 0) {
        throw createError(CART_ERRORS.PRODUCT_OUT_OF_STOCK);
      }

      if (variant.stock_qty < quantity) {
        throw createError(
          CART_ERRORS.INSUFFICIENT_STOCK,
          `Chỉ còn ${variant.stock_qty} sản phẩm trong kho`
        );
      }

      // Thêm vào giỏ hàng
      const cart = await CartService.addItem(userId, variant_id, quantity);

      res.status(201).json({
        success: true,
        data: { cart }
      });

    } catch (error) {
      next(error);
    }
  },

  // Cập nhật số lượng
  updateQuantity: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      const userId = req.user.id;

      if (quantity < 1) {
        throw createError(CART_ERRORS.INVALID_QUANTITY);
      }

      const cartItem = await CartService.getItemById(id, userId);
      if (!cartItem) {
        throw createError(CART_ERRORS.CART_ITEM_NOT_FOUND);
      }

      // Kiểm tra tồn kho
      if (cartItem.variant.stock_qty < quantity) {
        throw createError(
          CART_ERRORS.INSUFFICIENT_STOCK,
          `Chỉ còn ${cartItem.variant.stock_qty} sản phẩm`
        );
      }

      const cart = await CartService.updateQuantity(id, quantity, userId);

      res.status(200).json({
        success: true,
        data: { cart }
      });

    } catch (error) {
      next(error);
    }
  }
};

module.exports = CartController;
```

---

## Best Practices

### ✅ DO (Nên làm)
- Luôn sử dụng `createError()` để tạo errors
- Throw errors trong try/catch blocks
- Pass errors to `next(error)` trong Express
- Sử dụng appropriate error types
- Thêm details khi cần thiết
- Log errors trong production

### ❌ DON'T (Không nên)
- Không return error trực tiếp từ controller
- Không hardcode status codes
- Không tạo error objects manually
- Không expose sensitive info trong error messages
- Không bỏ qua error handling

---

## Response Format Examples

### Success Response
```json
{
  "success": true,
  "data": {
    "user": { ... }
  },
  "meta": {
    "timestamp": "2026-02-24T10:30:00Z",
    "requestId": "req_1234567890"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Sản phẩm không tồn tại",
    "timestamp": "2026-02-24T10:30:00Z",
    "path": "/api/v1/products/ao-thun-trang",
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
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Mật khẩu phải có ít nhất 6 ký tự"
      }
    ],
    "timestamp": "2026-02-24T10:30:00Z",
    "path": "/api/v1/auth/register",
    "requestId": "req_1234567890"
  }
}
```

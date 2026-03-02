/**
 * Global Error Handler Middleware
 * Xử lý tất cả errors và format response theo chuẩn API
 */

const { AppError, formatErrorResponse } = require('../constants/errors');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Helper function để tạo error response
 */
const createErrorResponse = (code, message, statusCode, details = null) => {
  const error = new AppError(message, statusCode, code, details);
  return { error, statusCode };
};

/**
 * Global Error Handler
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Generate hoặc lấy request ID
  const requestId = req.id || req.headers['x-request-id'] || generateRequestId();
  
  // Log error details (trong production nên dùng logger như Winston)
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || null,
    error: {
      name: err.name,
      message: err.message,
      code: err.errorCode || 'UNKNOWN_ERROR',
      statusCode: err.statusCode || 500,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    }
  };

  console.error('Error occurred:', JSON.stringify(errorLog, null, 2));

  let processedError = err;
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Xử lý AppError (Operational errors) - sử dụng trực tiếp
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  }
  // Xử lý JWT errors - convert sang AppError
  else if (err.name === 'JsonWebTokenError') {
    const result = createErrorResponse(
      'TOKEN_INVALID',
      'Token không hợp lệ',
      HTTP_STATUS.UNAUTHORIZED
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }
  else if (err.name === 'TokenExpiredError') {
    const result = createErrorResponse(
      'TOKEN_EXPIRED',
      'Token đã hết hạn',
      HTTP_STATUS.UNAUTHORIZED
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }
  // Xử lý Validation errors
  else if (err.name === 'ValidationError') {
    const result = createErrorResponse(
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ',
      HTTP_STATUS.BAD_REQUEST,
      err.details || err.errors
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }
  // Xử lý MySQL/Database errors
  else if (err.code === 'ER_DUP_ENTRY') {
    const result = createErrorResponse(
      'DUPLICATE_ENTRY',
      'Dữ liệu đã tồn tại',
      HTTP_STATUS.CONFLICT
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }
  else if (err.code?.startsWith('ER_')) {
    const result = createErrorResponse(
      'DATABASE_ERROR',
      'Lỗi cơ sở dữ liệu',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }
  // Xử lý Multer errors (file upload)
  else if (err.name === 'MulterError') {
    let message = 'Lỗi upload file';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File quá lớn';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Quá nhiều files';
    }
    const result = createErrorResponse(
      'UPLOAD_ERROR',
      message,
      HTTP_STATUS.BAD_REQUEST
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }
  // Xử lý Unknown errors
  else {
    const message = process.env.NODE_ENV === 'production' 
      ? 'Đã xảy ra lỗi không xác định' 
      : err.message || 'Internal Server Error';
    
    const result = createErrorResponse(
      err.errorCode || 'INTERNAL_SERVER_ERROR',
      message,
      statusCode,
      process.env.NODE_ENV !== 'production' 
        ? { stack: err.stack?.split('\n').map(line => line.trim()) }
        : null
    );
    processedError = result.error;
    statusCode = result.statusCode;
  }

  // Sử dụng formatErrorResponse để format response chuẩn
  const errorResponse = formatErrorResponse(processedError, req.path, requestId);
  
  return res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 * Đặt middleware này trước errorHandler
 */
const notFoundHandler = (req, res, next) => {
  const requestId = req.id || generateRequestId();
  const notFoundError = new AppError(
    `Không tìm thấy route: ${req.method} ${req.path}`,
    HTTP_STATUS.NOT_FOUND,
    'NOT_FOUND'
  );
  
  const errorResponse = formatErrorResponse(notFoundError, req.path, requestId);
  return res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
};

/**
 * Async Error Wrapper
 * Wrapper cho async route handlers để catch errors tự động
 * 
 * Usage:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.getAll();
 *   res.json({ success: true, data: users });
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  generateRequestId
};

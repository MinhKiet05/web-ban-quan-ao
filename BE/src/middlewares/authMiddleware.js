const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/jwt");
const { findUserById } = require("../model/user.model");

/**
 * Middleware Xác thực JWT Token
 * Xác minh JWT token từ Cookie hoặc Authorization header (Bearer token format)
 * và gắn thông tin user vào req.user
 *
 * @param {Object} req - Đối tượng request của Express
 * @param {Object} res - Đối tượng response của Express
 * @param {Function} next - Hàm middleware tiếp theo của Express
 * @returns {Object} Phản hồi JSON với thông báo lỗi nếu xác thực thất bại
 */
const authenticate = async (req, res, next) => {
  try {
    // Ưu tiên lấy token từ cookie, fallback sang Authorization header
    let token = req.cookies.token;

    // Nếu không có cookie, thử lấy từ Authorization header
    if (!token) {
      const authHeader = req.header("Authorization");
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      } else if (authHeader) {
        token = authHeader;
      }
    }

    // Kiểm tra token có tồn tại không
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Xác minh token
    const decoded = jwt.verify(token, jwtSecret);

    // Gắn thông tin user từ token vào request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // Chuyển sang middleware hoặc route handler tiếp theo
    next();
  } catch (error) {
    // Xử lý các loại lỗi JWT khác nhau
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

/**
 * Middleware Xác thực với thông tin User đầy đủ từ DB
 *
 * @param {Object} req - Đối tượng request của Express
 * @param {Object} res - Đối tượng response của Express
 * @param {Function} next - Hàm middleware tiếp theo
 */
const authenticateWithUserInfo = async (req, res, next) => {
  try {
    // Ưu tiên lấy token từ cookie, fallback sang Authorization header
    let token = req.cookies.token;

    // Nếu không có cookie, thử lấy từ Authorization header
    if (!token) {
      const authHeader = req.header("Authorization");
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      } else if (authHeader) {
        token = authHeader;
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Xác minh token
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.userId || decoded.id;

    // Lấy thông tin user từ database
    const user = await findUserById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // Kiểm tra user có bị block không
    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked.",
      });
    }

    // Gắn thông tin user đầy đủ vào request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

/**
 * Middleware kiểm tra quyền theo role
 * Sử dụng sau authenticate middleware
 *
 * @param {...string} allowedRoles - Các role được phép truy cập
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/admin', authenticate, authorize('admin', 'super_admin'), adminController);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User not authenticated.",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
};

/**
 * Middleware cho optional authentication
 * Không bắt buộc phải có token, nhưng nếu có sẽ xác thực
 * Hữu ích cho các route public nhưng có thêm feature khi đăng nhập
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Ưu tiên lấy token từ cookie, fallback sang Authorization header
    let token = req.cookies.token;

    // Nếu không có cookie, thử lấy từ Authorization header
    if (!token) {
      const authHeader = req.header("Authorization");
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      } else if (authHeader) {
        token = authHeader;
      }
    }

    if (token) {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // Token invalid, vẫn cho qua nhưng req.user = null
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  authenticateWithUserInfo,
  authorize,
  optionalAuth,
};

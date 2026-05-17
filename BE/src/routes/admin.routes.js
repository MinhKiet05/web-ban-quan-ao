const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const AdminController = require('../controller/admin.controller');

// Tất cả admin routes yêu cầu đăng nhập + role admin
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// GET  /api/admin/dashboard   — Thống kê tổng quan
router.get('/dashboard', AdminController.getDashboard);

// GET  /api/admin/orders       — Danh sách tất cả đơn hàng
router.get('/orders', AdminController.getOrders);

// GET  /api/admin/orders/:id   — Chi tiết đơn hàng
router.get('/orders/:id', AdminController.getOrderDetail);

// PATCH /api/admin/orders/:id/status — Cập nhật trạng thái
router.patch('/orders/:id/status', AdminController.updateStatus);

module.exports = router;

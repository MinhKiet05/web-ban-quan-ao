/**
 * User Routes
 * @description Định nghĩa các routes cho user profile management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const userController = require('../controller/user.controller');

// Routes cho user hiện tại (từ token)
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);

// Routes cũ (legacy)
router.get('/get-profile/:id', authenticate, userController.getProfile);
router.put('/update-profile', authenticate, userController.updateProfile);

module.exports = router;
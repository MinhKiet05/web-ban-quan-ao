/**
 * User Routes
 * @description Định nghĩa các routes cho user profile management
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { upload, processImageMiddleware } = require('../middlewares/uploadMiddleware');
const multerErrorHandler = require('../middlewares/multerErrorHandler');
const userController = require('../controller/user.controller');

// Routes cho user hiện tại (từ token)
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);
router.post('/avatar', authenticate, upload.single('avatar'), multerErrorHandler, processImageMiddleware, userController.uploadAvatar);

// Routes cũ (legacy)
router.get('/get-profile/:id', authenticate, userController.getProfile);
router.put('/update-profile', authenticate, userController.updateProfile);

module.exports = router;
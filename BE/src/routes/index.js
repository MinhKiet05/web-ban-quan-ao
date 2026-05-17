/**
 * Main Routes Index
 * @description Tập hợp và mount tất cả routes của application
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const accountRoutes = require('./account.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
/**
 * Tập hợp tất cả routes của application
 * Base path: /api
 */

// Health check cho routes
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Routes are working',
        version: '1.0.0',
        availableEndpoints: {
            auth: '/api/auth',
            account: '/api/account',
            users: '/api/users',
            // products: '/api/products',  // TODO: Add later
            // orders: '/api/orders',      // TODO: Add later
            // categories: '/api/categories', // TODO: Add later
        }
    });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/users', userRoutes);

// TODO: Add more routes as needed
router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
// router.use('/vouchers', voucherRoutes);

module.exports = router;

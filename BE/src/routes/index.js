const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');

/**
 * Main Routes Index
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
            // products: '/api/products',  // TODO: Add later
            // orders: '/api/orders',      // TODO: Add later
            // users: '/api/users',        // TODO: Add later
            // categories: '/api/categories', // TODO: Add later
        }
    });
});

// Mount route modules
router.use('/auth', authRoutes);

// TODO: Add more routes as needed
// router.use('/products', productRoutes);
// router.use('/orders', orderRoutes);
// router.use('/users', userRoutes);
// router.use('/categories', categoryRoutes);
// router.use('/cart', cartRoutes);
// router.use('/vouchers', voucherRoutes);

module.exports = router;

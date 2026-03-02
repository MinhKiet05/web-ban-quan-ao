const express = require('express');
const app = express();
require('dotenv').config();
const corsOptions = require('./src/config/cors');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./src/routes/auth.routes');
const { errorHandler, notFoundHandler, generateRequestId } = require('./src/middlewares/errorHandler');

// Middleware để thêm request ID
app.use((req, res, next) => {
    req.id = generateRequestId();
    next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);

// 404 handler - phải đặt trước error handler
app.use(notFoundHandler);

// Global error handler - phải là middleware cuối cùng
app.use(errorHandler);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('Environment:', process.env.NODE_ENV || 'development');
});

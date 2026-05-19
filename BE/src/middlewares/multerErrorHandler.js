/**
 * Multer Error Handler Middleware
 * @description Middleware để xử lý lỗi multer (file upload errors)
 */

const multerErrorHandler = (err, req, res, next) => {
    if (err && err.name === 'MulterError') {
        // Multer error
        let message = 'Lỗi upload file';
        let statusCode = 400;

        if (err.code === 'FILE_TOO_LARGE' || err.code === 'LIMIT_FILE_SIZE') {
            message = 'Kích thước file vượt quá giới hạn (tối đa 5MB)';
        } else if (err.code === 'LIMIT_PART_COUNT') {
            message = 'Quá nhiều phần trong request';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Quá nhiều file';
        } else if (err.code === 'LIMIT_FIELD_KEY') {
            message = 'Tên field quá dài';
        } else if (err.code === 'LIMIT_FIELD_VALUE') {
            message = 'Giá trị field quá dài';
        } else if (err.code === 'LIMIT_FIELD_COUNT') {
            message = 'Quá nhiều field';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'File không mong đợi';
        }

        return res.status(statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: message
            },
            message: message
        });
    } else if (err && err.message) {
        // Custom error (from fileFilter)
        return res.status(400).json({
            success: false,
            error: {
                message: err.message
            },
            message: err.message
        });
    }

    next(err);
};

module.exports = multerErrorHandler;

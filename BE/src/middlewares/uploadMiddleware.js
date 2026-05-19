/**
 * Upload Middleware
 * @description Cấu hình multer để upload file (hình ảnh avatar, etc)
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình storage - lưu tạm vào memory trước khi xử lý với sharp
const storage = multer.memoryStorage();

// Filter file - chỉ cho phép hình ảnh
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file hình ảnh (JPG, PNG, WebP, GIF)'), false);
    }
};

// Tạo multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

/**
 * Middleware để xử lý hình ảnh với Sharp
 * - Compress hình ảnh
 * - Resize về kích thước phù hợp cho avatar
 * - Lưu file vào disk
 */
const processImageMiddleware = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        // Tạo tên file unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${req.user.id}_${uniqueSuffix}.webp`;
        const filepath = path.join(uploadsDir, filename);

        // Xử lý hình ảnh: resize, compress, convert sang webp
        await sharp(req.file.buffer)
            .resize(400, 400, {
                fit: 'cover', // Cắt để vừa với 400x400
                position: 'center'
            })
            .webp({ quality: 80 })
            .toFile(filepath);

        // Lưu thông tin vào request để controller sử dụng
        req.file.filename = filename;
        req.file.path = filepath;

        next();
    } catch (error) {
        console.error('Image processing error:', error);
        next(new Error('Lỗi xử lý hình ảnh: ' + error.message));
    }
};

module.exports = { upload, processImageMiddleware };


/**
 * Cloudinary Upload Utilities
 * @description Upload avatar images to Cloudinary and get secure URLs
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/**
 * Generate SHA-1 signature for Cloudinary upload
 * @param {Object} params - Upload parameters
 * @param {string} apiSecret - Cloudinary API secret
 * @returns {Promise<string>} - Generated signature
 */
const generateSignature = async (params, apiSecret) => {
  // Sort parameters alphabetically and create query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const stringToSign = sortedParams + apiSecret;
  
  // Use Web Crypto API to generate SHA-1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Upload avatar image to Cloudinary
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - Promise that resolves to the Cloudinary secure URL
 */
export const uploadAvatarToCloudinary = async (file) => {
  if (!file) {
    throw new Error('Vui lòng chọn hình ảnh');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Chỉ cho phép upload file hình ảnh (JPG, PNG, WebP, GIF)');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('Kích thước hình ảnh không được vượt quá 5MB');
  }

  try {
    // Prepare upload parameters
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadParams = {
      timestamp: timestamp,
      folder: 'web_ban_quan_ao/avatars',
      resource_type: 'auto'
    };

    // Generate signature
    const signature = await generateSignature(uploadParams, CLOUDINARY_API_SECRET);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('folder', 'web_ban_quan_ao/avatars');
    formData.append('signature', signature);
    formData.append('resource_type', 'auto');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Upload thất bại: ${data.error?.message || 'Lỗi không xác định'}`);
    }

    // Return secure URL
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Lỗi upload hình ảnh: ${error.message}`);
  }
};

/**
 * Get optimized Cloudinary URL with transformations
 * @param {string} publicId - Cloudinary public ID or full URL
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
export const getOptimizedCloudinaryUrl = (publicId, options = {}) => {
  const {
    width = 400,
    height = 400,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'face'
  } = options;

  // If it's already a full URL, return as is (Cloudinary already optimized)
  if (publicId?.includes('cloudinary.com')) {
    return publicId;
  }

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_${crop},g_${gravity},q_${quality},f_${format}/${publicId}`;
};

/**
 * Delete image from Cloudinary (if needed)
 * Note: Deletion requires unsigned delete endpoint or admin API
 * For now, we'll just log a warning
 * @param {string} publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId) => {
  console.warn('Cloudinary deletion not implemented. Manual cleanup may be needed for:', publicId);
  // In production, implement server-side deletion using Cloudinary Admin API
};

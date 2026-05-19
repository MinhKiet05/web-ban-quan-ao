/**
 * Cloudinary Upload Utilities
 * @description Upload avatar images to Cloudinary and get secure URLs
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const SIGNATURE_API_URL = import.meta.env.VITE_API_URL || 'https://web-ban-quan-ao-9s0d.onrender.com/api';
const BASE_URL = import.meta.env.VITE_API_URL || 'https://web-ban-quan-ao-9s0d.onrender.com/api';

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
    // Get signature from backend (safe method)
    const token = localStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Vui lòng đăng nhập lại');
    }

    // Try local backend first for signature
    let signatureResponse = await fetch(`${SIGNATURE_API_URL}/users/avatar/signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).catch(err => null);

    const signatureData = signatureResponse ? await signatureResponse.json() : null;
    
    // If local backend fails, try production backend (if it has the endpoint)
    if (!signatureResponse?.ok && BASE_URL !== SIGNATURE_API_URL) {
      console.warn('Local backend unavailable, trying production...');
      signatureResponse = await fetch(`${BASE_URL}/users/avatar/signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }

    if (!signatureResponse?.ok) {
      const errorData = signatureData || (signatureResponse ? await signatureResponse.json() : {});
      console.error('Signature API error:', {
        status: signatureResponse?.status,
        data: errorData
      });
      throw new Error(errorData?.error?.message || `Không thể lấy signature upload (${signatureResponse?.status || 'Network error'})`);
    }

    const finalData = signatureData || await signatureResponse.json();
    
    if (!finalData.success || !finalData.data) {
      console.error('Invalid signature response:', finalData);
      throw new Error('Dữ liệu signature không hợp lệ');
    }

    const { signature, timestamp, folder } = finalData.data;

    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
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

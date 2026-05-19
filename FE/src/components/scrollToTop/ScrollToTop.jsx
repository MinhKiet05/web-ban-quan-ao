import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * 
 * Tự động cuộn lên đầu trang mỗi khi URL thay đổi.
 * Component này PHẢI được đặt bên trong <Router> để sử dụng useLocation().
 * 
 * Cách hoạt động:
 * 1. Lắng nghe thay đổi của pathname thông qua useLocation()
 * 2. Mỗi khi pathname thay đổi, gọi window.scrollTo(0, 0)
 * 3. Behavior: 'smooth' để tạo hiệu ứng cuộn mượt
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
    });
  }, [pathname]);

  return null; // Component này không render gì, chỉ xử lý side effect
}

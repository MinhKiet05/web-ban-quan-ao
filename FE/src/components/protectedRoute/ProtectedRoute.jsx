/**
 * Protected Route Component
 * - Chỉ cho phép user đã login truy cập
 * - Redirect to /login nếu chưa login
 * - Hiển thị loading state khi auth đang restore
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Đang load auth state - hiển thị loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Chưa login - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Đã login - render children
  return children;
}

export default ProtectedRoute;

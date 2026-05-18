import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(
        () => localStorage.getItem('accessToken')
    );
    const [loading, setLoading] = useState(true); // Khởi tạo là true để chờ restore
    const [error, setError] = useState(null);

    /**
     * Restore user từ token khi app mount (F5 refresh)
     * - Kiểm tra token trong localStorage
     * - Gọi /auth/me để verify token và lấy user info
     * - Nếu token hết hạn, interceptor sẽ tự refresh
     */
    useEffect(() => {
        const restoreAuth = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem('accessToken');
                
                if (!token) {
                    // Không có token - user chưa login
                    setUser(null);
                    setAccessToken(null);
                    setLoading(false);
                    return;
                }

                // Có token - verify bằng cách gọi /auth/me
                const result = await authService.getMe();
                
                if (result?.data?.user) {
                    setUser(result.data.user);
                    setAccessToken(token);
                    localStorage.setItem('user', JSON.stringify(result.data.user));
                }
            } catch (err) {
                console.error('Auth restore failed:', err);
                // Nếu verify fail - xóa token (token invalid/expired)
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                setUser(null);
                setAccessToken(null);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        restoreAuth();
    }, []); // Chỉ chạy 1 lần khi mount

    const login = async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.login(email, password);
            
            if (data?.data?.user && data?.token?.accessToken) {
                const userData = data.data.user;
                const token = data.token.accessToken;
                
                setUser(userData);
                setAccessToken(token);
                localStorage.setItem('accessToken', token);
                localStorage.setItem('user', JSON.stringify(userData));
                return data;
            }
            throw new Error('Invalid login response');
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email, password, fullName, phone) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.register(email, password, fullName, phone);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        setError(null);
        try {
            await authService.logout();
        } catch (e) {
            console.error('Logout API error:', e);
            // Vẫn logout locally ngay cả khi API fail
        }
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setLoading(false);
    };

    // Update user info (used after avatar upload, etc.)
    const updateUserInfo = (updatedUserData) => {
        const newUserData = { ...user, ...updatedUserData };
        setUser(newUserData);
        localStorage.setItem('user', JSON.stringify(newUserData));
    };

    const value = {
        user,
        accessToken,
        login,
        register,
        logout,
        loading,
        error,
        isAuthenticated: !!user && !!accessToken,
        updateUserInfo,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};


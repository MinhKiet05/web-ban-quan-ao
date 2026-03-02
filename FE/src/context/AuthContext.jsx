import { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(
        () => localStorage.getItem('accessToken')
    );
    const [loading, setLoading] = useState(false);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const data = await authService.login(email, password);
            setUser(data.data.user);
            setAccessToken(data.token.accessToken);
            localStorage.setItem('accessToken', data.token.accessToken);
            return data;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email, password, fullName, phone) => {
        setLoading(true);
        try {
            const data = await authService.register(email, password, fullName, phone);
            return data;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (e) {
            // ignore
        }
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('accessToken');
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

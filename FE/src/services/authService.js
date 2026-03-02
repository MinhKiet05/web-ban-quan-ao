const BASE_URL = 'http://localhost:3000/api';

export const authService = {
    login: async (email, password) => {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Nhận cookie refreshToken từ server
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'Đăng nhập thất bại');
        }

        return data;
    },

    register: async (email, password, fullName, phone) => {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password, fullName, phone }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'Đăng ký thất bại');
        }

        return data;
    },

    logout: async () => {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include',
        });
        return response.json();
    },

    refreshToken: async () => {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        });
        return response.json();
    }
};

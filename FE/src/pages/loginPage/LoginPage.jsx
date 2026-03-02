import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const { login, register, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await login(email, password);
                navigate('/');
            } else {
                await register(email, password, fullName, phone);
                setIsLogin(true);
                setError('');
                setEmail('');
                setPassword('');
                alert('Đăng ký thành công! Vui lòng đăng nhập.');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${isLogin ? styles.activeTab : ''}`}
                        onClick={() => { setIsLogin(true); setError(''); }}
                    >
                        Đăng nhập
                    </button>
                    <button
                        className={`${styles.tab} ${!isLogin ? styles.activeTab : ''}`}
                        onClick={() => { setIsLogin(false); setError(''); }}
                    >
                        Đăng ký
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className={styles.inputGroup}>
                                <label>Họ và tên</label>
                                <input
                                    type="text"
                                    placeholder="Nhập họ và tên"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Số điện thoại</label>
                                <input
                                    type="tel"
                                    placeholder="Nhập số điện thoại"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="Nhập email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Mật khẩu</label>
                        <input
                            type="password"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading
                            ? (isLogin ? 'Đang đăng nhập...' : 'Đang đăng ký...')
                            : (isLogin ? 'Đăng nhập' : 'Đăng ký')
                        }
                    </button>

                    {isLogin && (
                        <p className={styles.forgotPassword}>
                            <Link to="/forgot-password">Quên mật khẩu?</Link>
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}

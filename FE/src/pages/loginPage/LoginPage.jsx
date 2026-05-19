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
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    // Error states cho từng field
    const [errors, setErrors] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const { login, register, loading } = useAuth();
    const navigate = useNavigate();

    // Validation functions
    const validatePhone = (value) => {
        if (!value) return '';
        if (!/^\d{10}$/.test(value)) {
            return 'Số điện thoại phải có đúng 10 chữ số';
        }
        if (value[0] !== '0') {
            return 'Số điện thoại phải bắt đầu bằng số 0';
        }
        return '';
    };

    const validatePassword = (value) => {
        if (!value) return '';
        if (value.length < 8) {
            return 'Mật khẩu phải có ít nhất 8 ký tự';
        }
        if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
            return 'Mật khẩu phải bao gồm cả chữ và số';
        }
        return '';
    };

    const validateConfirmPassword = (pwd, confirmPwd) => {
        if (!confirmPwd) return '';
        if (pwd !== confirmPwd) {
            return 'Mật khẩu nhập lại không trùng khớp';
        }
        return '';
    };

    const validateEmail = (value) => {
        if (!value) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Email không hợp lệ';
        }
        return '';
    };

    // Handlers cho onBlur
    const handlePhoneBlur = () => {
        const phoneError = validatePhone(phone);
        setErrors(prev => ({ ...prev, phone: phoneError }));
    };

    const handlePasswordBlur = () => {
        const passwordError = validatePassword(password);
        setErrors(prev => ({ ...prev, password: passwordError }));
        // Check confirm password lại nếu đã nhập
        if (confirmPassword) {
            const confirmError = validateConfirmPassword(password, confirmPassword);
            setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
    };

    const handleConfirmPasswordBlur = () => {
        const confirmError = validateConfirmPassword(password, confirmPassword);
        setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    };

    const handleEmailBlur = () => {
        const emailError = validateEmail(email);
        setErrors(prev => ({ ...prev, email: emailError }));
    };

    const handleFullNameBlur = () => {
        if (!fullName.trim()) {
            setErrors(prev => ({ ...prev, fullName: 'Vui lòng nhập họ và tên' }));
        } else {
            setErrors(prev => ({ ...prev, fullName: '' }));
        }
    };

    // Validate toàn bộ form
    const validateForm = () => {
        let formErrors = { ...errors };

        if (isLogin) {
            // Validation cho login
            formErrors.email = validateEmail(email);
            if (!password) {
                formErrors.password = 'Vui lòng nhập mật khẩu';
            }
        } else {
            // Validation cho register
            formErrors.fullName = fullName.trim() ? '' : 'Vui lòng nhập họ và tên';
            formErrors.email = validateEmail(email);
            formErrors.phone = validatePhone(phone);
            formErrors.password = validatePassword(password);
            formErrors.confirmPassword = validateConfirmPassword(password, confirmPassword);
        }

        setErrors(formErrors);

        return !Object.values(formErrors).some(err => err !== '');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate form
        if (!validateForm()) {
            return;
        }

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
                setFullName('');
                setPhone('');
                setConfirmPassword('');
                setErrors({
                    fullName: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: ''
                });
                alert('Đăng ký thành công! Vui lòng đăng nhập.');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleTabSwitch = (loginMode) => {
        setIsLogin(loginMode);
        setError('');
        setErrors({
            fullName: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: ''
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${isLogin ? styles.activeTab : ''}`}
                        onClick={() => handleTabSwitch(true)}
                    >
                        Đăng nhập
                    </button>
                    <button
                        className={`${styles.tab} ${!isLogin ? styles.activeTab : ''}`}
                        onClick={() => handleTabSwitch(false)}
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
                                    onBlur={handleFullNameBlur}
                                    required={!isLogin}
                                    className={errors.fullName ? styles.inputError : ''}
                                />
                                {errors.fullName && (
                                    <span className={styles.errorMessage}>{errors.fullName}</span>
                                )}
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Số điện thoại</label>
                                <input
                                    type="tel"
                                    placeholder="0123456789"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    onBlur={handlePhoneBlur}
                                    className={errors.phone ? styles.inputError : ''}
                                />
                                {errors.phone && (
                                    <span className={styles.errorMessage}>{errors.phone}</span>
                                )}
                            </div>
                        </>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="example@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={handleEmailBlur}
                            required
                            className={errors.email ? styles.inputError : ''}
                        />
                        {errors.email && (
                            <span className={styles.errorMessage}>{errors.email}</span>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Mật khẩu</label>
                        <input
                            type="password"
                            placeholder="Nhập mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={handlePasswordBlur}
                            required
                            className={errors.password ? styles.inputError : ''}
                        />
                        {errors.password && (
                            <span className={styles.errorMessage}>{errors.password}</span>
                        )}
                    </div>

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label>Nhập lại mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onBlur={handleConfirmPasswordBlur}
                                required={!isLogin}
                                className={errors.confirmPassword ? styles.inputError : ''}
                            />
                            {errors.confirmPassword && (
                                <span className={styles.errorMessage}>{errors.confirmPassword}</span>
                            )}
                        </div>
                    )}

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

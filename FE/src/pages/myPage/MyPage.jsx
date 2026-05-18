import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatarToCloudinary } from '../../utils/cloudinaryUtils';
import { getAvatarInitial } from '../../utils/avatarUtils';
import checkoutStyles from '../checkoutPage/CheckoutPage.module.css';
import styles from './MyPage.module.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-ban-quan-ao-9s0d.onrender.com/api';

const COUNTRIES = [
    'Vietnam', 'United States', 'United Kingdom', 'France', 'Germany',
    'Japan', 'South Korea', 'Australia', 'Canada', 'Singapore',
];

export default function MyPage() {
    const navigate = useNavigate();
    const { user, updateUserInfo } = useAuth();
    const fileInputRef = useRef(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [info, setInfo] = useState({
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        country: '',
        state: '',
        address: '',
        city: '',
        postalCode: '',
        avatarUrl: '',
    });

    // Fetch user info
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        fetchUserInfo();
    }, [user, navigate]);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            
            if (!token) {
                setErrorMsg('Vui lòng đăng nhập lại');
                navigate('/login');
                return;
            }

            const response = await fetch(`${BASE_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Không thể tải thông tin người dùng');
            }

            const data = await response.json();
            
            if (data.success && data.data) {
                const userData = data.data;
                setInfo({
                    email: userData.email || '',
                    phone: userData.phone || '',
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    country: userData.country || '',
                    state: userData.state || '',
                    address: userData.address || '',
                    city: userData.city || '',
                    postalCode: userData.postal_code || '',
                    avatarUrl: userData.avatar_url || '',
                });
            }
        } catch (err) {
            setErrorMsg(err.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const validateInfo = () => {
        const e = {};
        if (!info.email.trim()) e.email = 'Email là bắt buộc';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) e.email = 'Email không hợp lệ';
        if (!info.phone.trim()) e.phone = 'Số điện thoại là bắt buộc';
        else if (!/^\d{10}$/.test(info.phone)) e.phone = 'Số điện thoại phải có 10 chữ số';
        if (!info.firstName.trim()) e.firstName = 'Họ là bắt buộc';
        if (!info.lastName.trim()) e.lastName = 'Tên là bắt buộc';
        if (!info.country) e.country = 'Quốc gia là bắt buộc';
        if (!info.address.trim()) e.address = 'Địa chỉ là bắt buộc';
        if (!info.city.trim()) e.city = 'Thành phố là bắt buộc';
        return e;
    };

    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleAvatarClick = () => {
        if (isEditing && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            // Upload to Cloudinary
            const cloudinaryUrl = await uploadAvatarToCloudinary(file);
            
            // Save to database via API
            const token = localStorage.getItem('accessToken');
            const payload = {
                email: info.email,
                phone: info.phone,
                first_name: info.firstName,
                last_name: info.lastName,
                country: info.country,
                state: info.state,
                address: info.address,
                city: info.city,
                postal_code: info.postalCode,
                avatar_url: cloudinaryUrl,
            };

            const response = await fetch(`${BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error?.message || data.message || 'Lưu avatar thất bại');
            }

            setInfo(prev => ({ ...prev, avatarUrl: cloudinaryUrl }));
            setSuccessMsg('Avatar đã được cập nhật thành công');
            // Update user info in AuthContext so Header component reflects the change
            updateUserInfo({ 
                avatar_url: cloudinaryUrl,
                full_name: info.firstName && info.lastName ? `${info.firstName} ${info.lastName}` : ''
            });
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error('Avatar upload error:', err);
            setErrorMsg(err.message || 'Có lỗi xảy ra khi upload avatar');
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSave = async () => {
        const e = validateInfo();
        if (Object.keys(e).length > 0) {
            setErrors(e);
            return;
        }

        setErrors({});
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const token = localStorage.getItem('accessToken');
            
            const payload = {
                email: info.email,
                phone: info.phone,
                first_name: info.firstName,
                last_name: info.lastName,
                country: info.country,
                state: info.state,
                address: info.address,
                city: info.city,
                postal_code: info.postalCode,
                avatar_url: info.avatarUrl || null,
            };

            const response = await fetch(`${BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error?.message || data.message || 'Cập nhật thông tin thất bại');
            }

            setSuccessMsg('Cập nhật thông tin thành công');
            setIsEditing(false);
            // Update AuthContext with new user info
            updateUserInfo({
                full_name: `${info.firstName} ${info.lastName}`,
                firstName: info.firstName,
                lastName: info.lastName,
                avatar_url: info.avatarUrl
            });
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={checkoutStyles.page}>
                <div className={checkoutStyles.container}>
                    <div className={checkoutStyles.leftCol} style={{ textAlign: 'center' }}>
                        <p>Đang tải thông tin...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={checkoutStyles.page}>
            <div className={checkoutStyles.container}>
                <div className={checkoutStyles.leftCol}>

                    {/* Hidden File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />

                    {/* Title */}
                    <h1 className={checkoutStyles.title}>THÔNG TIN CÁ NHÂN</h1>

                    {/* Avatar Section */}
                    <div className={styles.avatarSection}>
                        <div 
                            className={`${styles.avatarContainer} ${isEditing ? styles.editable : ''}`}
                            onClick={handleAvatarClick}
                            title={isEditing ? 'Nhấp để đổi avatar' : ''}
                        >
                            {info.avatarUrl ? (
                                <img 
                                    src={info.avatarUrl}
                                    alt="User Avatar"
                                    className={styles.avatarImage}
                                />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    <span className={styles.avatarInitial}>
                                        {getAvatarInitial(user || info)}
                                    </span>
                                </div>
                            )}
                            {isEditing && (
                                <div className={styles.avatarOverlay}>
                                    <span className={styles.editIcon}>✎</span>
                                </div>
                            )}
                        </div>
                        {uploading && (
                            <div className={styles.uploadingText}>Đang upload...</div>
                        )}
                    </div>

                    {/* Success Message */}
                    {successMsg && (
                        <div className={styles.successMsg}>{successMsg}</div>
                    )}

                    {/* Error Message */}
                    {errorMsg && (
                        <div className={checkoutStyles.apiError}>{errorMsg}</div>
                    )}

                    {/* Form Section */}
                    <div className={checkoutStyles.formSection}>
                        <h3 className={checkoutStyles.sectionTitle}>CONTACT INFO</h3>
                        <div className={checkoutStyles.fieldGroup}>
                            <input
                                className={`${checkoutStyles.input} ${errors.email ? checkoutStyles.inputError : ''}`}
                                type="email"
                                name="email"
                                placeholder="Email"
                                value={info.email}
                                disabled={true}
                            />
                            {errors.email && <span className={checkoutStyles.errorMsg}>{errors.email}</span>}
                        </div>
                        <div className={checkoutStyles.fieldGroup}>
                            <input
                                className={`${checkoutStyles.input} ${errors.phone ? checkoutStyles.inputError : ''}`}
                                type="tel"
                                name="phone"
                                placeholder="Phone"
                                value={info.phone}
                                onChange={handleInfoChange}
                                disabled={!isEditing}
                            />
                            {errors.phone && <span className={checkoutStyles.errorMsg}>{errors.phone}</span>}
                        </div>

                        <h3 className={`${checkoutStyles.sectionTitle} ${checkoutStyles.sectionTitleSpaced}`}>SHIPPING ADDRESS</h3>
                        <div className={checkoutStyles.row2}>
                            <div className={checkoutStyles.fieldGroup}>
                                <input
                                    className={`${checkoutStyles.input} ${errors.firstName ? checkoutStyles.inputError : ''}`}
                                    type="text"
                                    name="firstName"
                                    placeholder="First Name"
                                    value={info.firstName}
                                    onChange={handleInfoChange}
                                    disabled={!isEditing}
                                />
                                {errors.firstName && <span className={checkoutStyles.errorMsg}>{errors.firstName}</span>}
                            </div>
                            <div className={checkoutStyles.fieldGroup}>
                                <input
                                    className={`${checkoutStyles.input} ${errors.lastName ? checkoutStyles.inputError : ''}`}
                                    type="text"
                                    name="lastName"
                                    placeholder="Last Name"
                                    value={info.lastName}
                                    onChange={handleInfoChange}
                                    disabled={!isEditing}
                                />
                                {errors.lastName && <span className={checkoutStyles.errorMsg}>{errors.lastName}</span>}
                            </div>
                        </div>
                        <div className={checkoutStyles.fieldGroup}>
                            <select
                                className={`${checkoutStyles.input} ${checkoutStyles.select} ${errors.country ? checkoutStyles.inputError : ''}`}
                                name="country"
                                value={info.country}
                                onChange={handleInfoChange}
                                disabled={!isEditing}
                            >
                                <option value="">Country</option>
                                {COUNTRIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {errors.country && <span className={checkoutStyles.errorMsg}>{errors.country}</span>}
                        </div>
                        <div className={checkoutStyles.fieldGroup}>
                            <input
                                className={checkoutStyles.input}
                                type="text"
                                name="state"
                                placeholder="State / Region"
                                value={info.state}
                                onChange={handleInfoChange}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className={checkoutStyles.fieldGroup}>
                            <input
                                className={`${checkoutStyles.input} ${errors.address ? checkoutStyles.inputError : ''}`}
                                type="text"
                                name="address"
                                placeholder="Address"
                                value={info.address}
                                onChange={handleInfoChange}
                                disabled={!isEditing}
                            />
                            {errors.address && <span className={checkoutStyles.errorMsg}>{errors.address}</span>}
                        </div>
                        <div className={checkoutStyles.row2}>
                            <div className={checkoutStyles.fieldGroup}>
                                <input
                                    className={`${checkoutStyles.input} ${errors.city ? checkoutStyles.inputError : ''}`}
                                    type="text"
                                    name="city"
                                    placeholder="City"
                                    value={info.city}
                                    onChange={handleInfoChange}
                                    disabled={!isEditing}
                                />
                                {errors.city && <span className={checkoutStyles.errorMsg}>{errors.city}</span>}
                            </div>
                            <div className={checkoutStyles.fieldGroup}>
                                <input
                                    className={checkoutStyles.input}
                                    type="text"
                                    name="postalCode"
                                    placeholder="Postal Code"
                                    value={info.postalCode}
                                    onChange={handleInfoChange}
                                    disabled={!isEditing}
                                />
                            </div>
                        </div>

                        {/* Edit/Save Button */}
                        <button 
                            className={checkoutStyles.actionBtn}
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                            disabled={saving}
                        >
                            {saving ? 'Đang lưu...' : isEditing ? 'Lưu' : 'Chỉnh sửa'}
                            {!isEditing && <span className={checkoutStyles.btnArrow}>→</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

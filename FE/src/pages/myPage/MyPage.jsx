import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatarToCloudinary } from '../../utils/cloudinaryUtils';
import { getAvatarInitial } from '../../utils/avatarUtils';
import checkoutStyles from '../checkoutPage/CheckoutPage.module.css';
import styles from './MyPage.module.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://web-ban-quan-ao-9s0d.onrender.com/api';

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
        fullName: '',
        phone: '',
        avatarUrl: '',
        dateOfBirth: '',
        gender: '',
    });

    const [displayInfo, setDisplayInfo] = useState({
        email: '',
        tier: '',
        loyaltyPoints: 0,
        createdAt: '',
    });

    // Initialize data from AuthContext
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        // Map user data từ AuthContext directly
        setInfo({
            fullName: user.fullName || '',
            phone: user.phone || '',
            avatarUrl: user.avatar_url || '',
            dateOfBirth: user.dateOfBirth || '',
            gender: user.gender || '',
        });

        setDisplayInfo({
            email: user.email || '',
            tier: user.tier || '',
            loyaltyPoints: user.loyaltyPoints || 0,
            createdAt: user.created_at || '',
        });

        setLoading(false);
    }, [user, navigate]);

    const validateInfo = () => {
        const e = {};
        if (!info.fullName.trim()) e.fullName = 'Họ tên là bắt buộc';
        if (!info.phone.trim()) e.phone = 'Số điện thoại là bắt buộc';
        else if (!/^\d{10}$/.test(info.phone)) e.phone = 'Số điện thoại phải có 10 chữ số';
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
            
            // Update avatar in local state only (preview)
            setInfo(prev => ({ ...prev, avatarUrl: cloudinaryUrl }));
            setSuccessMsg('Avatar đã được upload. Nhấn "Lưu" để lưu vào tài khoản.');
            
            // Do NOT update header here - only update after clicking Save
            setTimeout(() => setSuccessMsg(''), 4000);
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
                full_name: info.fullName,
                phone: info.phone,
                avatar_url: info.avatarUrl || null,
                date_of_birth: info.dateOfBirth || null,
                gender: info.gender || null,
            };

            console.log('Sending payload:', payload);

            const response = await fetch(`${BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log('Save response:', { status: response.status, data });
            console.log('Full error data:', JSON.stringify(data, null, 2));

            if (!response.ok || !data.success) {
                const errorMsg = data.error?.details || data.error?.message || data.message || data.error || 'Cập nhật thông tin thất bại';
                throw new Error(errorMsg);
            }

            setSuccessMsg('Cập nhật thông tin thành công');
            setIsEditing(false);
            
            updateUserInfo({
                full_name: info.fullName,
                avatar_url: info.avatarUrl
            });
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error('Update user error:', err);
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
                        <h3 className={checkoutStyles.sectionTitle}>THÔNG TIN CÁ NHÂN</h3>
                        
                        {/* Editable Fields */}
                        <div className={checkoutStyles.fieldGroup}>
                            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Tên</label>
                            <input
                                className={`${checkoutStyles.input} ${errors.fullName ? checkoutStyles.inputError : ''}`}
                                type="text"
                                name="fullName"
                                placeholder="Họ tên"
                                value={info.fullName}
                                onChange={handleInfoChange}
                                disabled={!isEditing}
                            />
                            {errors.fullName && <span className={checkoutStyles.errorMsg}>{errors.fullName}</span>}
                        </div>
                        <div className={checkoutStyles.fieldGroup}>
                            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Số điện thoại</label>
                            <input
                                className={`${checkoutStyles.input} ${errors.phone ? checkoutStyles.inputError : ''}`}
                                type="tel"
                                name="phone"
                                placeholder="0123456789"
                                value={info.phone}
                                onChange={handleInfoChange}
                                disabled={!isEditing}
                            />
                            {errors.phone && <span className={checkoutStyles.errorMsg}>{errors.phone}</span>}
                        </div>
                        <div className={checkoutStyles.row2}>
                            <div className={checkoutStyles.fieldGroup}>
                                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Ngày sinh</label>
                                <input
                                    className={checkoutStyles.input}
                                    type="date"
                                    name="dateOfBirth"
                                    value={info.dateOfBirth}
                                    onChange={handleInfoChange}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className={checkoutStyles.fieldGroup}>
                                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Giới tính</label>
                                <select
                                    className={checkoutStyles.input}
                                    name="gender"
                                    value={info.gender}
                                    onChange={handleInfoChange}
                                    disabled={!isEditing}
                                >
                                    <option value="">Chọn giới tính</option>
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                    <option value="other">Khác</option>
                                </select>
                            </div>
                        </div>

                        <h3 className={`${checkoutStyles.sectionTitle} ${checkoutStyles.sectionTitleSpaced}`}>THÔNG TIN TÀI KHOẢN</h3>
                        
                        {/* Read-only Fields */}
                        <div className={checkoutStyles.fieldGroup}>
                            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Email</label>
                            <input
                                className={checkoutStyles.input}
                                type="email"
                                value={displayInfo.email}
                                disabled={true}
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>
                        <div className={checkoutStyles.row2}>
                            <div className={checkoutStyles.fieldGroup}>
                                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Hạng thành viên</label>
                                <input
                                    className={checkoutStyles.input}
                                    type="text"
                                    value={displayInfo.tier || 'N/A'}
                                    disabled={true}
                                    style={{ backgroundColor: '#f5f5f5' }}
                                />
                            </div>
                            <div className={checkoutStyles.fieldGroup}>
                                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Điểm tích lũy</label>
                                <input
                                    className={checkoutStyles.input}
                                    type="text"
                                    value={displayInfo.loyaltyPoints || 0}
                                    disabled={true}
                                    style={{ backgroundColor: '#f5f5f5' }}
                                />
                            </div>
                        </div>
                        <div className={checkoutStyles.fieldGroup}>
                            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Tham gia từ</label>
                            <input
                                className={checkoutStyles.input}
                                type="text"
                                value={displayInfo.createdAt ? new Date(displayInfo.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                                disabled={true}
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
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
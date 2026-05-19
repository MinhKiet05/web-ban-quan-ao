import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatarToCloudinary } from '../../utils/cloudinaryUtils';
import { getAvatarInitial } from '../../utils/avatarUtils';
import checkoutStyles from '../checkoutPage/CheckoutPage.module.css';
import styles from './MyPage.module.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://web-ban-quan-ao-9s0d.onrender.com/api';

function userToInfo(u) {
    return {
        fullName:    u?.fullName    || '',
        phone:       u?.phone       || '',
        avatarUrl:   u?.avatarUrl   || '',
        dateOfBirth: u?.dateOfBirth || '',
        gender:      u?.gender      || '',
    };
}

export default function MyPage() {
    const navigate = useNavigate();
    const { user, updateUserInfo } = useAuth();
    const fileInputRef = useRef(null);
    const syncedRef   = useRef(!!user); // has info been set from user?
    const snapshotRef = useRef(null);   // pre-edit snapshot for cancel

    const [isEditing, setIsEditing] = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errors,    setErrors]    = useState({});
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg,   setErrorMsg]   = useState('');

    // Editable form state — initialized from user synchronously if available
    const [info, setInfo] = useState(() => userToInfo(user));

    // If user wasn't in localStorage on mount, sync once when it arrives
    useEffect(() => {
        if (user && !syncedRef.current) {
            syncedRef.current = true;
            setInfo(userToInfo(user));
        }
    }, [user]);

    // Redirect if not logged in
    useEffect(() => {
        if (!user && !localStorage.getItem('accessToken')) {
            navigate('/login');
        }
    }, [user, navigate]);

    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleEdit = () => {
        snapshotRef.current = { ...info };
        setIsEditing(true);
        setErrors({});
        setSuccessMsg('');
        setErrorMsg('');
    };

    const handleCancel = () => {
        if (snapshotRef.current) setInfo(snapshotRef.current);
        setIsEditing(false);
        setErrors({});
        setErrorMsg('');
    };

    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleAvatarClick = () => {
        if (isEditing) fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setErrorMsg('');
        try {
            const url = await uploadAvatarToCloudinary(file);
            setInfo(prev => ({ ...prev, avatarUrl: url }));
            setSuccessMsg('Ảnh đã upload. Nhấn "Lưu" để cập nhật.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setErrorMsg(err.message || 'Upload ảnh thất bại');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const validate = () => {
        const e = {};
        if (!info.fullName.trim()) e.fullName = 'Họ tên là bắt buộc';
        if (!info.phone.trim()) e.phone = 'Số điện thoại là bắt buộc';
        else if (!/^\d{10}$/.test(info.phone.trim())) e.phone = 'Số điện thoại phải có 10 chữ số';
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length > 0) { setErrors(e); return; }

        setErrors({});
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    full_name:    info.fullName,
                    phone:        info.phone,
                    avatar_url:   info.avatarUrl   || null,
                    date_of_birth: info.dateOfBirth || null,
                    gender:       info.gender       || null,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(
                    data.error?.details || data.error?.message || data.message || 'Cập nhật thất bại'
                );
            }

            updateUserInfo({
                fullName:    info.fullName,
                phone:       info.phone,
                avatarUrl:   info.avatarUrl,
                dateOfBirth: info.dateOfBirth,
                gender:      info.gender,
            });
            snapshotRef.current = { ...info };
            setIsEditing(false);
            setSuccessMsg('Cập nhật thông tin thành công');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    };

    // ── Loading state ────────────────────────────────────────────────────────────

    if (!user) {
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

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className={checkoutStyles.page}>
            <div className={checkoutStyles.container}>
                <div className={checkoutStyles.leftCol}>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />

                    <h1 className={checkoutStyles.title}>THÔNG TIN CÁ NHÂN</h1>

                    {/* Avatar */}
                    <div className={styles.avatarSection}>
                        <div
                            className={`${styles.avatarContainer} ${isEditing ? styles.editable : ''}`}
                            onClick={handleAvatarClick}
                            title={isEditing ? 'Nhấp để đổi ảnh đại diện' : ''}
                        >
                            {info.avatarUrl ? (
                                <img src={info.avatarUrl} alt="Avatar" className={styles.avatarImage} />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    <span className={styles.avatarInitial}>{getAvatarInitial(user)}</span>
                                </div>
                            )}
                            {isEditing && (
                                <div className={styles.avatarOverlay}>
                                    <span className={styles.editIcon}>✎</span>
                                </div>
                            )}
                        </div>
                        {uploading && <div className={styles.uploadingText}>Đang upload...</div>}
                    </div>

                    {successMsg && <div className={styles.successMsg}>{successMsg}</div>}
                    {errorMsg   && <div className={checkoutStyles.apiError}>{errorMsg}</div>}

                    <div className={checkoutStyles.formSection}>
                        <h3 className={checkoutStyles.sectionTitle}>THÔNG TIN CÁ NHÂN</h3>

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

                        <div className={checkoutStyles.fieldGroup}>
                            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Email</label>
                            <input
                                className={checkoutStyles.input}
                                type="email"
                                value={user.email || ''}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        <div className={checkoutStyles.row2}>
                            <div className={checkoutStyles.fieldGroup}>
                                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Hạng thành viên</label>
                                <input
                                    className={checkoutStyles.input}
                                    type="text"
                                    value={user.tier || 'N/A'}
                                    disabled
                                    style={{ backgroundColor: '#f5f5f5' }}
                                />
                            </div>
                            <div className={checkoutStyles.fieldGroup}>
                                <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Điểm tích lũy</label>
                                <input
                                    className={checkoutStyles.input}
                                    type="text"
                                    value={user.loyaltyPoints ?? 0}
                                    disabled
                                    style={{ backgroundColor: '#f5f5f5' }}
                                />
                            </div>
                        </div>

                        <div className={checkoutStyles.fieldGroup}>
                            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Tham gia từ</label>
                            <input
                                className={checkoutStyles.input}
                                type="text"
                                value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    className={checkoutStyles.actionBtn}
                                    onClick={handleSave}
                                    disabled={saving || uploading}
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu'}
                                </button>
                                <button
                                    className={checkoutStyles.actionBtn}
                                    onClick={handleCancel}
                                    disabled={saving}
                                    style={{ background: '#666' }}
                                >
                                    Huỷ
                                </button>
                            </div>
                        ) : (
                            <button className={checkoutStyles.actionBtn} onClick={handleEdit}>
                                Chỉnh sửa <span className={checkoutStyles.btnArrow}>→</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}



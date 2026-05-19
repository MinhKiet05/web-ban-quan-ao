import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatarToCloudinary } from '../../utils/cloudinaryUtils';
import { getAvatarInitial } from '../../utils/avatarUtils';
import styles from './MyPage.module.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://web-ban-quan-ao-9s0d.onrender.com/api';

/** Normalize any date value to YYYY-MM-DD for <input type="date"> */
function toDateInput(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function userToInfo(u) {
    return {
        fullName:    u?.fullName    || '',
        phone:       u?.phone       || '',
        avatarUrl:   u?.avatarUrl   || '',
        dateOfBirth: toDateInput(u?.dateOfBirth),
        gender:      u?.gender      || '',
    };
}

const TIER_LABELS = { normal: 'Thành viên', silver: 'Bạc', gold: 'Vàng', platinum: 'Bạch kim' };

export default function MyPage() {
    const navigate   = useNavigate();
    const { user, updateUserInfo } = useAuth();
    const fileInputRef = useRef(null);
    const syncedRef    = useRef(!!user);
    const snapshotRef  = useRef(null);

    const [isEditing,  setIsEditing]  = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [uploading,  setUploading]  = useState(false);
    const [errors,     setErrors]     = useState({});
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg,   setErrorMsg]   = useState('');

    const [info, setInfo] = useState(() => userToInfo(user));

    // Sync once when user arrives from async auth
    useEffect(() => {
        if (user && !syncedRef.current) {
            syncedRef.current = true;
            setInfo(userToInfo(user));
        }
    }, [user]);

    // Guard: redirect if not logged in
    useEffect(() => {
        if (!user && !localStorage.getItem('accessToken')) {
            navigate('/login');
        }
    }, [user, navigate]);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleAvatarClick = () => {
        if (isEditing) fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploading(true);
        setErrorMsg('');
        try {
            const url = await uploadAvatarToCloudinary(file);
            setInfo(prev => ({ ...prev, avatarUrl: url }));
            setSuccessMsg('Ảnh đã tải lên. Nhấn Lưu để cập nhật hồ sơ.');
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setErrorMsg(err.message || 'Upload ảnh thất bại');
        } finally {
            setUploading(false);
        }
    };

    const validate = () => {
        const e = {};
        if (!info.fullName.trim()) e.fullName = 'Họ tên là bắt buộc';
        if (info.phone.trim() && !/^\d{10}$/.test(info.phone.trim())) {
            e.phone = 'Số điện thoại phải có đúng 10 chữ số';
        }
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }

        setErrors({});
        setSaving(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    full_name:     info.fullName.trim(),
                    phone:         info.phone.trim()  || null,
                    avatar_url:    info.avatarUrl      || null,
                    date_of_birth: info.dateOfBirth    || null,
                    gender:        info.gender         || null,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                const msg =
                    (Array.isArray(data.error?.details)
                        ? data.error.details.map(d => d.message ?? d).join(', ')
                        : data.error?.details) ||
                    data.error?.message ||
                    data.message ||
                    `Cập nhật thất bại (${res.status})`;
                throw new Error(msg);
            }

            updateUserInfo({
                fullName:    info.fullName.trim(),
                phone:       info.phone.trim()  || null,
                avatarUrl:   info.avatarUrl      || null,
                dateOfBirth: info.dateOfBirth    || null,
                gender:      info.gender         || null,
            });
            snapshotRef.current = { ...info };
            setIsEditing(false);
            setSuccessMsg('Cập nhật thông tin thành công!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingWrap}>Đang tải thông tin...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {/* Header */}
                <div className={styles.cardHeader}>
                    <h1 className={styles.pageTitle}>HỒ SƠ CÁ NHÂN</h1>
                    {!isEditing && (
                        <button className={styles.editBtn} onClick={handleEdit}>
                            Chỉnh sửa
                        </button>
                    )}
                </div>

                {/* Toasts */}
                {successMsg && (
                    <div className={`${styles.toast} ${styles.toastSuccess}`}>
                        <span>✓</span> {successMsg}
                    </div>
                )}
                {errorMsg && (
                    <div className={`${styles.toast} ${styles.toastError}`}>
                        <span>✕</span> {errorMsg}
                    </div>
                )}

                <div className={styles.body}>
                    {/* Left: avatar + account stats */}
                    <div className={styles.avatarCol}>
                        <div
                            className={`${styles.avatarRing} ${isEditing ? styles.avatarRingEditable : ''}`}
                            onClick={handleAvatarClick}
                            title={isEditing ? 'Nhấp để đổi ảnh đại diện' : undefined}
                        >
                            {info.avatarUrl ? (
                                <img src={info.avatarUrl} alt="avatar" className={styles.avatarImg} />
                            ) : (
                                <div className={styles.avatarFallback}>
                                    <span>{getAvatarInitial(user)}</span>
                                </div>
                            )}
                            {isEditing && (
                                <div className={styles.avatarOverlay}>
                                    {uploading
                                        ? <span className={styles.spinIcon}>⟳</span>
                                        : <span className={styles.cameraIcon}>📷</span>}
                                </div>
                            )}
                        </div>

                        {uploading && <p className={styles.uploadNote}>Đang tải ảnh lên...</p>}

                        <p className={styles.userName}>{user.fullName || user.email}</p>
                        <p className={styles.userEmail}>{user.email}</p>

                        <div className={styles.statsList}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Hạng thành viên</span>
                                <span className={styles.statValue}>
                                    {TIER_LABELS[user.tier] || user.tier || 'Thành viên'}
                                </span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Điểm tích lũy</span>
                                <span className={styles.statValue}>{user.loyaltyPoints ?? 0}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Tham gia từ</span>
                                <span className={styles.statValue}>
                                    {user.createdAt
                                        ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                                        : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: editable form */}
                    <div className={styles.formCol}>
                        <h3 className={styles.sectionLabel}>THÔNG TIN CÁ NHÂN</h3>

                        <div className={styles.field}>
                            <label className={styles.label}>Họ tên</label>
                            <input
                                className={`${styles.input}${errors.fullName ? ' ' + styles.inputErr : ''}${!isEditing ? ' ' + styles.inputRO : ''}`}
                                type="text"
                                name="fullName"
                                placeholder="Nguyễn Văn A"
                                value={info.fullName}
                                onChange={handleChange}
                                disabled={!isEditing}
                            />
                            {errors.fullName && <span className={styles.errMsg}>{errors.fullName}</span>}
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Số điện thoại</label>
                            <input
                                className={`${styles.input}${errors.phone ? ' ' + styles.inputErr : ''}${!isEditing ? ' ' + styles.inputRO : ''}`}
                                type="tel"
                                name="phone"
                                placeholder="0912345678"
                                value={info.phone}
                                onChange={handleChange}
                                disabled={!isEditing}
                            />
                            {errors.phone && <span className={styles.errMsg}>{errors.phone}</span>}
                        </div>

                        <div className={styles.row2}>
                            <div className={styles.field}>
                                <label className={styles.label}>Ngày sinh</label>
                                <input
                                    className={`${styles.input}${!isEditing ? ' ' + styles.inputRO : ''}`}
                                    type="date"
                                    name="dateOfBirth"
                                    value={info.dateOfBirth}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Giới tính</label>
                                <select
                                    className={`${styles.input} ${styles.select}${!isEditing ? ' ' + styles.inputRO : ''}`}
                                    name="gender"
                                    value={info.gender}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                >
                                    <option value="">Chọn giới tính</option>
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                    <option value="other">Khác</option>
                                </select>
                            </div>
                        </div>

                        <h3 className={`${styles.sectionLabel} ${styles.sectionLabelMt}`}>THÔNG TIN TÀI KHOẢN</h3>

                        <div className={styles.field}>
                            <label className={styles.label}>Email</label>
                            <input
                                className={`${styles.input} ${styles.inputRO}`}
                                type="email"
                                value={user.email || ''}
                                disabled
                            />
                        </div>

                        <div className={styles.row2}>
                            <div className={styles.field}>
                                <label className={styles.label}>Hạng thành viên</label>
                                <input
                                    className={`${styles.input} ${styles.inputRO}`}
                                    type="text"
                                    value={TIER_LABELS[user.tier] || user.tier || 'Thành viên'}
                                    disabled
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Điểm tích lũy</label>
                                <input
                                    className={`${styles.input} ${styles.inputRO}`}
                                    type="text"
                                    value={user.loyaltyPoints ?? 0}
                                    disabled
                                />
                            </div>
                        </div>

                        {isEditing && (
                            <div className={styles.actions}>
                                <button
                                    className={styles.saveBtn}
                                    onClick={handleSave}
                                    disabled={saving || uploading}
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                                <button
                                    className={styles.cancelBtn}
                                    onClick={handleCancel}
                                    disabled={saving}
                                >
                                    Huỷ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

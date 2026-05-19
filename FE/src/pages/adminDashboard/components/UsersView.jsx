import { useState, useEffect, useCallback } from 'react';
import styles from '../AdminDashboard.module.css';
import { BASE_URL, Toast } from './Shared.jsx';

const ROLE_COLOR = { super_admin: '#ef4444', admin: '#3b82f6', customer: '#888' };
const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', customer: 'Customer' };

export default function UsersView({ token }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [toast, setToast] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const fetchUsers = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ limit: 20, page });
        if (search) params.set('search', search);
        fetch(`${BASE_URL}/admin/users?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
            if (d.data) setUsers(d.data);
            if (d.pagination) setTotalPages(d.pagination.totalPages);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token, search, page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useEffect(() => { setPage(1); }, [search]);

    const handleChangeRole = async (user) => {
        const roles = ['customer', 'admin'];
        const next = roles[(roles.indexOf(user.role) + 1) % roles.length];
        if (!window.confirm(`Đổi role của ${user.full_name} thành "${next}"?`)) return;
        setProcessingId(user.id);
        try {
            const res = await fetch(`${BASE_URL}/admin/users/${user.id}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role: next }),
            });
            const d = await res.json();
            if (d.success) {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: d.data.role } : u));
                setToast({ msg: `Đã đổi role thành ${next}`, type: 'success' });
            } else {
                setToast({ msg: d.message || 'Lỗi đổi role', type: 'error' });
            }
        } catch {
            setToast({ msg: 'Lỗi kết nối', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleToggleBlock = async (user) => {
        const action = user.is_blocked ? 'mở khóa' : 'khóa';
        if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản ${user.full_name || user.email}?`)) return;
        setProcessingId(user.id);
        try {
            const res = await fetch(`${BASE_URL}/admin/users/${user.id}/block`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await res.json();
            if (d.success) {
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_blocked: d.data.is_blocked } : u));
                setToast({ msg: d.message, type: 'success' });
            } else {
                setToast({ msg: d.message || 'Lỗi', type: 'error' });
            }
        } catch {
            setToast({ msg: 'Lỗi kết nối', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div>
            {toast && <Toast {...toast} onDone={() => setToast(null)} />}

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div className={styles.searchBox}>
                    <input
                        className={styles.searchInput}
                        placeholder="Tìm tên, email, số điện thoại..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput); }}
                    />
                    <button className={styles.actionBtn} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => setSearch(searchInput)}>Tìm</button>
                </div>
                <button
                    className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    onClick={fetchUsers}
                    disabled={loading}
                    title="Tải lại danh sách người dùng"
                >
                    {loading ? '...' : '↻ Làm mới'}
                </button>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>Quản lý người dùng</div>
                </div>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Người dùng</th>
                                <th>Liên hệ</th>
                                <th>Vai trò</th>
                                <th>Đơn hàng</th>
                                <th>Tổng chi tiêu</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Đang tải...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Không tìm thấy người dùng</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id} style={{ opacity: u.is_blocked ? 0.6 : 1 }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {u.avatar_url
                                                ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e0e0e0' }} />
                                                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5f5f3', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#555' }}>{(u.full_name || u.email || '?')[0].toUpperCase()}</div>
                                            }
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{u.full_name || '—'}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#888' }}>#{u.id.slice(0, 8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.82rem' }}>{u.email || '—'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{u.phone || '—'}</div>
                                    </td>
                                    <td>
                                        <span className={styles.badge} style={{ '--badge-color': ROLE_COLOR[u.role] || '#888' }}>
                                            {ROLE_LABEL[u.role] || u.role}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{u.order_count ?? u.total_orders ?? 0}</td>
                                    <td className={styles.amount} style={{ fontSize: '0.82rem' }}>
                                        {u.total_spent > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(u.total_spent) : '—'}
                                    </td>
                                    <td>
                                        {u.is_blocked
                                            ? <span className={styles.badge} style={{ '--badge-color': '#ef4444' }}>Đã khóa</span>
                                            : <span className={styles.badge} style={{ '--badge-color': '#10b981' }}>Hoạt động</span>
                                        }
                                    </td>
                                    <td style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap' }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {u.role !== 'super_admin' && (
                                                <button
                                                    className={styles.actionBtnSecondary}
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                                    disabled={processingId === u.id}
                                                    onClick={() => handleChangeRole(u)}
                                                >
                                                    Đổi role
                                                </button>
                                            )}
                                            {u.role !== 'super_admin' && (
                                                <button
                                                    className={u.is_blocked ? styles.actionBtnSecondary : styles.actionBtnDanger}
                                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                                    disabled={processingId === u.id}
                                                    onClick={() => handleToggleBlock(u)}
                                                >
                                                    {u.is_blocked ? 'Mở khóa' : 'Khóa'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '1rem', borderTop: '1px solid #e0e0e0' }}>
                        <button className={styles.actionBtnSecondary} style={{ padding: '0.35rem 0.8rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>Trang {page} / {totalPages}</span>
                        <button className={styles.actionBtnSecondary} style={{ padding: '0.35rem 0.8rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Tiếp →</button>
                    </div>
                )}
            </div>
        </div>
    );
}


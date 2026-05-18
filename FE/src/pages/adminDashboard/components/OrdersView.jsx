import { useState, useEffect, useCallback } from 'react';
import styles from '../AdminDashboard.module.css';
import { BASE_URL, STATUS_CONFIG, StatusBadge, fmt, fmtDate, Toast } from './Shared.jsx';

const STATUS_TRANSITIONS = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['packing', 'cancelled'],
    packing:   ['shipped', 'cancelled'],
    shipped:   ['delivered'],
    delivered: ['completed', 'refunded'],
    completed: [],
    cancelled: [],
    refunded:  [],
};

function OrderDetailModal({ order, token, onClose, onStatusUpdated }) {
    const [updating, setUpdating] = useState(false);
    const [note, setNote] = useState('');
    const [toast, setToast] = useState(null);

    const nextStatuses = STATUS_TRANSITIONS[order.status] || [];

    const handleUpdateStatus = async (newStatus) => {
        setUpdating(true);
        try {
            const res = await fetch(`${BASE_URL}/admin/orders/${order.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus, note }),
            });
            const d = await res.json();
            if (d.success) {
                setToast({ msg: 'Cập nhật trạng thái thành công', type: 'success' });
                onStatusUpdated(order.id, newStatus);
                setTimeout(onClose, 1200);
            } else {
                setToast({ msg: d.message || 'Lỗi cập nhật', type: 'error' });
            }
        } catch {
            setToast({ msg: 'Lỗi kết nối', type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            {toast && <Toast {...toast} onDone={() => setToast(null)} />}
            <div className={styles.modal} style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>
                <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>
                    Chi tiết đơn hàng <span style={{ fontFamily: 'monospace', color: '#555' }}>#{order.order_code || order.id?.slice(0, 8)}</span>
                </h2>

                {/* Trạng thái + timeline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                    <StatusBadge status={order.status} />
                    {order.payment_method && (
                        <span className={styles.badge} style={{ '--badge-color': '#6366f1' }}>
                            {order.payment_method === 'cod' ? 'COD' : order.payment_method.toUpperCase()}
                        </span>
                    )}
                    {order.payment_status && (
                        <span className={styles.badge} style={{ '--badge-color': order.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>
                            {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Thông tin khách hàng */}
                    <div className={styles.section} style={{ margin: 0 }}>
                        <div className={styles.sectionHeader} style={{ padding: '0.75rem 1rem' }}>
                            <div className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Khách hàng</div>
                        </div>
                        <div style={{ padding: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontWeight: 700 }}>{order.shipping_name || order.user_name}</div>
                            <div style={{ color: '#555' }}>{order.shipping_phone || '—'}</div>
                            <div style={{ color: '#555' }}>{order.user_email || order.shipping_email || '—'}</div>
                            <div style={{ color: '#555', marginTop: 4 }}>
                                {[order.shipping_district, order.shipping_province].filter(Boolean).join(', ') || '—'}
                            </div>
                        </div>
                    </div>
                    {/* Thông tin đơn hàng */}
                    <div className={styles.section} style={{ margin: 0 }}>
                        <div className={styles.sectionHeader} style={{ padding: '0.75rem 1rem' }}>
                            <div className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Tóm tắt đơn</div>
                        </div>
                        <div style={{ padding: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#555' }}>Tạm tính</span><span>{fmt(order.subtotal)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#555' }}>Phí ship</span><span>{fmt(order.shipping_fee)}</span></div>
                            {order.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#555' }}>Giảm giá</span><span style={{ color: '#10b981' }}>-{fmt(order.discount_amount)}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid #e0e0e0', paddingTop: 6, marginTop: 2 }}><span>Tổng cộng</span><span>{fmt(order.total)}</span></div>
                        </div>
                    </div>
                </div>

                {/* Sản phẩm trong đơn */}
                {order.items && order.items.length > 0 && (
                    <div className={styles.section} style={{ marginBottom: '1.5rem' }}>
                        <div className={styles.sectionHeader} style={{ padding: '0.75rem 1rem' }}>
                            <div className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Sản phẩm ({order.items.length})</div>
                        </div>
                        <table className={styles.table} style={{ fontSize: '0.82rem' }}>
                            <thead>
                                <tr>
                                    <th>Tên sản phẩm</th>
                                    <th>Màu / Size</th>
                                    <th>Giá</th>
                                    <th>SL</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 600 }}>{item.product_name || item.snapshot_name || '—'}</td>
                                        <td style={{ color: '#555' }}>{[item.color, item.size].filter(Boolean).join(' / ') || '—'}</td>
                                        <td>{fmt(item.unit_price)}</td>
                                        <td>{item.quantity}</td>
                                        <td className={styles.amount}>{fmt(item.subtotal || item.unit_price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Ghi chú */}
                {order.customer_note && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700 }}>Ghi chú khách hàng: </span>{order.customer_note}
                    </div>
                )}

                {/* Cập nhật trạng thái */}
                {nextStatuses.length > 0 && (
                    <div className={styles.section} style={{ margin: 0 }}>
                        <div className={styles.sectionHeader} style={{ padding: '0.75rem 1rem' }}>
                            <div className={styles.sectionTitle} style={{ fontSize: '0.85rem' }}>Cập nhật trạng thái</div>
                        </div>
                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(order.status === 'cancelled' || order.status === 'delivered') && (
                                <div className={styles.formGroup} style={{ margin: 0 }}>
                                    <label className={styles.formLabel}>Ghi chú (lý do huỷ / hoàn tiền)</label>
                                    <input className={styles.formInput} value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập ghi chú..." />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {nextStatuses.map(s => (
                                    <button
                                        key={s}
                                        className={s === 'cancelled' || s === 'refunded' ? styles.actionBtnDanger : styles.actionBtn}
                                        disabled={updating}
                                        onClick={() => handleUpdateStatus(s)}
                                    >
                                        {STATUS_CONFIG[s]?.text || s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {nextStatuses.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#888', padding: '1rem', fontSize: '0.85rem' }}>
                        Đơn hàng đã ở trạng thái cuối cùng.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function OrdersView({ token }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchOrders = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ limit: 20, page });
        if (filter !== 'all') params.set('status', filter);
        if (search) params.set('search', search);
        fetch(`${BASE_URL}/admin/orders?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
            if (d.data) setOrders(d.data);
            if (d.pagination) setTotalPages(d.pagination.totalPages);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [token, filter, search, page]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { setPage(1); }, [filter, search]);

    const openDetail = async (order) => {
        setSelectedOrder(order);
        setDetailLoading(true);
        setDetailData(null);
        try {
            const res = await fetch(`${BASE_URL}/admin/orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } });
            const d = await res.json();
            if (d.data) setDetailData(d.data);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleStatusUpdated = (orderId, newStatus) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setToast({ msg: 'Đã cập nhật trạng thái', type: 'success' });
    };

    return (
        <div>
            {toast && <Toast {...toast} onDone={() => setToast(null)} />}

            {/* Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div className={styles.filterTabs} style={{ margin: 0 }}>
                    <button className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`} onClick={() => setFilter('all')}>Tất cả</button>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <button key={k} className={`${styles.filterTab} ${filter === k ? styles.filterTabActive : ''}`} onClick={() => setFilter(k)}>{v.text}</button>
                    ))}
                </div>
                <div className={styles.searchBox}>
                    <input
                        className={styles.searchInput}
                        placeholder="Tìm mã đơn, tên KH, email..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput); }}
                    />
                    <button className={styles.actionBtn} style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }} onClick={() => setSearch(searchInput)}>Tìm</button>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Ngày đặt</th>
                                <th>Tổng tiền</th>
                                <th>Thanh toán</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Đang tải...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Không có đơn hàng nào</td></tr>
                            ) : orders.map(o => (
                                <tr key={o.id}>
                                    <td><span style={{ fontFamily: 'monospace', background: '#f5f5f3', padding: '2px 6px', borderRadius: 3 }}>{o.order_code || o.id?.slice(0, 8)}</span></td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{o.user_name || 'Khách'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#555' }}>{o.user_email}</div>
                                    </td>
                                    <td style={{ color: '#555', whiteSpace: 'nowrap' }}>{fmtDate(o.created_at)}</td>
                                    <td className={styles.amount}>{fmt(o.total)}</td>
                                    <td>
                                        <span className={styles.badge} style={{ '--badge-color': o.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>
                                            {o.payment_method?.toUpperCase() || '—'}
                                        </span>
                                    </td>
                                    <td><StatusBadge status={o.status} /></td>
                                    <td>
                                        <button className={styles.actionBtn} onClick={() => openDetail(o)}>Chi tiết</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '1rem', borderTop: '1px solid #e0e0e0' }}>
                        <button className={styles.actionBtnSecondary} style={{ padding: '0.35rem 0.8rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
                        <span style={{ fontSize: '0.85rem', color: '#555' }}>Trang {page} / {totalPages}</span>
                        <button className={styles.actionBtnSecondary} style={{ padding: '0.35rem 0.8rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Tiếp →</button>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                detailLoading ? (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} style={{ textAlign: 'center', padding: '3rem' }}>
                            <div style={{ fontSize: '1.1rem', color: '#555' }}>Đang tải chi tiết...</div>
                        </div>
                    </div>
                ) : detailData ? (
                    <OrderDetailModal
                        order={detailData}
                        token={token}
                        onClose={() => { setSelectedOrder(null); setDetailData(null); }}
                        onStatusUpdated={handleStatusUpdated}
                    />
                ) : null
            )}
        </div>
    );
}


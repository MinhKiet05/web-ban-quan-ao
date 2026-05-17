import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './OrdersPage.module.css';

const BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api';

const STATUS_LABEL = {
    pending:    { text: 'Chờ xử lý',      color: '#f59e0b' },
    confirmed:  { text: 'Đã xác nhận',    color: '#3b82f6' },
    processing: { text: 'Đang xử lý',     color: '#8b5cf6' },
    shipping:   { text: 'Đang giao hàng', color: '#06b6d4' },
    delivered:  { text: 'Đã giao hàng',   color: '#10b981' },
    cancelled:  { text: 'Đã huỷ',         color: '#ef4444' },
};

function StatusBadge({ status }) {
    const s = STATUS_LABEL[status] || { text: status, color: '#888' };
    return (
        <span className={styles.badge} style={{ '--badge-color': s.color }}>
            {s.text}
        </span>
    );
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetail({ orderId, token, onClose }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelForm, setShowCancelForm] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || data.message || 'Lỗi tải đơn hàng');
                setOrder(data.data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [orderId, token]);

    const handleCancel = async () => {
        setCancelling(true);
        try {
            const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ reason: cancelReason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || data.message || 'Không thể huỷ đơn');
            setOrder(data.data);
            setShowCancelForm(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>

                {loading && <p className={styles.loadingText}>Đang tải...</p>}
                {error && <p className={styles.errorText}>{error}</p>}

                {order && (
                    <>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>Đơn hàng #{order.id}</h2>
                                <p className={styles.modalDate}>{formatDate(order.created_at)}</p>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>

                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Địa chỉ giao hàng</h3>
                            <p>{order.shipping_name} · {order.shipping_phone}</p>
                            <p>{order.shipping_street}, {order.shipping_ward}, {order.shipping_district}, {order.shipping_province}</p>
                        </div>

                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Sản phẩm</h3>
                            <div className={styles.itemList}>
                                {(order.items || []).map((item) => (
                                    <div key={item.id} className={styles.itemRow}>
                                        {item.image_url && (
                                            <img src={item.image_url} alt={item.product_name} className={styles.itemImg} />
                                        )}
                                        <div className={styles.itemInfo}>
                                            <p className={styles.itemName}>{item.product_name}</p>
                                            <p className={styles.itemMeta}>
                                                {item.size && `Size: ${item.size}`}
                                                {item.size && item.color && ' · '}
                                                {item.color && `Màu: ${item.color}`}
                                            </p>
                                        </div>
                                        <div className={styles.itemPrice}>
                                            <span>x{item.quantity}</span>
                                            <span>{formatCurrency(item.line_total)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.modalSection}>
                            <h3 className={styles.sectionTitle}>Tổng tiền</h3>
                            <div className={styles.summaryRow}>
                                <span>Tạm tính</span><span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Phí vận chuyển</span><span>{formatCurrency(order.shipping_fee)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className={styles.summaryRow}>
                                    <span>Giảm giá</span><span>-{formatCurrency(order.discount_amount)}</span>
                                </div>
                            )}
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <span>Tổng cộng</span><span>{formatCurrency(order.total)}</span>
                            </div>
                        </div>

                        {order.status === 'pending' && (
                            <div className={styles.cancelSection}>
                                {!showCancelForm ? (
                                    <button
                                        className={styles.cancelBtn}
                                        onClick={() => setShowCancelForm(true)}
                                    >
                                        Huỷ đơn hàng
                                    </button>
                                ) : (
                                    <div className={styles.cancelForm}>
                                        <textarea
                                            className={styles.cancelInput}
                                            placeholder="Lý do huỷ (không bắt buộc)"
                                            value={cancelReason}
                                            onChange={(e) => setCancelReason(e.target.value)}
                                            rows={2}
                                        />
                                        <div className={styles.cancelActions}>
                                            <button
                                                className={styles.cancelConfirmBtn}
                                                onClick={handleCancel}
                                                disabled={cancelling}
                                            >
                                                {cancelling ? 'Đang huỷ...' : 'Xác nhận huỷ'}
                                            </button>
                                            <button
                                                className={styles.cancelBackBtn}
                                                onClick={() => setShowCancelForm(false)}
                                            >
                                                Quay lại
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────
export default function OrdersPage() {
    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const LIMIT = 10;

    useEffect(() => {
        if (!accessToken) {
            navigate('/login');
            return;
        }
        fetchOrders(1);
    }, [accessToken]);

    const fetchOrders = async (pageNum) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(
                `${BASE_URL}/orders?page=${pageNum}&limit=${LIMIT}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    credentials: 'include',
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || data.message || 'Lỗi tải đơn hàng');

            const newOrders = data.data || [];
            setOrders(pageNum === 1 ? newOrders : (prev) => [...prev, ...newOrders]);
            setHasMore(newOrders.length === LIMIT);
            setPage(pageNum);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter((o) => o.status === filterStatus);

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.topBar}>
                    <button className={styles.backBtn} onClick={() => navigate(-1)}>
                        <span className={styles.backArrow}>←</span>
                        <span className={styles.backLine} />
                    </button>
                    <h1 className={styles.title}>Đơn hàng của tôi</h1>
                </div>

                {/* Filter tabs */}
                <div className={styles.filterTabs}>
                    {['all', 'pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'].map((s) => (
                        <button
                            key={s}
                            className={`${styles.filterTab} ${filterStatus === s ? styles.filterTabActive : ''}`}
                            onClick={() => setFilterStatus(s)}
                        >
                            {s === 'all' ? 'Tất cả' : (STATUS_LABEL[s]?.text || s)}
                        </button>
                    ))}
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                {!loading && filteredOrders.length === 0 && (
                    <div className={styles.empty}>
                        <p className={styles.emptyText}>Không có đơn hàng nào.</p>
                        <Link to="/products" className={styles.shopBtn}>Mua sắm ngay</Link>
                    </div>
                )}

                <div className={styles.orderList}>
                    {filteredOrders.map((order) => (
                        <div
                            key={order.id}
                            className={styles.orderCard}
                            onClick={() => setSelectedOrderId(order.id)}
                        >
                            <div className={styles.orderCardHeader}>
                                <span className={styles.orderId}>#{order.id}</span>
                                <StatusBadge status={order.status} />
                            </div>
                            <div className={styles.orderCardBody}>
                                <span className={styles.orderDate}>{formatDate(order.created_at)}</span>
                                <span className={styles.orderTotal}>{formatCurrency(order.total)}</span>
                            </div>
                            {order.shipping_name && (
                                <p className={styles.orderShipping}>
                                    Giao tới: {order.shipping_name} · {order.shipping_district}, {order.shipping_province}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {loading && <p className={styles.loadingText}>Đang tải...</p>}

                {!loading && hasMore && filteredOrders.length > 0 && (
                    <button
                        className={styles.loadMoreBtn}
                        onClick={() => fetchOrders(page + 1)}
                    >
                        Tải thêm
                    </button>
                )}
            </div>

            {selectedOrderId && (
                <OrderDetail
                    orderId={selectedOrderId}
                    token={accessToken}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
}

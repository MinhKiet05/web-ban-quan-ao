import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHourglassStart, faCheckCircle, faBoxOpen, faTruck, faGift, faCheck, 
    faTimesCircle, faUndo, faList, faMapMarkerAlt, faShoppingBag, faMoneyBillAlt, 
    faCreditCard, faInbox, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import styles from './OrdersPage.module.css';

const BASE_URL = 'https://web-ban-quan-ao-9s0d.onrender.com/api';

/* ── Config ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    pending:    { text: 'Chờ xử lý',      color: '#f59e0b', icon: faHourglassStart, step: 0 },
    confirmed:  { text: 'Đã xác nhận',    color: '#3b82f6', icon: faCheckCircle, step: 1 },
    packing:    { text: 'Đang đóng gói',  color: '#8b5cf6', icon: faBoxOpen, step: 2 },
    shipped:    { text: 'Đang giao hàng', color: '#06b6d4', icon: faTruck, step: 3 },
    delivered:  { text: 'Đã giao hàng',   color: '#10b981', icon: faGift, step: 4 },
    completed:  { text: 'Hoàn thành',     color: '#059669', icon: faCheck, step: 5 },
    cancelled:  { text: 'Đã huỷ',         color: '#ef4444', icon: faTimesCircle, step: -1 },
    refunded:   { text: 'Đã hoàn tiền',   color: '#f97316', icon: faUndo, step: -1 },
};

const STEPS = [
    { key: 'pending',   label: 'Chờ xử lý',   icon: faList },
    { key: 'confirmed', label: 'Xác nhận',    icon: faCheckCircle },
    { key: 'packing',   label: 'Đóng gói',    icon: faBoxOpen },
    { key: 'shipped',   label: 'Giao hàng',   icon: faTruck },
    { key: 'delivered', label: 'Hoàn thành', icon: faGift },
];

function fmt(v) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v ?? 0);
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
    const s = STATUS_CONFIG[status] || { text: status, color: '#888' };
    return (
        <span className={styles.badge} style={{ '--badge-color': s.color }}>
            {s.text}
        </span>
    );
}

/* ── Status Timeline ─────────────────────────────────────────── */
function StatusTimeline({ status }) {
    const isCancelled = status === 'cancelled';
    const currentStep = STATUS_CONFIG[status]?.step ?? 0;

    if (isCancelled) {
        return (
            <div className={styles.cancelledBanner}>
                <strong><FontAwesomeIcon icon={faTimesCircle} /> Đơn hàng đã bị huỷ</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
                    Đơn hàng này đã được huỷ và không thể tiếp tục xử lý.
                </p>
            </div>
        );
    }

    // width % of progress line: 0 steps done = 0%, 4 steps done = 100%
    const progressPct = currentStep === 0 ? 0 : (currentStep / (STEPS.length - 1)) * 100;

    return (
        <div style={{ position: 'relative', padding: '0.5rem 0 1rem' }}>
            <div className={styles.timeline}>
                {/* Background line */}
                <div
                    className={styles.timelineProgress}
                    style={{ width: `${progressPct}%` }}
                />
                {STEPS.map((step, idx) => {
                    const done   = idx < currentStep;
                    const active = idx === currentStep;
                    const cfg    = STATUS_CONFIG[step.key];
                    return (
                        <div key={step.key} className={styles.timelineStep}>
                            <div
                                className={`${styles.stepDot} ${done ? styles.stepDotDone : ''} ${active ? styles.stepDotActive : ''}`}
                                style={active ? { '--step-color': cfg.color } : {}}
                            >
                                {done ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={step.icon} />}
                            </div>
                            <span
                                className={`${styles.stepLabel} ${done ? styles.stepLabelDone : ''} ${active ? styles.stepLabelActive : ''}`}
                                style={active ? { '--step-color': cfg.color } : {}}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Order Detail Modal ──────────────────────────────────────── */
function OrderDetail({ orderId, token, onClose, onCancelled }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [showCancelForm, setShowCancelForm] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Lỗi tải đơn hàng');
                setOrder(data.data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [orderId, token]);

    const handleCancel = async () => {
        setCancelling(true);
        try {
            const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason: cancelReason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Không thể huỷ đơn');
            setOrder(data.data);
            setShowCancelForm(false);
            onCancelled?.(orderId);
        } catch (e) {
            setError(e.message);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose} id="order-modal-close">✕</button>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>
                        ⏳ Đang tải chi tiết đơn hàng...
                    </div>
                )}

                {error && <p className={styles.errorText}>{error}</p>}

                {order && (
                    <>
                        {/* Header */}
                        <div className={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div>
                                    <h2 className={styles.modalTitle}>Chi tiết đơn hàng</h2>
                                    <p className={styles.modalMeta}>
                                        {order.order_code && (
                                            <span className={styles.orderCode} style={{ marginRight: 8 }}>
                                                {order.order_code}
                                            </span>
                                        )}
                                        Đặt lúc {fmtDate(order.created_at)}
                                    </p>
                                </div>
                                <StatusBadge status={order.status} />
                            </div>
                        </div>

                        {/* ── Status Timeline ── */}
                        <StatusTimeline status={order.status} />

                        {/* Shipping info */}
                        <div className={styles.modalSection}>
                            <div className={styles.sectionTitle}><FontAwesomeIcon icon={faMapMarkerAlt} /> Địa chỉ giao hàng</div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoKey}>Người nhận</div>
                                    <div className={styles.infoVal}>{order.shipping_name}</div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoKey}>Số điện thoại</div>
                                    <div className={styles.infoVal}>{order.shipping_phone}</div>
                                </div>
                                <div className={styles.infoItem} style={{ gridColumn: '1/-1' }}>
                                    <div className={styles.infoKey}>Địa chỉ</div>
                                    <div className={styles.infoVal}>
                                        {[order.shipping_street, order.shipping_ward, order.shipping_district, order.shipping_province]
                                            .filter(Boolean).join(', ')}
                                    </div>
                                </div>
                                {order.payment_method && (
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoKey}>Phương thức thanh toán</div>
                                        <div className={styles.infoVal}>{order.payment_method.toUpperCase()}</div>
                                    </div>
                                )}
                                {order.payment_status && (
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoKey}>Trạng thái thanh toán</div>
                                        <div className={styles.infoVal} style={{ color: order.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>
                                            {order.payment_status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Products */}
                        <div className={styles.modalSection}>
                            <div className={styles.sectionTitle}>
                                <FontAwesomeIcon icon={faShoppingBag} /> Sản phẩm ({(order.items || []).length})
                            </div>
                            <div className={styles.itemList}>
                                {(order.items || []).map(item => (
                                    <div key={item.id} className={styles.itemRow}>
                                        {item.image_url
                                            ? <img src={item.image_url} alt={item.product_name} className={styles.itemImg} />
                                            : <div className={styles.itemImgPlaceholder}><FontAwesomeIcon icon={faShoppingBag} /></div>
                                        }
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemName}>{item.product_name}</div>
                                            <div className={styles.itemMeta}>
                                                {[item.size && `Size: ${item.size}`, item.color && `Màu: ${item.color}`]
                                                    .filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                        <div className={styles.itemPrice}>
                                            <span>x{item.quantity}</span>
                                            <span>{fmt(item.line_total)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className={styles.modalSection}>
                            <div className={styles.sectionTitle}><FontAwesomeIcon icon={faMoneyBillAlt} /> Tổng tiền</div>
                            <div className={styles.summaryRow}>
                                <span>Tạm tính</span><span>{fmt(order.subtotal)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Phí vận chuyển</span><span>{fmt(order.shipping_fee)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className={styles.summaryRow}>
                                    <span>Giảm giá</span>
                                    <span style={{ color: '#10b981' }}>-{fmt(order.discount_amount)}</span>
                                </div>
                            )}
                            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                                <span>Tổng cộng</span><span>{fmt(order.total)}</span>
                            </div>
                        </div>

                        {/* Cancel */}
                        {order.status === 'pending' && (
                            <div className={styles.cancelSection}>
                                {!showCancelForm ? (
                                    <button
                                        id="order-cancel-btn"
                                        className={styles.cancelBtn}
                                        onClick={() => setShowCancelForm(true)}
                                    >
                                        Huỷ đơn hàng
                                    </button>
                                ) : (
                                    <div className={styles.cancelForm}>
                                        <textarea
                                            className={styles.cancelInput}
                                            placeholder="Lý do huỷ (không bắt buộc)..."
                                            value={cancelReason}
                                            onChange={e => setCancelReason(e.target.value)}
                                            rows={2}
                                        />
                                        <div className={styles.cancelActions}>
                                            <button
                                                className={styles.cancelConfirmBtn}
                                                onClick={handleCancel}
                                                disabled={cancelling}
                                            >
                                                {cancelling ? '...' : 'Xác nhận huỷ'}
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

/* ── Main Orders Page ────────────────────────────────────────── */
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
        if (!accessToken) { navigate('/login'); return; }
        fetchOrders(1, true);
    }, [accessToken]);

    const fetchOrders = async (pageNum, reset = false) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(
                `${BASE_URL}/orders?page=${pageNum}&limit=${LIMIT}`,
                { headers: { Authorization: `Bearer ${accessToken}` }, credentials: 'include' }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi tải đơn hàng');
            const newOrders = data.data || [];
            setOrders(reset ? newOrders : prev => [...prev, ...newOrders]);
            setHasMore(newOrders.length === LIMIT);
            setPage(pageNum);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelled = (orderId) => {
        setOrders(prev =>
            prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
        );
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(o => o.status === filterStatus);

    const FILTER_TABS = ['all', 'pending', 'confirmed', 'packing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Top bar */}
                <div className={styles.topBar}>
                    <button
                        id="orders-back-btn"
                        className={styles.backBtn}
                        onClick={() => navigate(-1)}
                    >
                        <span className={styles.backArrow}><FontAwesomeIcon icon={faArrowLeft} /></span>
                        <span className={styles.backLine} />
                    </button>
                    <h1 className={styles.title}>ĐƠN HÀNG CỦA TÔI</h1>
                </div>

                {/* Filter tabs */}
                <div className={styles.filterTabs}>
                    {FILTER_TABS.map(s => (
                        <button
                            key={s}
                            id={`filter-tab-${s}`}
                            className={`${styles.filterTab} ${filterStatus === s ? styles.filterTabActive : ''}`}
                            onClick={() => setFilterStatus(s)}
                        >
                            {s === 'all' ? 'Tất cả' : STATUS_CONFIG[s]?.text}
                            {s !== 'all' && orders.filter(o => o.status === s).length > 0 && (
                                <span style={{
                                    marginLeft: 5,
                                    background: filterStatus === s ? 'rgba(255,255,255,0.25)' : '#e0e0e0',
                                    borderRadius: 999,
                                    padding: '0 5px',
                                    fontSize: '0.68rem',
                                    color: filterStatus === s ? '#fff' : '#555'
                                }}>
                                    {orders.filter(o => o.status === s).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                {/* Skeleton loading */}
                {loading && orders.length === 0 && [1, 2, 3].map(i => (
                    <div key={i} className={styles.skeletonCard}>
                        <div className={styles.skeleton} style={{ height: 14, width: '40%', marginBottom: 10 }} />
                        <div className={styles.skeleton} style={{ height: 20, width: '60%', marginBottom: 8 }} />
                        <div className={styles.skeleton} style={{ height: 12, width: '30%' }} />
                    </div>
                ))}

                {/* Empty state */}
                {!loading && filteredOrders.length === 0 && (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}><FontAwesomeIcon icon={faInbox} /></div>
                        <p className={styles.emptyText}>
                            {filterStatus === 'all'
                                ? 'Bạn chưa có đơn hàng nào.'
                                : `Không có đơn hàng "${STATUS_CONFIG[filterStatus]?.text}".`}
                        </p>
                        <Link to="/products" className={styles.shopBtn}>
                            Mua sắm ngay →
                        </Link>
                    </div>
                )}

                {/* Order list */}
                <div className={styles.orderList}>
                    {filteredOrders.map(order => {
                        const cfg = STATUS_CONFIG[order.status];
                        return (
                            <div
                                key={order.id}
                                id={`order-card-${order.id}`}
                                className={styles.orderCard}
                                style={{ '--status-color': cfg?.color || '#6366f1' }}
                                onClick={() => setSelectedOrderId(order.id)}
                            >
                                <div className={styles.orderCardHeader}>
                                    <span className={styles.orderCode}>
                                        {order.order_code || `#${order.id.slice(0, 8)}`}
                                    </span>
                                    <StatusBadge status={order.status} />
                                </div>
                                <div className={styles.orderCardBody}>
                                    <span className={styles.orderDate}>{fmtDate(order.created_at)}</span>
                                    <span className={styles.orderTotal}>{fmt(order.total)}</span>
                                </div>
                                <div className={styles.orderMeta}>
                                    {order.item_count != null && <span><FontAwesomeIcon icon={faShoppingBag} /> {order.item_count} sản phẩm</span>}
                                    {order.shipping_name && (
                                        <span><FontAwesomeIcon icon={faMapMarkerAlt} /> {order.shipping_district}, {order.shipping_province}</span>
                                    )}
                                    {order.payment_method && (
                                        <span><FontAwesomeIcon icon={faCreditCard} /> {order.payment_method.toUpperCase()}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Load more */}
                {!loading && hasMore && filteredOrders.length > 0 && (
                    <button
                        id="load-more-btn"
                        className={styles.loadMoreBtn}
                        onClick={() => fetchOrders(page + 1)}
                    >
                        Tải thêm
                    </button>
                )}

                {loading && orders.length > 0 && (
                    <p style={{ textAlign: 'center', color: '#555', padding: '1rem', fontSize: '0.85rem' }}>
                        ⏳ Đang tải...
                    </p>
                )}
            </div>

            {/* Detail modal */}
            {selectedOrderId && (
                <OrderDetail
                    orderId={selectedOrderId}
                    token={accessToken}
                    onClose={() => setSelectedOrderId(null)}
                    onCancelled={handleCancelled}
                />
            )}
        </div>
    );
}
